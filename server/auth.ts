// Auth module - provides password hashing, comparison, and authentication utilities
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, userSchools, schools, insertUserSchema, type User, type School } from "../shared/schema";
import { db, pool } from "./db";
import { eq, and } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

// Periodically clean up stale login attempt entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  for (const [ip, attempt] of loginAttempts) {
    if (now - attempt.lastAttempt > staleThreshold) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" };
  }
  return { valid: true, message: "" };
}

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function checkLoginAttempts(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) return { allowed: true };

  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    return { allowed: false, remainingTime: Math.ceil((attempt.lockedUntil - now) / 1000) };
  }

  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: now };

  if (now - attempt.lastAttempt > 15 * 60 * 1000) {
    attempt.count = 1;
  } else {
    attempt.count++;
  }

  attempt.lastAttempt = now;

  if (attempt.count >= 5) {
    attempt.lockedUntil = now + 15 * 60 * 1000;
  }

  loginAttempts.set(ip, attempt);
}

function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      name: string;
      role: string;
      email: string | null;
      phone: string | null;
      isSuperAdmin: boolean | null;
      createdAt: Date | null;
      activeSchoolId?: number;
      activeSchoolRole?: string;
      schools?: { id: number; name: string; code: string; role: string; isPrimary: boolean }[];
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    activeSchoolId?: number;
  }
}

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1);
}

async function getUserSchools(userId: number) {
  const result = await db
    .select({
      id: schools.id,
      name: schools.name,
      code: schools.code,
      role: userSchools.role,
      isPrimary: userSchools.isPrimary,
    })
    .from(userSchools)
    .innerJoin(schools, eq(userSchools.schoolId, schools.id))
    .where(and(eq(userSchools.userId, userId), eq(schools.isActive, true)));
  return result;
}

async function getUserWithSchools(user: any, activeSchoolId?: number) {
  const userSchoolsList = await getUserSchools(user.id);

  let selectedSchoolId = activeSchoolId;
  let activeSchool = userSchoolsList.find(s => s.id === selectedSchoolId);

  // If no selected/valid school in list
  if (!activeSchool && selectedSchoolId) {
    if (user.isSuperAdmin) {
      // Super Admin can access any active school
      const [school] = await db.select().from(schools).where(and(eq(schools.id, selectedSchoolId), eq(schools.isActive, true)));
      if (school) {
        // Mock a UserSchool object for the context
        activeSchool = {
          id: school.id,
          name: school.name,
          code: school.code,
          role: 'admin', // Super Admin is always admin
          isPrimary: false
        };
      }
    }
  }

  // Fallback if still no active school
  if (!activeSchool) {
    const primarySchool = userSchoolsList.find(s => s.isPrimary);
    selectedSchoolId = primarySchool?.id || userSchoolsList[0]?.id;
    activeSchool = userSchoolsList.find(s => s.id === selectedSchoolId);
  }

  // Ensure the active school is included in the list (crucial for Super Admin implicit access)
  const finalSchoolsList = [...userSchoolsList];
  if (activeSchool && !finalSchoolsList.some(s => s.id === activeSchool?.id)) {
    finalSchoolsList.push(activeSchool);
  }

  return {
    ...user,
    activeSchoolId: activeSchool?.id,
    activeSchoolRole: activeSchool?.role || user.role,
    schools: finalSchoolsList,
  };
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIP(req),
});

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    console.warn("WARNING: SESSION_SECRET not set. Sessions will not persist across restarts!");
  }

  const store = new PostgresSessionStore({
    pool,
    createTableIfMissing: true
  });

  const isProduction = process.env.NODE_ENV === "production";

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "strict" : "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/api", apiRateLimiter);

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, { id: user.id, activeSchoolId: user.activeSchoolId });
  });

  passport.deserializeUser(async (data: { id: number; activeSchoolId?: number }, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.id))
        .limit(1);

      if (!user) return done(null, null);

      const userWithSchools = await getUserWithSchools(user, data.activeSchoolId);
      done(null, userWithSchools);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", authRateLimiter, async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ message: error.toString() });
      }

      const passwordValidation = validatePassword(result.data.password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      const allUsers = await db.select().from(users);
      const isFirstUser = allUsers.length === 0;

      if (isFirstUser) {
        const setupKey = process.env.SETUP_KEY;
        const providedKey = req.body.setupKey;

        if (!setupKey) {
          return res.status(503).json({ message: "System not configured. Please set SETUP_KEY environment variable." });
        }

        if (providedKey !== setupKey) {
          return res.status(403).json({ message: "Invalid setup key. Contact system administrator." });
        }
      }

      if (!isFirstUser && !req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!isFirstUser && req.user?.activeSchoolRole !== "admin" && !req.user?.isSuperAdmin) {
        return res.status(403).json({ message: "Only admins can create new users" });
      }

      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(result.data.password);

      let assignedRole = "teacher";
      let assignedSuperAdmin = false;

      if (isFirstUser) {
        assignedRole = "admin";
        assignedSuperAdmin = true;
      } else {
        if (result.data.isSuperAdmin && req.user?.isSuperAdmin) {
          assignedSuperAdmin = true;
        }
        if (result.data.role === "admin" && (req.user?.activeSchoolRole === "admin" || req.user?.isSuperAdmin)) {
          assignedRole = "admin";
        } else if (result.data.role === "teacher") {
          assignedRole = "teacher";
        }
      }

      const [user] = await db
        .insert(users)
        .values({
          username: result.data.username,
          password: hashedPassword,
          name: result.data.name,
          role: assignedRole,
          email: result.data.email,
          phone: result.data.phone,
          isSuperAdmin: assignedSuperAdmin,
        })
        .returning();

      if (isFirstUser) {
        let [defaultSchool] = await db.select().from(schools).where(eq(schools.code, 'DEFAULT')).limit(1);

        if (!defaultSchool) {
          [defaultSchool] = await db.insert(schools).values({
            name: 'Default School',
            code: 'DEFAULT',
          }).returning();
        }

        await db.insert(userSchools).values({
          userId: user.id,
          schoolId: defaultSchool.id,
          role: 'admin',
          isPrimary: true,
        });
      } else if (req.user?.activeSchoolId) {
        await db.insert(userSchools).values({
          userId: user.id,
          schoolId: req.user.activeSchoolId,
          role: assignedRole,
          isPrimary: true,
        });
      }

      const { password, ...userWithoutPassword } = user;

      if (isFirstUser) {
        const userWithSchools = await getUserWithSchools(user);
        req.login(userWithSchools, (err) => {
          if (err) return next(err);
          res.status(201).json({ ...userWithoutPassword, schools: userWithSchools.schools });
        });
      } else {
        res.status(201).json(userWithoutPassword);
      }
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", authRateLimiter, (req, res, next) => {
    const clientIP = getClientIP(req);
    const lockoutCheck = checkLoginAttempts(clientIP);

    if (!lockoutCheck.allowed) {
      return res.status(429).json({
        message: `Account temporarily locked. Try again in ${lockoutCheck.remainingTime} seconds.`
      });
    }

    passport.authenticate("local", async (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        recordFailedLogin(clientIP);
        return res.status(401).json({ message: info?.message || "Login failed" });
      }

      clearLoginAttempts(clientIP);
      const userWithSchools = await getUserWithSchools(user);

      req.login(userWithSchools, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = userWithSchools;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  });

  app.post("/api/switch-school", requireAuth, async (req, res, next) => {
    try {
      const { schoolId } = req.body;

      if (!schoolId || typeof schoolId !== 'number') {
        return res.status(400).json({ message: "Valid schoolId is required" });
      }

      const userSchoolsList = await getUserSchools(req.user!.id);
      const canAccessSchool = userSchoolsList.some(s => s.id === schoolId) || req.user?.isSuperAdmin;

      if (!canAccessSchool) {
        return res.status(403).json({ message: "You don't have access to this school" });
      }

      const updatedUser = await getUserWithSchools(req.user!, schoolId);

      req.login(updatedUser, (err) => {
        if (err) return next(err);

        // Explicitly save session to ensure the new activeSchoolId persists
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return next(saveErr);
          }
          const { password, ...userWithoutPassword } = updatedUser;
          res.json(userWithoutPassword);
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/schools", requireAuth, async (req, res, next) => {
    try {
      if (req.user?.isSuperAdmin) {
        const allSchools = await db.select().from(schools).where(eq(schools.isActive, true));
        return res.json(allSchools);
      }

      const userSchoolsList = await getUserSchools(req.user!.id);
      const schoolIds = userSchoolsList.map(s => s.id);

      if (schoolIds.length === 0) {
        return res.json([]);
      }

      const schoolDetails = await db.select().from(schools).where(eq(schools.isActive, true));
      const filteredSchools = schoolDetails.filter(s => schoolIds.includes(s.id));

      res.json(filteredSchools);
    } catch (err) {
      next(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user?.activeSchoolRole !== "admin" && !req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const role = req.user?.activeSchoolRole;
  if (role !== "admin" && role !== "teacher" && role !== "School Nurse" && role !== "Medical Officer" && !req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Staff access required" });
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

export function getActiveSchoolId(req: Request): number | null {
  return req.user?.activeSchoolId || null;
}

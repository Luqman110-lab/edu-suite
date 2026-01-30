import { promisify } from "util";
import { scrypt, randomBytes } from "crypto";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from "../shared/schema.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
}

async function resetAdminPassword() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    const db = drizzle(pool, { schema });

    try {
        const hashedPassword = await hashPassword("admin123");
        console.log("Generated hash:", hashedPassword);

        const result = await db.update(schema.users)
            .set({ password: hashedPassword })
            .where(eq(schema.users.username, "admin"))
            .returning();

        if (result.length > 0) {
            console.log("✅ Admin password updated successfully!");
            console.log("Username: admin");
            console.log("Password: admin123");
        } else {
            console.log("❌ Admin user not found");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

resetAdminPassword();

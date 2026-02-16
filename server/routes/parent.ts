import { Router } from "express";
import { db } from "../db";
import { eq, and, desc, inArray, gte, lte, sql, or, isNull } from "drizzle-orm";
import {
    students, guardians, studentGuardians, marks, testScores, testSessions, users,
    feePayments, invoices, invoiceItems, financeTransactions,
    gateAttendance, classAttendance, boardingRollCalls,
    conversations, conversationParticipants, messages,
    schools, schoolEvents, userSchools
} from "../../shared/schema";
import { requireAuth, comparePasswords, hashPassword, validatePassword } from "../auth";
import { z } from "zod";

export const parentRoutes = Router();

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const profileUpdateSchema = z.object({
    phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/, "Invalid phone number format").optional(),
    email: z.string().email("Invalid email format").optional(),
    addresses: z.string().max(500, "Address too long").optional(),
    occupation: z.string().max(100, "Occupation too long").optional(),
}).refine(data => Object.values(data).some(v => v !== undefined), {
    message: "At least one field must be provided"
});

const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[0-9]/, "Password must contain a number"),
});

const newMessageSchema = z.object({
    content: z.string().min(1, "Message content is required").max(5000, "Message too long"),
});

const newConversationSchema = z.object({
    recipientId: z.number().positive("Invalid recipient"),
    subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
    message: z.string().min(1, "Message is required").max(5000, "Message too long"),
});

// Middleware to ensure user is a parent/guardian
const requireParent = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Check if user is linked to a guardian profile
    const guardian = await db.query.guardians.findFirst({
        where: eq(guardians.userId, req.user.id)
    });

    if (!guardian) {
        return res.status(403).json({ message: "Not a registered parent account" });
    }

    req.guardian = guardian;
    next();
};

// Helper: get all student IDs for a guardian
async function getGuardianStudentIds(guardianId: number): Promise<number[]> {
    const links = await db.query.studentGuardians.findMany({
        where: eq(studentGuardians.guardianId, guardianId)
    });
    return links.map(l => l.studentId);
}

// Helper: verify guardian has access to a specific student
async function verifyStudentAccess(guardianId: number, studentId: number): Promise<boolean> {
    const link = await db.query.studentGuardians.findFirst({
        where: and(
            eq(studentGuardians.guardianId, guardianId),
            eq(studentGuardians.studentId, studentId)
        )
    });
    return !!link;
}

// ==========================================
// DASHBOARD
// ==========================================

// GET /api/parent/dashboard - List all children (original endpoint kept for compatibility)
parentRoutes.get("/dashboard", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardianId = req.guardian.id;

        // Get all student IDs linked to this guardian
        const links = await db.query.studentGuardians.findMany({
            where: eq(studentGuardians.guardianId, guardianId),
            with: {
                student: {
                    with: {
                        school: true
                    }
                }
            }
        });

        const children = links.map(link => ({
            id: link.student.id,
            name: link.student.name,
            photoBase64: link.student.photoBase64,
            classLevel: link.student.classLevel,
            stream: link.student.stream,
            schoolName: link.student.school?.name,
            schoolId: link.student.schoolId,
            status: (link.student as any).isActive ? 'Active' : 'Inactive'
        }));

        res.json({ children });
    } catch (error) {
        console.error("Parent dashboard error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
});

// GET /api/parent/dashboard-stats - Enhanced dashboard with aggregated stats
parentRoutes.get("/dashboard-stats", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardianId = req.guardian.id;
        const userId = req.user.id;

        // Get all linked students with school info
        const links = await db.query.studentGuardians.findMany({
            where: eq(studentGuardians.guardianId, guardianId),
            with: {
                student: {
                    with: {
                        school: true
                    }
                }
            }
        });

        const studentIds = links.map(l => l.student.id);
        if (studentIds.length === 0) {
            return res.json({
                guardian: { name: req.guardian.name, email: req.guardian.email },
                children: [],
                totals: { childrenCount: 0, pendingFees: 0, avgAttendance: 0 },
                recentActivity: [],
                upcomingEvents: [],
                schoolInfo: null
            });
        }

        // Per-child summaries - BATCH QUERIES to avoid N+1

        // 1. Batch fetch latest marks for all students
        const allMarks = await db.query.marks.findMany({
            where: inArray(marks.studentId, studentIds),
            orderBy: [desc(marks.year), desc(marks.term)]
        });
        // Group marks by studentId and get latest for each
        const latestMarksByStudent = new Map<number, typeof allMarks[0]>();
        for (const mark of allMarks) {
            if (!latestMarksByStudent.has(mark.studentId)) {
                latestMarksByStudent.set(mark.studentId, mark);
            }
        }

        // 2. Batch fetch fee balances for all students
        const feeBalances = await db.select({
            studentId: feePayments.studentId,
            totalDue: sql<number>`COALESCE(SUM(${feePayments.amountDue}), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaid}), 0)`,
        }).from(feePayments)
            .where(and(
                inArray(feePayments.studentId, studentIds),
                eq(feePayments.isDeleted, false)
            ))
            .groupBy(feePayments.studentId);

        const feeBalancesByStudent = new Map<number, number>();
        for (const fb of feeBalances) {
            feeBalancesByStudent.set(fb.studentId, (fb.totalDue || 0) - (fb.totalPaid || 0));
        }

        // 3. Batch fetch attendance (last 30 days) for all students
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const allAttendance = await db.select().from(gateAttendance)
            .where(and(
                inArray(gateAttendance.studentId, studentIds),
                gte(gateAttendance.date, dateStr)
            ));

        // Group attendance by student
        const attendanceByStudent = new Map<number, typeof allAttendance>();
        for (const record of allAttendance) {
            if (!attendanceByStudent.has(record.studentId)) {
                attendanceByStudent.set(record.studentId, []);
            }
            attendanceByStudent.get(record.studentId)!.push(record);
        }

        // Build child summaries from batched data
        const childSummaries = [];
        let totalPendingFees = 0;
        let totalAttendanceDays = 0;
        let totalPresentDays = 0;

        for (const link of links) {
            const sid = link.student.id;
            const latestMark = latestMarksByStudent.get(sid);
            const feeBalance = feeBalancesByStudent.get(sid) || 0;
            const gateRecords = attendanceByStudent.get(sid) || [];

            const presentCount = gateRecords.filter(r => r.status === 'present' || r.status === 'late').length;
            totalAttendanceDays += gateRecords.length;
            totalPresentDays += presentCount;
            totalPendingFees += Math.max(0, feeBalance);

            const attendanceRate = gateRecords.length > 0
                ? Math.round((presentCount / gateRecords.length) * 100)
                : 100;

            childSummaries.push({
                id: sid,
                name: link.student.name,
                photoBase64: link.student.photoBase64,
                classLevel: link.student.classLevel,
                stream: link.student.stream,
                schoolName: link.student.school?.name,
                schoolId: link.student.schoolId,
                latestGrade: latestMark ? {
                    term: latestMark.term,
                    year: latestMark.year,
                    aggregate: latestMark.aggregate,
                    division: latestMark.division
                } : null,
                feeBalance,
                attendanceRate
            });
        }

        // Recent activity (marks posted in last 30 days + payments received)
        // Reuse dateStr from line 187 (thirtyDaysAgo already defined above)

        const recentActivity: any[] = [];

        // Recent marks
        if (studentIds.length > 0) {
            const recentMarks = await db.select({
                id: marks.id,
                studentId: marks.studentId,
                term: marks.term,
                year: marks.year,
                aggregate: marks.aggregate,
                division: marks.division,
                createdAt: marks.createdAt,
                studentName: students.name
            }).from(marks)
                .innerJoin(students, eq(marks.studentId, students.id))
                .where(inArray(marks.studentId, studentIds))
                .orderBy(desc(marks.createdAt))
                .limit(5);

            for (const m of recentMarks) {
                recentActivity.push({
                    type: 'mark',
                    message: `${m.studentName} received Term ${m.term} ${m.year} results - Aggregate: ${m.aggregate}`,
                    date: m.createdAt,
                    studentId: m.studentId
                });
            }

            // Recent payments
            const recentPayments = await db.select({
                id: feePayments.id,
                studentId: feePayments.studentId,
                amountPaid: feePayments.amountPaid,
                paymentDate: feePayments.paymentDate,
                feeType: feePayments.feeType,
                studentName: students.name
            }).from(feePayments)
                .innerJoin(students, eq(feePayments.studentId, students.id))
                .where(and(
                    inArray(feePayments.studentId, studentIds),
                    eq(feePayments.isDeleted, false)
                ))
                .orderBy(desc(feePayments.createdAt))
                .limit(5);

            for (const p of recentPayments) {
                if (p.amountPaid > 0) {
                    recentActivity.push({
                        type: 'payment',
                        message: `Payment of UGX ${p.amountPaid.toLocaleString()} received for ${p.studentName} (${p.feeType})`,
                        date: p.paymentDate,
                        studentId: p.studentId
                    });
                }
            }
        }

        // Sort activity by date descending
        recentActivity.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db2 = b.date ? new Date(b.date).getTime() : 0;
            return db2 - da;
        });

        // Upcoming events
        const today = new Date().toISOString().split('T')[0];
        const schoolId = links[0]?.student.schoolId;
        let upcomingEvents: any[] = [];
        let schoolInfo: any = null;

        if (schoolId) {
            upcomingEvents = await db.select().from(schoolEvents)
                .where(and(
                    eq(schoolEvents.schoolId, schoolId),
                    gte(schoolEvents.startDate, today),
                    or(
                        eq(schoolEvents.targetAudience, 'all'),
                        eq(schoolEvents.targetAudience, 'parents'),
                        isNull(schoolEvents.targetAudience)
                    )
                ))
                .orderBy(schoolEvents.startDate)
                .limit(5);

            // School term info
            const school = await db.query.schools.findFirst({
                where: eq(schools.id, schoolId)
            });
            if (school) {
                schoolInfo = {
                    name: school.name,
                    currentTerm: school.currentTerm,
                    currentYear: school.currentYear,
                    motto: school.motto
                };
            }
        }

        // Unread messages count
        const participations = await db.select({
            conversationId: conversationParticipants.conversationId,
            lastReadAt: conversationParticipants.lastReadAt
        }).from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId));

        let unreadCount = 0;
        for (const p of participations) {
            const unreadMessages = await db.select({ count: sql<number>`count(*)` })
                .from(messages)
                .where(and(
                    eq(messages.conversationId, p.conversationId),
                    p.lastReadAt ? gte(messages.createdAt, p.lastReadAt) : sql`true`,
                    sql`${messages.senderId} != ${userId}`
                ));
            unreadCount += Number(unreadMessages[0]?.count || 0);
        }

        const avgAttendance = totalAttendanceDays > 0
            ? Math.round((totalPresentDays / totalAttendanceDays) * 100)
            : 100;

        res.json({
            guardian: { name: req.guardian.name, email: req.guardian.email },
            children: childSummaries,
            totals: {
                childrenCount: studentIds.length,
                pendingFees: totalPendingFees,
                avgAttendance
            },
            recentActivity: recentActivity.slice(0, 10),
            upcomingEvents,
            unreadMessages: unreadCount,
            schoolInfo
        });
    } catch (error) {
        console.error("Parent dashboard-stats error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
});

// ==========================================
// STUDENT DETAIL
// ==========================================

// GET /api/parent/student/:id - Get detailed student info
parentRoutes.get("/student/:id", requireAuth, requireParent, async (req: any, res) => {
    try {
        const studentId = parseInt(req.params.id as string);
        const guardianId = req.guardian.id;

        // Verify access
        const hasAccess = await verifyStudentAccess(guardianId, studentId);
        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied to this student" });
        }

        const student = await db.query.students.findFirst({
            where: eq(students.id, studentId),
            with: {
                school: true
            }
        });

        if (!student) return res.status(404).json({ message: "Student not found" });

        // Fetch Academic Data
        const academicHistory = await db.query.marks.findMany({
            where: eq(marks.studentId, studentId),
            orderBy: [desc(marks.year), desc(marks.term)],
        });

        const latestTerm = academicHistory[0];

        // Fetch Test Scores
        const studentTestScores = await db.select({
            score: testScores.aggregate,
            division: testScores.division,
            sessionName: testSessions.name,
            testType: testSessions.testType,
            term: testSessions.term,
            year: testSessions.year,
            date: testSessions.testDate
        })
            .from(testScores)
            .innerJoin(testSessions, eq(testScores.testSessionId, testSessions.id))
            .where(eq(testScores.studentId, studentId))
            .orderBy(desc(testSessions.year), desc(testSessions.term), desc(testSessions.createdAt));

        res.json({
            student: {
                ...student,
                schoolName: student.school?.name
            },
            academic: {
                latest: latestTerm,
                history: academicHistory,
                tests: studentTestScores
            }
        });

    } catch (error) {
        console.error("Parent student detail error:", error);
        res.status(500).json({ message: "Failed to fetch student details" });
    }
});

// ==========================================
// FEES
// ==========================================

// GET /api/parent/student/:id/fees - Student fee data
parentRoutes.get("/student/:id/fees", requireAuth, requireParent, async (req: any, res) => {
    try {
        const studentId = parseInt(req.params.id as string);
        const guardianId = req.guardian.id;

        const hasAccess = await verifyStudentAccess(guardianId, studentId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });

        // Fee payments
        const payments = await db.select().from(feePayments)
            .where(and(eq(feePayments.studentId, studentId), eq(feePayments.isDeleted, false)))
            .orderBy(desc(feePayments.createdAt));

        // Invoices with items
        const studentInvoices = await db.query.invoices.findMany({
            where: eq(invoices.studentId, studentId),
            with: { items: true },
            orderBy: [desc(invoices.year), desc(invoices.term)]
        });

        // Finance transactions
        const transactions = await db.select().from(financeTransactions)
            .where(eq(financeTransactions.studentId, studentId))
            .orderBy(desc(financeTransactions.createdAt));

        // Calculate summary
        const totalDue = payments.reduce((sum, p) => sum + p.amountDue, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        const balance = totalDue - totalPaid;

        res.json({
            summary: { totalDue, totalPaid, balance },
            payments,
            invoices: studentInvoices,
            transactions
        });
    } catch (error) {
        console.error("Parent student fees error:", error);
        res.status(500).json({ message: "Failed to fetch fee data" });
    }
});

// ==========================================
// ATTENDANCE
// ==========================================

// GET /api/parent/student/:id/attendance?month=YYYY-MM - Student attendance
parentRoutes.get("/student/:id/attendance", requireAuth, requireParent, async (req: any, res) => {
    try {
        const studentId = parseInt(req.params.id as string);
        const guardianId = req.guardian.id;

        const hasAccess = await verifyStudentAccess(guardianId, studentId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });

        // Default to current month
        const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
        const startDate = `${month}-01`;
        const endParts = month.split('-');
        const endYear = parseInt(endParts[0]);
        const endMonth = parseInt(endParts[1]);
        const lastDay = new Date(endYear, endMonth, 0).getDate();
        const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

        // Gate attendance
        const gateRecords = await db.select().from(gateAttendance)
            .where(and(
                eq(gateAttendance.studentId, studentId),
                gte(gateAttendance.date, startDate),
                lte(gateAttendance.date, endDate)
            ))
            .orderBy(desc(gateAttendance.date));

        // Class attendance
        const classRecords = await db.select().from(classAttendance)
            .where(and(
                eq(classAttendance.studentId, studentId),
                gte(classAttendance.date, startDate),
                lte(classAttendance.date, endDate)
            ))
            .orderBy(desc(classAttendance.date));

        // Boarding roll calls (if student is a boarder)
        const student = await db.query.students.findFirst({
            where: eq(students.id, studentId)
        });

        let boardingRecords: any[] = [];
        if (student?.boardingStatus === 'boarder') {
            boardingRecords = await db.select().from(boardingRollCalls)
                .where(and(
                    eq(boardingRollCalls.studentId, studentId),
                    gte(boardingRollCalls.date, startDate),
                    lte(boardingRollCalls.date, endDate)
                ))
                .orderBy(desc(boardingRollCalls.date));
        }

        // Stats from gate attendance
        const present = gateRecords.filter(r => r.status === 'present').length;
        const late = gateRecords.filter(r => r.status === 'late').length;
        const absent = gateRecords.filter(r => r.status === 'absent').length;
        const total = gateRecords.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

        res.json({
            month,
            gate: gateRecords,
            class: classRecords,
            boarding: boardingRecords,
            stats: { present, late, absent, total, rate }
        });
    } catch (error) {
        console.error("Parent student attendance error:", error);
        res.status(500).json({ message: "Failed to fetch attendance data" });
    }
});

// ==========================================
// SCHOOL INFO
// ==========================================

// GET /api/parent/school-info - School details for parents
parentRoutes.get("/school-info", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardianId = req.guardian.id;
        const studentIds = await getGuardianStudentIds(guardianId);

        if (studentIds.length === 0) {
            return res.json({ school: null, events: [] });
        }

        // Get school from first child
        const firstChild = await db.query.students.findFirst({
            where: inArray(students.id, studentIds),
            with: { school: true }
        });

        if (!firstChild?.school) {
            return res.json({ school: null, events: [] });
        }

        const school = firstChild.school;
        const today = new Date().toISOString().split('T')[0];

        // Upcoming events targeting parents or all
        const events = await db.select().from(schoolEvents)
            .where(and(
                eq(schoolEvents.schoolId, school.id),
                gte(schoolEvents.startDate, today),
                or(
                    eq(schoolEvents.targetAudience, 'all'),
                    eq(schoolEvents.targetAudience, 'parents'),
                    isNull(schoolEvents.targetAudience)
                )
            ))
            .orderBy(schoolEvents.startDate)
            .limit(20);

        res.json({
            school: {
                name: school.name,
                code: school.code,
                motto: school.motto,
                email: school.email,
                contactPhones: school.contactPhones,
                addressBox: school.addressBox,
                logoBase64: school.logoBase64,
                currentTerm: school.currentTerm,
                currentYear: school.currentYear,
                nextTermBeginBoarders: school.nextTermBeginBoarders,
                nextTermBeginDay: school.nextTermBeginDay
            },
            events
        });
    } catch (error) {
        console.error("Parent school-info error:", error);
        res.status(500).json({ message: "Failed to fetch school info" });
    }
});

// ==========================================
// PROFILE
// ==========================================

// GET /api/parent/profile - Guardian profile + linked children
parentRoutes.get("/profile", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardian = req.guardian;
        const user = req.user;

        const studentIds = await getGuardianStudentIds(guardian.id);
        let children: any[] = [];
        if (studentIds.length > 0) {
            children = await db.select({
                id: students.id,
                name: students.name,
                classLevel: students.classLevel,
                stream: students.stream,
                photoBase64: students.photoBase64
            }).from(students)
                .where(inArray(students.id, studentIds));
        }

        res.json({
            profile: {
                name: guardian.name,
                email: guardian.email,
                phone: guardian.phone,
                relationship: guardian.relationship,
                occupation: guardian.occupation,
                addresses: guardian.addresses,
                workPhone: guardian.workPhone,
                nationalId: guardian.nationalId,
                username: user.username
            },
            children
        });
    } catch (error) {
        console.error("Parent profile error:", error);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
});

// PUT /api/parent/profile - Update guardian profile
parentRoutes.put("/profile", requireAuth, requireParent, async (req: any, res) => {
    try {
        // Validate input with Zod
        const validation = profileUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                message: validation.error.issues[0]?.message || "Invalid input"
            });
        }

        const guardianId = req.guardian.id;
        const { phone, email, addresses, occupation } = validation.data;

        const updateData: Partial<typeof guardians.$inferInsert> = {};
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        // Map 'addresses' from frontend to 'addressPhysical' in schema
        if (addresses !== undefined) updateData.addressPhysical = addresses;
        if (occupation !== undefined) updateData.occupation = occupation;

        await db.update(guardians)
            .set(updateData)
            .where(eq(guardians.id, guardianId));

        // Also update user email if provided
        if (email !== undefined) {
            await db.update(users)
                .set({ email })
                .where(eq(users.id, req.user.id));
        }

        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        console.error("Parent profile update error:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

// PUT /api/parent/change-password - Change password
parentRoutes.put("/change-password", requireAuth, requireParent, async (req: any, res) => {
    try {
        // Validate input with Zod
        const validation = passwordChangeSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                message: validation.error.issues[0]?.message || "Invalid input"
            });
        }

        const { currentPassword, newPassword } = validation.data;

        // Verify current password
        const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isValid = await comparePasswords(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash and save
        const hashed = await hashPassword(newPassword);
        await db.update(users)
            .set({ password: hashed })
            .where(eq(users.id, req.user.id));

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Parent change-password error:", error);
        res.status(500).json({ message: "Failed to change password" });
    }
});

// ==========================================
// MESSAGING
// ==========================================

// GET /api/parent/conversations - Parent's conversations
parentRoutes.get("/conversations", requireAuth, requireParent, async (req: any, res) => {
    try {
        const userId = req.user.id;

        const participations = await db.select({
            conversationId: conversationParticipants.conversationId,
            lastReadAt: conversationParticipants.lastReadAt
        }).from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId));

        if (participations.length === 0) {
            return res.json({ conversations: [] });
        }

        const convIds = participations.map(p => p.conversationId);
        const convs = await db.select().from(conversations)
            .where(inArray(conversations.id, convIds))
            .orderBy(desc(conversations.lastMessageAt));

        // Enrich each conversation with last message and unread count
        const enriched = [];
        for (const conv of convs) {
            const lastMsg = await db.select({
                content: messages.content,
                senderId: messages.senderId,
                createdAt: messages.createdAt,
                senderName: users.name
            }).from(messages)
                .innerJoin(users, eq(messages.senderId, users.id))
                .where(eq(messages.conversationId, conv.id))
                .orderBy(desc(messages.createdAt))
                .limit(1);

            const participation = participations.find(p => p.conversationId === conv.id);
            let unreadCount = 0;
            if (participation) {
                const unread = await db.select({ count: sql<number>`count(*)` })
                    .from(messages)
                    .where(and(
                        eq(messages.conversationId, conv.id),
                        sql`${messages.senderId} != ${userId}`,
                        participation.lastReadAt
                            ? gte(messages.createdAt, participation.lastReadAt)
                            : sql`true`
                    ));
                unreadCount = Number(unread[0]?.count || 0);
            }

            // Get participants
            const parts = await db.select({
                userId: conversationParticipants.userId,
                name: users.name
            }).from(conversationParticipants)
                .innerJoin(users, eq(conversationParticipants.userId, users.id))
                .where(eq(conversationParticipants.conversationId, conv.id));

            enriched.push({
                ...conv,
                lastMessage: lastMsg[0] || null,
                unreadCount,
                participants: parts
            });
        }

        res.json({ conversations: enriched });
    } catch (error) {
        console.error("Parent conversations error:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// POST /api/parent/conversations - Create new conversation with staff
parentRoutes.post("/conversations", requireAuth, requireParent, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const { recipientId, subject, message } = req.body;

        if (!recipientId || !subject || !message) {
            return res.status(400).json({ message: "recipientId, subject, and message are required" });
        }

        // Get the school ID from guardian's first child
        const studentIds = await getGuardianStudentIds(req.guardian.id);
        if (studentIds.length === 0) {
            return res.status(400).json({ message: "No linked students" });
        }
        const firstChild = await db.query.students.findFirst({
            where: inArray(students.id, studentIds)
        });
        if (!firstChild) return res.status(400).json({ message: "No linked students found" });

        // Create conversation
        const [conv] = await db.insert(conversations).values({
            schoolId: firstChild.schoolId,
            subject,
            type: 'direct',
            createdById: userId,
            lastMessageAt: new Date()
        }).returning();

        // Add participants
        await db.insert(conversationParticipants).values([
            { conversationId: conv.id, userId, lastReadAt: new Date() },
            { conversationId: conv.id, userId: recipientId }
        ]);

        // Add first message
        await db.insert(messages).values({
            conversationId: conv.id,
            senderId: userId,
            content: message
        });

        res.status(201).json({ conversation: conv });
    } catch (error) {
        console.error("Parent create conversation error:", error);
        res.status(500).json({ message: "Failed to create conversation" });
    }
});

// GET /api/parent/conversations/:id/messages - Thread messages
parentRoutes.get("/conversations/:id/messages", requireAuth, requireParent, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id as string);

        // Verify participation
        const participation = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, userId)
            )
        });
        if (!participation) return res.status(403).json({ message: "Access denied" });

        const conv = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId)
        });

        const msgs = await db.select({
            id: messages.id,
            content: messages.content,
            senderId: messages.senderId,
            senderName: users.name,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
            isEdited: messages.isEdited,
            isDeleted: messages.isDeleted
        }).from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(eq(messages.conversationId, conversationId))
            .orderBy(messages.createdAt);

        res.json({ conversation: conv, messages: msgs });
    } catch (error) {
        console.error("Parent conversation messages error:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// POST /api/parent/conversations/:id/messages - Send reply
parentRoutes.post("/conversations/:id/messages", requireAuth, requireParent, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id as string);
        const { content } = req.body;

        if (!content) return res.status(400).json({ message: "Message content is required" });

        // Verify participation
        const participation = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, userId)
            )
        });
        if (!participation) return res.status(403).json({ message: "Access denied" });

        const [msg] = await db.insert(messages).values({
            conversationId,
            senderId: userId,
            content
        }).returning();

        // Update conversation lastMessageAt
        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

        // Update sender's last read
        await db.update(conversationParticipants)
            .set({ lastReadAt: new Date() })
            .where(and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, userId)
            ));

        res.status(201).json({ message: msg });
    } catch (error) {
        console.error("Parent send message error:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
});

// POST /api/parent/conversations/:id/read - Mark as read
parentRoutes.post("/conversations/:id/read", requireAuth, requireParent, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id as string);

        await db.update(conversationParticipants)
            .set({ lastReadAt: new Date() })
            .where(and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, userId)
            ));

        res.json({ message: "Marked as read" });
    } catch (error) {
        console.error("Parent mark read error:", error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
});

// GET /api/parent/messaging-recipients - List school staff available to message
parentRoutes.get("/messaging-recipients", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardianId = req.guardian.id;
        const studentIds = await getGuardianStudentIds(guardianId);

        if (studentIds.length === 0) {
            return res.json({ recipients: [] });
        }

        // Get school ID from first child
        const firstChild = await db.query.students.findFirst({
            where: inArray(students.id, studentIds)
        });
        if (!firstChild) return res.json({ recipients: [] });

        // Get all staff in the same school
        const schoolStaff = await db.select({
            userId: userSchools.userId,
            role: userSchools.role,
            name: users.name,
        }).from(userSchools)
            .innerJoin(users, eq(userSchools.userId, users.id))
            .where(eq(userSchools.schoolId, firstChild.schoolId));

        // Filter out the current user
        const recipients = schoolStaff
            .filter(s => s.userId !== req.user.id)
            .map(s => ({
                id: s.userId,
                name: s.name,
                role: s.role
            }));

        res.json({ recipients });
    } catch (error) {
        console.error("Parent messaging recipients error:", error);
        res.status(500).json({ message: "Failed to fetch recipients" });
    }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// GET /api/parent/notifications - Synthesized from existing data
parentRoutes.get("/notifications", requireAuth, requireParent, async (req: any, res) => {
    try {
        const guardianId = req.guardian.id;
        const userId = req.user.id;
        const studentIds = await getGuardianStudentIds(guardianId);
        const notifications: any[] = [];

        if (studentIds.length === 0) {
            return res.json({ notifications: [] });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr30 = thirtyDaysAgo.toISOString().split('T')[0];

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStr7 = sevenDaysAgo.toISOString().split('T')[0];

        // Recent marks (30 days)
        const recentMarks = await db.select({
            id: marks.id,
            studentId: marks.studentId,
            term: marks.term,
            year: marks.year,
            aggregate: marks.aggregate,
            division: marks.division,
            createdAt: marks.createdAt,
            studentName: students.name
        }).from(marks)
            .innerJoin(students, eq(marks.studentId, students.id))
            .where(inArray(marks.studentId, studentIds))
            .orderBy(desc(marks.createdAt))
            .limit(10);

        for (const m of recentMarks) {
            notifications.push({
                id: `mark-${m.id}`,
                type: 'academic',
                title: 'Report Card Published',
                message: `${m.studentName}'s Term ${m.term} ${m.year} results are available. Aggregate: ${m.aggregate}, Division: ${m.division}`,
                date: m.createdAt,
                studentId: m.studentId
            });
        }

        // Recent fee payments (30 days)
        const recentPayments = await db.select({
            id: feePayments.id,
            studentId: feePayments.studentId,
            amountPaid: feePayments.amountPaid,
            feeType: feePayments.feeType,
            paymentDate: feePayments.paymentDate,
            createdAt: feePayments.createdAt,
            studentName: students.name
        }).from(feePayments)
            .innerJoin(students, eq(feePayments.studentId, students.id))
            .where(and(
                inArray(feePayments.studentId, studentIds),
                eq(feePayments.isDeleted, false)
            ))
            .orderBy(desc(feePayments.createdAt))
            .limit(10);

        for (const p of recentPayments) {
            if (p.amountPaid > 0) {
                notifications.push({
                    id: `payment-${p.id}`,
                    type: 'fees',
                    title: 'Payment Recorded',
                    message: `Payment of UGX ${p.amountPaid.toLocaleString()} for ${p.studentName} (${p.feeType})`,
                    date: p.createdAt || p.paymentDate,
                    studentId: p.studentId
                });
            }
        }

        // Recent absences (7 days)
        const recentAbsences = await db.select({
            id: gateAttendance.id,
            studentId: gateAttendance.studentId,
            date: gateAttendance.date,
            status: gateAttendance.status,
            studentName: students.name
        }).from(gateAttendance)
            .innerJoin(students, eq(gateAttendance.studentId, students.id))
            .where(and(
                inArray(gateAttendance.studentId, studentIds),
                gte(gateAttendance.date, dateStr7),
                or(eq(gateAttendance.status, 'absent'), eq(gateAttendance.status, 'late'))
            ))
            .orderBy(desc(gateAttendance.date))
            .limit(10);

        for (const a of recentAbsences) {
            notifications.push({
                id: `attendance-${a.id}`,
                type: 'attendance',
                title: a.status === 'absent' ? 'Absence Recorded' : 'Late Arrival',
                message: `${a.studentName} was marked ${a.status} on ${a.date}`,
                date: a.date,
                studentId: a.studentId
            });
        }

        // Upcoming events
        const today = new Date().toISOString().split('T')[0];
        const firstChild = await db.query.students.findFirst({
            where: inArray(students.id, studentIds)
        });

        if (firstChild) {
            const events = await db.select().from(schoolEvents)
                .where(and(
                    eq(schoolEvents.schoolId, firstChild.schoolId),
                    gte(schoolEvents.startDate, today),
                    or(
                        eq(schoolEvents.targetAudience, 'all'),
                        eq(schoolEvents.targetAudience, 'parents'),
                        isNull(schoolEvents.targetAudience)
                    )
                ))
                .orderBy(schoolEvents.startDate)
                .limit(5);

            for (const e of events) {
                notifications.push({
                    id: `event-${e.id}`,
                    type: 'event',
                    title: 'Upcoming Event',
                    message: `${e.name} on ${e.startDate}${e.venue ? ` at ${e.venue}` : ''}`,
                    date: e.startDate,
                    eventType: e.eventType
                });
            }
        }

        // Unread messages
        const participations = await db.select({
            conversationId: conversationParticipants.conversationId,
            lastReadAt: conversationParticipants.lastReadAt
        }).from(conversationParticipants)
            .where(eq(conversationParticipants.userId, userId));

        for (const p of participations) {
            const unreadMsgs = await db.select({
                id: messages.id,
                content: messages.content,
                senderName: users.name,
                createdAt: messages.createdAt
            }).from(messages)
                .innerJoin(users, eq(messages.senderId, users.id))
                .where(and(
                    eq(messages.conversationId, p.conversationId),
                    sql`${messages.senderId} != ${userId}`,
                    p.lastReadAt ? gte(messages.createdAt, p.lastReadAt) : sql`true`
                ))
                .orderBy(desc(messages.createdAt))
                .limit(3);

            for (const m of unreadMsgs) {
                notifications.push({
                    id: `message-${m.id}`,
                    type: 'message',
                    title: 'New Message',
                    message: `${m.senderName}: ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`,
                    date: m.createdAt
                });
            }
        }

        // Sort all notifications by date descending
        notifications.sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db2 = b.date ? new Date(b.date).getTime() : 0;
            return db2 - da;
        });

        res.json({ notifications });
    } catch (error) {
        console.error("Parent notifications error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

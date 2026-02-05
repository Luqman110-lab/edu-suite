import { Router } from "express";
import { db } from "../db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { students, guardians, studentGuardians, marks, testScores, testSessions, users } from "../../shared/schema";
import { requireAuth } from "../auth";

export const parentRoutes = Router();

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

// GET /api/parent/dashboard - List all children
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

// GET /api/parent/student/:id - Get detailed student info
parentRoutes.get("/student/:id", requireAuth, requireParent, async (req: any, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const guardianId = req.guardian.id;

        // Verify access
        const link = await db.query.studentGuardians.findFirst({
            where: and(
                eq(studentGuardians.guardianId, guardianId),
                eq(studentGuardians.studentId, studentId)
            )
        });

        if (!link) {
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

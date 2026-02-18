import { Router, Request } from "express";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
    students, schools, marks, feePayments, studentYearSnapshots, auditLogs
} from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function queryStr(req: Request, key: string): string {
    const val = req.query[key];
    if (Array.isArray(val)) return String(val[0]);
    return val ? String(val) : '';
}

export const archiveRoutes = Router();

// GET /api/archive/years - Get available archive years
archiveRoutes.get("/archive/years", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const [school] = await db.select({
            currentYear: schools.currentYear,
            archivedYears: schools.archivedYears,
        }).from(schools).where(eq(schools.id, schoolId));

        if (!school) return res.status(404).json({ message: "School not found" });

        res.json({
            currentYear: school.currentYear,
            archivedYears: ((school.archivedYears as number[]) || []).sort((a, b) => b - a),
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch archive years: " + error.message });
    }
});

// GET /api/archive/students - Get students for a specific archived year (using snapshots)
archiveRoutes.get("/archive/students", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const year = parseInt(queryStr(req, 'year'));
        if (isNaN(year)) return res.status(400).json({ message: "Year parameter required" });

        const snapshotStudents = await db.select({
            id: students.id,
            name: students.name,
            gender: students.gender,
            indexNumber: students.indexNumber,
            paycode: students.paycode,
            parentName: students.parentName,
            parentContact: students.parentContact,
            dateOfBirth: students.dateOfBirth,
            photoBase64: students.photoBase64,
            boardingStatus: studentYearSnapshots.boardingStatus,
            classLevel: studentYearSnapshots.classLevel,
            stream: studentYearSnapshots.stream,
            isActive: studentYearSnapshots.isActive,
            snapshotYear: studentYearSnapshots.year,
        })
            .from(studentYearSnapshots)
            .innerJoin(students, eq(studentYearSnapshots.studentId, students.id))
            .where(and(
                eq(studentYearSnapshots.schoolId, schoolId),
                eq(studentYearSnapshots.year, year)
            ))
            .orderBy(students.name);

        res.json(snapshotStudents);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch archived students: " + error.message });
    }
});

// GET /api/archive/summary - Get archive summary stats for a year
archiveRoutes.get("/archive/summary", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const year = parseInt(queryStr(req, 'year'));
        if (isNaN(year)) return res.status(400).json({ message: "Year parameter required" });

        const [studentCount] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(studentYearSnapshots)
            .where(and(eq(studentYearSnapshots.schoolId, schoolId), eq(studentYearSnapshots.year, year)));

        const [marksCount] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(marks)
            .where(and(eq(marks.schoolId, schoolId), eq(marks.year, year)));

        const [feeTotal] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)`.mapWith(Number) })
            .from(feePayments)
            .where(and(eq(feePayments.schoolId, schoolId), eq(feePayments.year, year)));

        res.json({
            year,
            students: studentCount?.count || 0,
            marksEntries: marksCount?.count || 0,
            feesCollected: feeTotal?.total || 0,
        });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch archive summary: " + error.message });
    }
});

// POST /api/archive/create-snapshot - Manually create a snapshot for a year (admin only)
archiveRoutes.post("/archive/create-snapshot", requireAdmin, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { year } = req.body;
        if (!year || typeof year !== 'number') return res.status(400).json({ message: "Year is required" });

        const activeStudents = await db.select({
            id: students.id,
            classLevel: students.classLevel,
            stream: students.stream,
            boardingStatus: students.boardingStatus,
            isActive: students.isActive,
        }).from(students).where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

        if (activeStudents.length === 0) return res.json({ message: "No active students to snapshot", count: 0 });

        const snapshots = activeStudents.map(s => ({
            schoolId,
            studentId: s.id,
            year,
            classLevel: s.classLevel,
            stream: s.stream,
            boardingStatus: s.boardingStatus || 'day',
            isActive: s.isActive ?? true,
        }));

        await db.insert(studentYearSnapshots).values(snapshots).onConflictDoNothing();

        // Update archivedYears on school
        const [school] = await db.select({ archivedYears: schools.archivedYears }).from(schools).where(eq(schools.id, schoolId));
        const existingArchived = (school?.archivedYears as number[]) || [];
        if (!existingArchived.includes(year)) {
            await db.update(schools).set({
                archivedYears: [...existingArchived, year].sort((a, b) => b - a),
            }).where(eq(schools.id, schoolId));
        }

        res.json({ message: `Snapshot created for ${year}`, count: activeStudents.length });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create snapshot: " + error.message });
    }
});

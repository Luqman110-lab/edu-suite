import { Router } from "express";
import { db } from "../db";
import { p7ExamSets, p7Scores } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { getActiveSchoolId } from "../auth";

const router = Router();

// Get all P7 Exam Sets for the active school
router.get("/p7-exam-sets", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        const sets = await db.select().from(p7ExamSets).where(eq(p7ExamSets.schoolId, schoolId));
        res.json(sets);
    } catch (err) {
        next(err);
    }
});

// Create a new P7 Exam Set
router.post("/p7-exam-sets", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        const [newSet] = await db.insert(p7ExamSets).values({
            ...req.body,
            schoolId,
        }).returning();

        res.status(201).json(newSet);
    } catch (err) {
        next(err);
    }
});

// Delete a P7 Exam Set
router.delete("/p7-exam-sets/:id", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        await db.delete(p7ExamSets).where(
            and(
                eq(p7ExamSets.id, parseInt(req.params.id)),
                eq(p7ExamSets.schoolId, schoolId)
            )
        );

        res.sendStatus(204);
    } catch (err) {
        next(err);
    }
});

// Get scores for a specific exam set
router.get("/p7-scores", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        const { examSetId } = req.query;
        if (!examSetId) return res.status(400).json({ message: "examSetId is required" });

        // Join to verify school ownership
        const scores = await db
            .select({
                id: p7Scores.id,
                examSetId: p7Scores.examSetId,
                studentId: p7Scores.studentId,
                marks: p7Scores.marks,
                total: p7Scores.total,
                aggregate: p7Scores.aggregate,
                division: p7Scores.division,
                position: p7Scores.position,
                teacherComment: p7Scores.teacherComment,
                enteredBy: p7Scores.enteredBy,
                createdAt: p7Scores.createdAt,
            })
            .from(p7Scores)
            .innerJoin(p7ExamSets, eq(p7Scores.examSetId, p7ExamSets.id))
            .where(
                and(
                    eq(p7ExamSets.id, parseInt(examSetId as string)),
                    eq(p7ExamSets.schoolId, schoolId)
                )
            );

        res.json(scores);
    } catch (err) {
        next(err);
    }
});

// Create or Update scores for a student in an exam set
router.post("/p7-scores", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        // Verify the exam set belongs to the school
        const [examSet] = await db.select().from(p7ExamSets).where(
            and(
                eq(p7ExamSets.id, req.body.examSetId),
                eq(p7ExamSets.schoolId, schoolId)
            )
        );

        if (!examSet) return res.status(404).json({ message: "Exam set not found" });

        // Check if score already exists
        const [existing] = await db.select().from(p7Scores).where(
            and(
                eq(p7Scores.examSetId, req.body.examSetId),
                eq(p7Scores.studentId, req.body.studentId)
            )
        );

        if (existing) {
            // Update
            const [updated] = await db.update(p7Scores).set({
                ...req.body,
            }).where(eq(p7Scores.id, existing.id)).returning();
            res.json(updated);
        } else {
            // Insert
            const [inserted] = await db.insert(p7Scores).values({
                ...req.body,
            }).returning();
            res.status(201).json(inserted);
        }
    } catch (err) {
        next(err);
    }
});

// Batch Save Scores
router.post("/p7-scores/batch", async (req, res, next) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(401).json({ message: "Not authenticated" });

        const { scores } = req.body;
        if (!Array.isArray(scores)) return res.status(400).json({ message: "scores must be an array" });

        // Basic verification
        for (const score of scores) {
            // Verify exam set belongs to the school
            const [examSet] = await db.select().from(p7ExamSets).where(
                and(
                    eq(p7ExamSets.id, score.examSetId),
                    eq(p7ExamSets.schoolId, schoolId)
                )
            );
            if (!examSet) return res.status(404).json({ message: `Exam set ${score.examSetId} not found` });

            // Upsert
            const [existing] = await db.select().from(p7Scores).where(
                and(
                    eq(p7Scores.examSetId, score.examSetId),
                    eq(p7Scores.studentId, score.studentId)
                )
            );

            if (existing) {
                await db.update(p7Scores).set({ ...score }).where(eq(p7Scores.id, existing.id));
            } else {
                await db.insert(p7Scores).values({ ...score });
            }
        }

        res.json({ message: "Marks saved successfully" });
    } catch (err) {
        next(err);
    }
});

export default router;

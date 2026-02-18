import { Router, Request } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { faceEmbeddings, students, teachers } from "../../shared/schema";
import { requireAuth, requireAdmin, getActiveSchoolId } from "../auth";

function param(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}

export const biometricRoutes = Router();

// POST /api/face-embeddings - Enroll a face (save embedding)
biometricRoutes.post("/face-embeddings", requireAdmin, async (req, res) => {
    try {
        const { personType, personId, embedding, quality } = req.body;
        const schoolId = getActiveSchoolId(req);

        if (!schoolId) {
            return res.status(400).json({ message: "Active school required" });
        }

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
            return res.status(400).json({ message: "Invalid embedding format. Expected 128-float array." });
        }

        // Upsert based on unique constraint (schoolId, personType, personId)
        const [record] = await db.insert(faceEmbeddings).values({
            schoolId,
            personType,
            personId,
            embedding,
            quality: quality || 0,
            captureVersion: 1
        }).onConflictDoUpdate({
            target: [faceEmbeddings.schoolId, faceEmbeddings.personType, faceEmbeddings.personId],
            set: {
                embedding,
                quality: quality || 0,
                updatedAt: new Date()
            }
        }).returning();

        res.json(record);
    } catch (error: any) {
        console.error("Face enrollment error:", error);
        res.status(500).json({ message: "Failed to enroll face: " + error.message });
    }
});

// POST /api/face-embeddings/identify - Identify a face
biometricRoutes.post("/face-embeddings/identify", requireAuth, async (req, res) => {
    try {
        const { embedding, threshold = 0.5 } = req.body;
        const schoolId = getActiveSchoolId(req);

        if (!schoolId) {
            return res.status(400).json({ message: "Active school required" });
        }

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
            return res.status(400).json({ message: "Invalid embedding format." });
        }

        // Fetch active embeddings for this school
        const candidates = await db.select().from(faceEmbeddings).where(
            and(
                eq(faceEmbeddings.isActive, true),
                eq(faceEmbeddings.schoolId, schoolId)
            )
        );

        let bestMatch: any = null;
        let minDistance = Infinity;

        for (const candidate of candidates) {
            const storedEmbedding = candidate.embedding as number[];
            if (!storedEmbedding || storedEmbedding.length !== 128) continue;

            // Euclidean distance
            const distance = Math.sqrt(
                embedding.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - storedEmbedding[i], 2), 0)
            );

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = candidate;
            }
        }

        if (bestMatch && minDistance <= threshold) {
            // Fetch person details
            let personDetails = null;
            if (bestMatch.personType === 'student') {
                [personDetails] = await db.select().from(students).where(eq(students.id, bestMatch.personId));
            } else if (bestMatch.personType === 'teacher') {
                [personDetails] = await db.select().from(teachers).where(eq(teachers.id, bestMatch.personId));
            }

            return res.json({
                match: true,
                person: personDetails,
                personType: bestMatch.personType,
                distance: minDistance
            });
        }

        res.json({ match: false, distance: minDistance });

    } catch (error: any) {
        console.error("Face identification error:", error);
        res.status(500).json({ message: "Failed to identify face: " + error.message });
    }
});

// GET /api/face-embeddings - Get all face embeddings for the school
biometricRoutes.get("/face-embeddings", requireAuth, async (req, res) => {
    try {
        const schoolId = getActiveSchoolId(req);
        if (!schoolId) return res.status(400).json({ message: "No active school selected" });

        const { personType } = req.query;
        const conditions: any[] = [
            eq(faceEmbeddings.schoolId, schoolId),
            eq(faceEmbeddings.isActive, true)
        ];

        if (personType && typeof personType === 'string') {
            conditions.push(eq(faceEmbeddings.personType, personType));
        }

        const embeddings = await db.select().from(faceEmbeddings).where(and(...conditions));
        res.json(embeddings);
    } catch (error: any) {
        console.error("Get face embeddings error:", error);
        res.status(500).json({ message: "Failed to fetch face embeddings: " + error.message });
    }
});

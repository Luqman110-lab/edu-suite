import type { Express } from "express";
import { db } from "./db";
import { students } from "../shared/schema";
import { eq } from "drizzle-orm";

export function setupPublicRoutes(app: Express) {
    // Public student verification endpoint for QR codes
    app.get("/api/public/verify-student/:id", async (req, res) => {
        try {
            const studentId = parseInt(req.params.id);

            if (isNaN(studentId)) {
                return res.json({
                    valid: false,
                    message: "Invalid student ID"
                });
            }

            const student = await db.query.students.findFirst({
                where: eq(students.id, studentId),
                with: {
                    school: {
                        columns: {
                            name: true
                        }
                    }
                }
            });

            if (!student) {
                return res.json({
                    valid: false,
                    message: "Student not found"
                });
            }

            // Return public student information
            res.json({
                valid: true,
                student: {
                    name: `${student.firstName} ${student.lastName}`,
                    photoBase64: student.photoBase64,
                    classLevel: student.classLevel,
                    stream: student.stream,
                    schoolName: student.school?.name || 'Unknown School',
                    status: student.status,
                    indexNumber: student.indexNumber
                }
            });
        } catch (error) {
            console.error('Verification error:', error);
            res.status(500).json({
                valid: false,
                message: "Verification failed. Please try again."
            });
        }
    });
}

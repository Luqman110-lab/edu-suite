import type { Express } from "express";
import { db } from "./db";
import { students, marks, testScores, testSessions } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

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

            // Fetch latest marks
            const latestMarks = await db.query.marks.findFirst({
                where: eq(marks.studentId, studentId),
                orderBy: [desc(marks.year), desc(marks.term)],
            });

            // Fetch academic history
            const academicHistory = await db.query.marks.findMany({
                where: eq(marks.studentId, studentId),
                orderBy: [desc(marks.year), desc(marks.term)],
            });

            // Fetch test scores
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

            // Return public student information
            res.json({
                valid: true,
                student: {
                    name: student.name,
                    photoBase64: student.photoBase64,
                    classLevel: student.classLevel,
                    stream: student.stream,
                    schoolName: student.school?.name || 'Unknown School',
                    status: (student as any).isActive ? 'Active' : 'Inactive', // Assuming schema uses isActive boolean or mapped to status string
                    indexNumber: student.indexNumber,
                    // Extended Info
                    medicalInfo: student.medicalInfo,
                    emergencyContacts: student.emergencyContacts,
                    boardingStatus: student.boardingStatus,
                    houseOrDormitory: student.houseOrDormitory,
                    latestAcademic: latestMarks ? {
                        term: latestMarks.term,
                        year: latestMarks.year,
                        aggregate: latestMarks.aggregate,
                        division: latestMarks.division
                    } : null,
                    academicHistory: academicHistory.map(m => ({
                        term: m.term,
                        year: m.year,
                        classLevel: student.classLevel, // This might not be historically accurate if class isn't stored in marks, but term/year is key
                        aggregate: m.aggregate,
                        division: m.division
                    })),
                    testScores: studentTestScores
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

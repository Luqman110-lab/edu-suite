import 'dotenv/config';
import { db } from './server/db.js';
import { marks, students } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

async function test() {
    try {
        console.log("-- Testing Query Syntax --");
        const schoolId = 1;
        const currentTerm = 1;
        const currentYear = 2025;

        const q1 = db.select({
            division: sql<string>`COALESCE(${marks.division}, 'X')`,
            count: sql<number>`count(*)::int`
        }).from(marks)
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)))
            .groupBy(sql`COALESCE(${marks.division}, 'X')`);

        console.log("Division:", q1.toSQL());

        const q2 = db.select({
            classLevel: students.classLevel,
            avgAggregate: sql<number>`AVG(COALESCE(${marks.aggregate}, 0))`
        }).from(marks).innerJoin(students, eq(marks.studentId, students.id))
            .where(and(eq(marks.schoolId, schoolId), eq(marks.term, currentTerm), eq(marks.year, currentYear)))
            .groupBy(students.classLevel);

        console.log("Classes:", q2.toSQL());

    } catch (err) {
        console.error("Syntax Gen Error:", err);
    } finally {
        process.exit();
    }
}
test();

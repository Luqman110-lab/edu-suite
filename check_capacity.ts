import "dotenv/config";
import { db } from "./server/db";
import { students, classStreams } from "./shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
    try {
        console.log("Checking class streams...");
        const streams = await db.select().from(classStreams);
        console.log(`Found ${streams.length} streams.`);

        for (const stream of streams) {
            const currentCount = await db.select({ count: sql<number>`count(*)::int` })
                .from(students)
                .where(and(
                    eq(students.schoolId, stream.schoolId),
                    eq(students.classLevel, stream.classLevel),
                    eq(students.stream, stream.streamName),
                    eq(students.isActive, true)
                ));

            console.log(`Stream: ${stream.classLevel} ${stream.streamName}, Max Capacity: ${stream.maxCapacity}, Current Count: ${currentCount[0].count}`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();

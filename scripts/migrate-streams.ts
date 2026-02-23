import { db } from "../server/db";
import { schools, classStreams } from "../shared/schema";

async function migrateStreams() {
    console.log("Starting streams migration from JSON to class_streams table...");

    try {
        const allSchools = await db.select().from(schools);
        console.log(`Found ${allSchools.length} schools to migrate.`);

        for (const school of allSchools) {
            const streamsObj = school.streams as Record<string, string[]>;

            if (!streamsObj) {
                console.log(`No streams found for school ID ${school.id} (${school.name})`);
                continue;
            }

            console.log(`Migrating streams for school ID ${school.id} (${school.name})...`);

            let insertedCount = 0;
            let sortOrder = 0;

            for (const [classLevel, streamsList] of Object.entries(streamsObj)) {
                if (!Array.isArray(streamsList)) continue;

                for (const streamName of streamsList) {
                    // Check if stream already exists
                    const existing = await db.query.classStreams.findFirst({
                        where: (streams, { eq, and }) =>
                            and(
                                eq(streams.schoolId, school.id),
                                eq(streams.classLevel, classLevel),
                                eq(streams.streamName, streamName)
                            )
                    });

                    if (!existing) {
                        await db.insert(classStreams).values({
                            schoolId: school.id,
                            classLevel,
                            streamName,
                            maxCapacity: 60, // Default capacity
                            isActive: true,
                            sortOrder
                        });
                        insertedCount++;
                        sortOrder++;
                    }
                }
            }

            console.log(`Successfully migrated ${insertedCount} streams for school ID ${school.id}.`);
        }

        console.log("Streams migration completed successfully.");
    } catch (error) {
        console.error("Error during streams migration:", error);
    } finally {
        process.exit(0);
    }
}

migrateStreams();

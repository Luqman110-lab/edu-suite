import { db } from "./db";
import { students, marks, testSessions, testScores, p7ExamSets, p7Scores } from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Migration Script: Normalize Class Names
 * 
 * This script converts class names from full format to abbreviated format:
 * "Primary 1" → "P1"
 * "Nursery 1" → "N1"
 * etc.
 */

async function normalizeClassNames() {
    console.log('🔄 Starting class name normalization migration...\n');

    try {
        // Step 1: Backup check
        console.log('📋 Step 1: Checking current class name formats...');

        const uniqueClasses = await db.execute(sql`
      SELECT DISTINCT class_level, COUNT(*) as count 
      FROM students 
      GROUP BY class_level 
      ORDER BY class_level
    `);

        console.log('\n📊 Current class formats in database:');
        console.table(uniqueClasses.rows);

        // Step 2: Normalize Students table
        console.log('\n🔧 Step 2: Normalizing students.class_level...');

        const classMapping = [
            // Primary classes
            { pattern: '%Primary 1%', normalized: 'P1' },
            { pattern: '%Primary 2%', normalized: 'P2' },
            { pattern: '%Primary 3%', normalized: 'P3' },
            { pattern: '%Primary 4%', normalized: 'P4' },
            { pattern: '%Primary 5%', normalized: 'P5' },
            { pattern: '%Primary 6%', normalized: 'P6' },
            { pattern: '%Primary 7%', normalized: 'P7' },
            // Nursery classes
            { pattern: '%Nursery 1%', normalized: 'N1' },
            { pattern: '%Nursery 2%', normalized: 'N2' },
            { pattern: '%Nursery 3%', normalized: 'N3' },
            // Alternative formats
            { pattern: '%primary 1%', normalized: 'P1' },
            { pattern: '%primary 2%', normalized: 'P2' },
            { pattern: '%primary 3%', normalized: 'P3' },
            { pattern: '%primary 4%', normalized: 'P4' },
            { pattern: '%primary 5%', normalized: 'P5' },
            { pattern: '%primary 6%', normalized: 'P6' },
            { pattern: '%primary 7%', normalized: 'P7' },
            { pattern: '%nursery 1%', normalized: 'N1' },
            { pattern: '%nursery 2%', normalized: 'N2' },
            { pattern: '%nursery 3%', normalized: 'N3' },
        ];

        let totalUpdated = 0;

        for (const mapping of classMapping) {
            const result = await db.execute(sql`
        UPDATE students 
        SET class_level = ${mapping.normalized}
        WHERE class_level ILIKE ${mapping.pattern}
        AND class_level != ${mapping.normalized}
      `);

            const count = result.rowCount || 0;
            if (count > 0) {
                console.log(`   ✅ Updated ${count} students from ${mapping.pattern} to ${mapping.normalized}`);
                totalUpdated += count;
            }
        }

        console.log(`\n📊 Total students updated: ${totalUpdated}`);

        // Step 3: Normalize Marks table
        console.log('\n🔧 Step 3: Normalizing test_sessions.class_level...');

        let marksUpdated = 0;
        for (const mapping of classMapping) {
            const result = await db.execute(sql`
        UPDATE test_sessions 
        SET class_level = ${mapping.normalized}
        WHERE class_level ILIKE ${mapping.pattern}
        AND class_level != ${mapping.normalized}
      `);

            const count = result.rowCount || 0;
            if (count > 0) {
                console.log(`   ✅ Updated ${count} test sessions`);
                marksUpdated += count;
            }
        }

        console.log(`📊 Total test sessions updated: ${marksUpdated}`);

        // Step 4: Verify results
        console.log('\n🔍 Step 4: Verifying normalized class names...');

        const verifyClasses = await db.execute(sql`
      SELECT DISTINCT class_level, COUNT(*) as count 
      FROM students 
      GROUP BY class_level 
      ORDER BY class_level
    `);

        console.log('\n✅ Final class formats in database:');
        console.table(verifyClasses.rows);

        // Check for any remaining non-standard formats
        const nonStandardClasses = await db.execute(sql`
      SELECT DISTINCT class_level 
      FROM students 
      WHERE class_level NOT IN ('P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'N1', 'N2', 'N3')
      ORDER BY class_level
    `);

        if (nonStandardClasses.rows.length > 0) {
            console.log('\n⚠️  WARNING: Found non-standard class names that need manual review:');
            console.table(nonStandardClasses.rows);
        } else {
            console.log('\n✅ All class names are now in standard format!');
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`   - Students updated: ${totalUpdated}`);
        console.log(`   - Test sessions updated: ${marksUpdated}`);
        console.log(`   - Total records processed: ${totalUpdated + marksUpdated}`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('\n⚠️  Database state may be inconsistent. Please review and retry.');
        process.exit(1);
    }
}

// Run migration
normalizeClassNames();

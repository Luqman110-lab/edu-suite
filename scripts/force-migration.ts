import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        console.log('Running direct table creation script...');

        // Create teacher_assignments if not exists
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "teacher_assignments" (
        "id" serial PRIMARY KEY NOT NULL,
        "school_id" integer NOT NULL,
        "teacher_id" integer NOT NULL,
        "class_level" text NOT NULL,
        "stream" text,
        "subject" text,
        "role" text NOT NULL,
        "term" integer NOT NULL,
        "year" integer NOT NULL,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
        console.log('teacher_assignments table verified/created.');

        // Create class_streams if not exists
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "class_streams" (
        "id" serial PRIMARY KEY NOT NULL,
        "school_id" integer NOT NULL,
        "class_level" text NOT NULL,
        "stream_name" text NOT NULL,
        "max_capacity" integer DEFAULT 60 NOT NULL,
        "is_active" boolean DEFAULT true,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "class_streams_unique_stream" UNIQUE("school_id","class_level","stream_name")
      );
    `);
        console.log('class_streams table verified/created.');

        try {
            await db.execute(sql`ALTER TABLE "class_streams" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;`);
            console.log('sort_order column added to class_streams.');
        } catch (e: any) {
            console.log('sort_order column already exists or error:', e.message);
        }

        console.log('Migration step completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error applying schema:', error);
        process.exit(1);
    }
}

main();

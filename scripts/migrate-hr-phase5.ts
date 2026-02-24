import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migratePhase5HR() {
    console.log('Starting Phase 5 HR table migrations (Appraisals & Disciplinary)...');

    try {
        // 1. Create teacher_appraisals table
        console.log('Creating teacher_appraisals table...');
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teacher_appraisals (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        appraisal_date TIMESTAMP NOT NULL,
        evaluator_id INTEGER,
        score INTEGER,
        feedback TEXT,
        areas_of_improvement TEXT,
        status TEXT NOT NULL DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS teacher_appraisals_school_idx ON teacher_appraisals(school_id);
      CREATE INDEX IF NOT EXISTS teacher_appraisals_teacher_idx ON teacher_appraisals(teacher_id);
    `);

        // 2. Create teacher_disciplinary_records table
        console.log('Creating teacher_disciplinary_records table...');
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teacher_disciplinary_records (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        incident_date TIMESTAMP NOT NULL,
        incident_description TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open',
        reported_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS teacher_disciplinary_school_idx ON teacher_disciplinary_records(school_id);
      CREATE INDEX IF NOT EXISTS teacher_disciplinary_teacher_idx ON teacher_disciplinary_records(teacher_id);
    `);

        console.log('Phase 5 HR migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migratePhase5HR();

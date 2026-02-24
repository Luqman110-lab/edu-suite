import "dotenv/config";
import { pool } from "../server/db";

async function run() {
    console.log("Creating HR Phase 4 table (Staff Attendance)...");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
      CREATE TABLE IF NOT EXISTS staff_attendance (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        status TEXT NOT NULL,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        remarks TEXT,
        recorded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS staff_attendance_school_idx ON staff_attendance(school_id);
      CREATE INDEX IF NOT EXISTS staff_attendance_teacher_idx ON staff_attendance(teacher_id);
      CREATE INDEX IF NOT EXISTS staff_attendance_date_idx ON staff_attendance(date);
    `);

        await client.query("COMMIT");
        console.log("HR Phase 4 table created successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", err);
    } finally {
        client.release();
    }

    process.exit(0);
}

run();

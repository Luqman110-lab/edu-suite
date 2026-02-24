import "dotenv/config";
import { pool } from "../server/db";

async function run() {
  console.log("Creating HR tables...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_leave (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        leave_type TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        reason TEXT NOT NULL,
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS staff_leave_school_idx ON staff_leave(school_id);
      CREATE INDEX IF NOT EXISTS staff_leave_teacher_idx ON staff_leave(teacher_id);
      
      CREATE TABLE IF NOT EXISTS duty_roster (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        duty_type TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS duty_roster_school_idx ON duty_roster(school_id);
      CREATE INDEX IF NOT EXISTS duty_roster_teacher_idx ON duty_roster(teacher_id);
    `);

    await client.query("COMMIT");
    console.log("HR tables created successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
  }

  process.exit(0);
}

run();

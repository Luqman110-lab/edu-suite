import "dotenv/config";
import { pool } from "../server/db";

async function run() {
    console.log("Creating HR Phase 3 tables (Contracts & Documents)...");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_contracts (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        contract_type TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        base_salary INTEGER,
        status TEXT DEFAULT 'Active',
        document_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS teacher_contracts_school_idx ON teacher_contracts(school_id);
      CREATE INDEX IF NOT EXISTS teacher_contracts_teacher_idx ON teacher_contracts(teacher_id);
      
      CREATE TABLE IF NOT EXISTS teacher_documents (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS teacher_documents_school_idx ON teacher_documents(school_id);
      CREATE INDEX IF NOT EXISTS teacher_documents_teacher_idx ON teacher_documents(teacher_id);
    `);

        await client.query("COMMIT");
        console.log("HR Phase 3 tables created successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Migration failed:", err);
    } finally {
        client.release();
    }

    process.exit(0);
}

run();

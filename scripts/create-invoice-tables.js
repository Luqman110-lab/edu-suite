import { Pool } from 'pg';

async function createInvoiceTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log("Creating invoices table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" serial PRIMARY KEY NOT NULL,
        "school_id" integer REFERENCES "schools"("id") ON DELETE CASCADE,
        "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "invoice_number" text NOT NULL,
        "term" integer NOT NULL,
        "year" integer NOT NULL,
        "total_amount" integer NOT NULL DEFAULT 0,
        "amount_paid" integer NOT NULL DEFAULT 0,
        "balance" integer NOT NULL DEFAULT 0,
        "due_date" text,
        "status" text DEFAULT 'unpaid',
        "notes" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
        console.log("✅ invoices table created");

        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS "invoices_school_idx" ON "invoices" ("school_id");`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "invoices_student_idx" ON "invoices" ("student_id");`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");`);
        console.log("✅ invoices indexes created");

        // Create unique constraint
        await pool.query(`
      DO $$ BEGIN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_invoice_number_unique" 
        UNIQUE ("school_id", "invoice_number");
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
        console.log("✅ invoices unique constraint created");

        console.log("Creating invoice_items table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS "invoice_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "invoice_id" integer NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
        "fee_type" text NOT NULL,
        "description" text,
        "amount" integer NOT NULL DEFAULT 0,
        "created_at" timestamp DEFAULT now()
      );
    `);
        console.log("✅ invoice_items table created");

        await pool.query(`CREATE INDEX IF NOT EXISTS "invoice_items_invoice_idx" ON "invoice_items" ("invoice_id");`);
        console.log("✅ invoice_items indexes created");

        console.log("\n🎉 All invoice tables created successfully!");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createInvoiceTables();

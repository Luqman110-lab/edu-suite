#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function initDatabase() {
    console.log('🔄 Checking database schema...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set!');
        console.error('Please set DATABASE_URL environment variable in Koyeb');
        process.exit(1);
    }

    try {
        console.log('📊 Applying necessary database schema updates...');
        const { Client } = await import('pg');
        const client = new Client({
            connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('sslmode=require') ? '' : '?sslmode=require'),
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();

        const checkRes = await client.query(`
            SELECT 
                EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'marks' AND column_name = 'aggregate') AS marks_ready,
                EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'id_card_config') AS schools_ready,
                EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sickbay_inventory_transactions') AS sickbay_ready
        `);

        const isReady = checkRes.rows[0].marks_ready && checkRes.rows[0].schools_ready && checkRes.rows[0].sickbay_ready;

        if (isReady) {
            console.log('⚡ Schema already up-to-date. Skipping heavy initialization queries for fast boot.');
        } else {
            console.log('📊 Applying necessary base schema updates (first time setup)...');
            await client.query('ALTER TABLE marks ADD COLUMN IF NOT EXISTS aggregate INTEGER DEFAULT 0;');
            await client.query("ALTER TABLE marks ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '';");
            await client.query("ALTER TABLE schools ADD COLUMN IF NOT EXISTS attendance_settings JSONB DEFAULT '{}'::jsonb;");
            await client.query("ALTER TABLE schools ADD COLUMN IF NOT EXISTS archived_years JSONB DEFAULT '[]'::jsonb;");
            await client.query("ALTER TABLE schools ADD COLUMN IF NOT EXISTS security_config JSONB DEFAULT '{}'::jsonb;");
            await client.query("ALTER TABLE schools ADD COLUMN IF NOT EXISTS id_card_config JSONB DEFAULT '{}'::jsonb;");

            // Sickbay Module Tables
            await client.query(`
                CREATE TABLE IF NOT EXISTS medical_records (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER UNIQUE REFERENCES students(id),
                    user_school_id INTEGER UNIQUE REFERENCES user_schools(id),
                    blood_group TEXT,
                    allergies TEXT,
                    pre_existing_conditions TEXT,
                    emergency_contact_name TEXT,
                    emergency_contact_phone TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS sickbay_visits (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    student_id INTEGER REFERENCES students(id),
                    user_school_id INTEGER REFERENCES user_schools(id),
                    visit_date TIMESTAMP NOT NULL DEFAULT NOW(),
                    symptoms TEXT NOT NULL,
                    diagnosis TEXT,
                    treatment_given TEXT,
                    medication_prescribed TEXT,
                    status TEXT NOT NULL DEFAULT 'Admitted',
                    handled_by_user_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS sickbay_inventory (
                    id SERIAL PRIMARY KEY,
                    school_id INTEGER NOT NULL REFERENCES schools(id),
                    item_name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
                    unit_of_measure TEXT NOT NULL,
                    low_stock_threshold INTEGER DEFAULT 10,
                    expiry_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS sickbay_inventory_transactions (
                    id SERIAL PRIMARY KEY,
                    inventory_id INTEGER NOT NULL REFERENCES sickbay_inventory(id),
                    visit_id INTEGER REFERENCES sickbay_visits(id),
                    transaction_type TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    recorded_by_user_id INTEGER REFERENCES users(id),
                    transaction_date TIMESTAMP DEFAULT NOW()
                );
            `);
        }

        await client.end();
        console.log('✅ Base schema columns synced successfully without OOM!');

        // Start the actual server
        console.log('🚀 Starting server...');
        const { spawn } = await import('child_process');
        const path = await import('path');
        const fs = await import('fs');

        // Find tsx executable
        const tsxPath = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');
        const executable = fs.existsSync(tsxPath) ? tsxPath : 'tsx';

        console.log(`Current Working Directory: ${process.cwd()}`);
        console.log(`Using executable: ${executable}`);

        if (fs.existsSync('server/index.ts')) {
            console.log('✅ server/index.ts found');
        } else {
            console.error('❌ server/index.ts NOT found!');
        }

        if (fs.existsSync('node_modules')) {
            console.log('✅ node_modules found');
        } else {
            console.error('❌ node_modules NOT found!');
        }

        const server = spawn(executable, ['server/index.ts'], {
            stdio: 'inherit',
            env: process.env
        });

        server.on('error', (err) => {
            console.error('Failed to start server:', err);
            process.exit(1);
        });

        // Forward child process exit to the main process
        server.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
            process.exit(code || 0);
        });

    } catch (error) {
        console.error('❌ Database schema push failed:', error.message);
        console.log('⚠️  Attempting to start server anyway...');

        // Try to start server even if schema push fails
        // Try to start server even if schema push fails
        const { spawn } = await import('child_process');
        const path = await import('path');
        const fs = await import('fs');

        // Find tsx executable
        const tsxPath = path.resolve(process.cwd(), 'node_modules', '.bin', 'tsx');
        const executable = fs.existsSync(tsxPath) ? tsxPath : 'tsx';

        const server = spawn(executable, ['server/index.ts'], {
            stdio: 'inherit',
            env: process.env
        });

        server.on('error', (err) => {
            console.error('Failed to start server (fallback):', err);
            process.exit(1);
        });

        server.on('close', (code) => {
            console.log(`Fallback server process exited with code ${code}`);
            process.exit(code || 0);
        });
    }
}

initDatabase();

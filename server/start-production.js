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

        await client.query('ALTER TABLE marks ADD COLUMN IF NOT EXISTS aggregate INTEGER DEFAULT 0;');
        await client.query("ALTER TABLE marks ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '';");

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

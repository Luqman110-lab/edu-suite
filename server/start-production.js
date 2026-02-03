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
        console.log('📊 Pushing database schema...');
        const { stdout, stderr } = await execAsync('npx drizzle-kit push');

        if (stderr && !stderr.includes('✓')) {
            console.log('⚠️  Warning:', stderr);
        }

        console.log(stdout);
        console.log('✅ Database schema synced successfully!');

        // Start the actual server
        console.log('🚀 Starting server...');
        const { spawn } = await import('child_process');
        const server = spawn('tsx', ['server/index.ts'], {
            stdio: 'inherit',
            env: process.env
        });

        server.on('error', (err) => {
            console.error('Failed to start server:', err);
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Database schema push failed:', error.message);
        console.log('⚠️  Attempting to start server anyway...');

        // Try to start server even if schema push fails
        const { spawn } = await import('child_process');
        spawn('tsx', ['server/index.ts'], {
            stdio: 'inherit',
            env: process.env
        });
    }
}

initDatabase();

import "dotenv/config";
import { execSync } from "child_process";

// Run Drizzle push with explicit env var to bypass config loading issues
try {
    console.log("Pushing schema to database...");
    execSync(`npx drizzle-kit push`, {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'inherit'
    });
    console.log("Success! Database schema synced.");
} catch (error) {
    console.error("Migration failed:", error);
}

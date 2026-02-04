import { defineConfig } from "drizzle-kit";
import dns from 'dns';

// Force IPv4 DNS resolution to avoid IPv6 issues
dns.setDefaultResultOrder('ipv4first');


if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } as any, // Bypass self-signed/proxy cert issues
  },
});

# Koyeb Deployment Configuration

# Build Settings
BuildCommand: npm install && npm run build
RunCommand: npm start

# The npm start command will:
# 1. Check DATABASE_URL is set
# 2. Push database schema using drizzle-kit
# 3. Start the server with tsx

# Environment Variables Required
# DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
# NODE_ENV=production
# SESSION_SECRET=your-random-secure-secret-here
# PORT=8000

# Notes:
# - The postinstall script in package.json will automatically run db:push
# - This ensures the database schema is synced on every deployment
# - If DB push fails, deployment continues (won't block the build)

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
# Install ALL dependencies (including devDeps) to build the frontend
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend (Vite)
# This creates the 'dist' directory
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server source code
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
# Copy Drizzle config and schema if needed for runtime migrations (optional but good to have)
COPY --from=builder /app/drizzle.config.ts .
# Copy any other necessary config files
COPY --from=builder /app/tsconfig.json .

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

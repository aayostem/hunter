# Build stage - Use Node.js 20 or 22
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies with npm
RUN npm ci

# Generate Prisma client with retry logic
RUN npx prisma generate || (sleep 5 && npx prisma generate)

# Copy source code
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tzdata dumb-init openssl libc6-compat

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/package-lock.json* ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Install production dependencies only
RUN npm ci --only=production

# Copy entrypoint script
COPY --chown=nodejs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=UTC

ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
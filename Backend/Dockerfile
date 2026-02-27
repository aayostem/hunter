FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine
RUN apk add --no-cache tzdata dumb-init openssl libc6-compat
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/package-lock.json* ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=UTC

ENTRYPOINT ["dumb-init", "docker-entrypoint.sh"]
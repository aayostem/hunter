FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci && ls node_modules/.bin/prisma || echo "prisma binary missing"
RUN npm install prisma@5.22.0 --save-dev

COPY . .
RUN node_modules/.bin/prisma generate
RUN npm run build
RUN npm prune --production

# ─── Production ───────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache tzdata dumb-init openssl libc6-compat
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=UTC

ENTRYPOINT ["dumb-init", "docker-entrypoint.sh"]
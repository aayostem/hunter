FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine
RUN apk add --no-cache tzdata dumb-init openssl libc6-compat
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/package-lock.json* ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

RUN npm ci --only=production

RUN printf '#!/bin/sh\nset -e\necho "Running migrations..."\nnpx prisma migrate deploy\necho "Starting server..."\nexec node dist/index.js\n' > /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs
EXPOSE 10000
ENV NODE_ENV=production
ENV PORT=10000
ENV TZ=UTC

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "/usr/local/bin/docker-entrypoint.sh"]
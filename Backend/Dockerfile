# Use Alpine base image
FROM node:18-alpine

# Set production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (skip dev deps in production)
RUN npm ci --only=production

# Copy application code
COPY . .

# Run as non-root user for security
USER node

EXPOSE 3001
CMD ["node", "server.js"]
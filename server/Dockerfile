FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]

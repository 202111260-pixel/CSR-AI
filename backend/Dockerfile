# Production Dockerfile for CSR-AI backend on Railway
FROM node:20-bullseye-slim AS base

# Install OpenSSL (required by Prisma) and CA certificates
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install dependencies (includes devDependencies for the build step) ───────
COPY package.json package-lock.json ./
COPY src/prisma ./src/prisma
RUN npm ci --include=dev

# ── Build TypeScript ─────────────────────────────────────────────────────────
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate --schema=src/prisma/schema.prisma \
 && npm run build

# ── Expose port and start ────────────────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/server.js"]

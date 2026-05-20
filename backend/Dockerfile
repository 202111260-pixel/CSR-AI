FROM node:20-bullseye-slim AS base

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY src/prisma ./src/prisma
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate --schema=src/prisma/schema.prisma \
 && npm run build

ENV NODE_ENV=production
EXPOSE ${PORT:-5000}

CMD npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss && node dist/server.js

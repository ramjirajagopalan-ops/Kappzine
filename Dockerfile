FROM node:22-bookworm-slim AS base

# libvips-dev is not required (sharp ships prebuilt binaries), but a couple
# of base image libraries are needed for @napi-rs/canvas / node-gyp fallback
# paths on some npm versions.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]

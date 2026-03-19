# ── Stage 1: Install dependencies ──
FROM node:20-slim AS deps

WORKDIR /app

# Puppeteer needs these to download Chromium during npm install
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ──
FROM node:20-slim

# System libs required by Chromium (bundled by Puppeteer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules (includes Puppeteer's Chromium binary)
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]

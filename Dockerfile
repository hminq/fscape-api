# Stage 1: Install dependencies
FROM node:22-slim AS deps

WORKDIR /app

# Set Puppeteer cache directory
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

# Install certificates and wget for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies (production only)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 2: Production image
FROM node:22-slim

WORKDIR /app

# Set environment variables for runtime
ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer
ENV NODE_ENV=production

# Install system dependencies for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
    libx11-xcb1 \
    libxcursor1 \
    libxext6 \
    libxi6 \
    libxtst6 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules and Puppeteer cache from Stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /root/.cache/puppeteer /root/.cache/puppeteer

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
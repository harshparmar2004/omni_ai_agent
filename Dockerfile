# OmniStudio v7 — Production Google Cloud Run Dockerfile
# Zero cold-start, multi-tier container with pre-baked FFmpeg, Cloudflared, and yt-dlp
FROM node:22-bookworm-slim

# 1. Install system utilities: Python 3, FFmpeg, curl, and build tools for SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Pre-install native Cloudflared binary directly into /usr/local/bin
RUN curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared \
    && chmod +x /usr/local/bin/cloudflared \
    && cloudflared --version

# 3. Pre-install high-speed Python media stream downloaders & Playwright headless Chromium
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp requests playwright \
    && python3 -m playwright install --with-deps chromium

WORKDIR /app

# 4. Install Node dependencies with optimal layer caching
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --no-fund

# 5. Copy full codebase into container
COPY . .

# 6. Ensure runtime persistence directories exist (supports persistent volume mount at /data)
RUN mkdir -p /data data public/generated/downloads public/generated/assets public/generated/carousels

# Default port and persistent volume directory
ENV PORT=4000
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 4000

# Start OmniStudio 24/7 Autonomous Engine
CMD ["node", "server.js"]

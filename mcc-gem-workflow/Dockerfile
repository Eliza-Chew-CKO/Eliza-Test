# Python base from Docker Hub — automatically rewritten to ECR pull-through cache
FROM python:3.12-slim

WORKDIR /app

# ── CodeArtifact pip proxy (required by the sandbox build environment) ──────
# These ARGs must appear before any pip install command.
ARG CODEARTIFACT_AUTH_TOKEN
ARG PIP_INDEX_URL

# ── System dependencies + Chromium ──────────────────────────────────────────
# Install Chromium from Debian repos so no internet download is needed at
# runtime. playwright install chromium is skipped (see ENV below).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
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
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ─────────────────────────────────────────────────────────
COPY . .

# ── Playwright: skip browser download, point to system Chromium ──────────────
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# ── Runtime config ────────────────────────────────────────────────────────────
# /data is the sandbox EFS persistent volume — browser profile lives here
# so Google auth survives container restarts and redeployments.
ENV BROWSER_PROFILE_DIR=/data/browser-profile
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

RUN mkdir -p /data/browser-profile

EXPOSE 3000

# Exec form — required for proper SIGTERM handling on ECS task stop
CMD ["python", "app.py"]

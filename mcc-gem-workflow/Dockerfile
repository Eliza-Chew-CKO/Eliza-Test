# Use the official Playwright Python image — Chromium + system deps pre-installed
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium browser (already available in the base image,
# but this ensures the right version is registered with Playwright)
RUN playwright install chromium

# Copy application code
COPY . .

# Create directory for browser profile (mounted as a volume in production
# so Google auth persists across container restarts)
RUN mkdir -p /app/browser-profile

# Environment defaults
ENV BROWSER_PROFILE_DIR=/app/browser-profile
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Expose port 3000 as required by the platform
EXPOSE 3000

# Exec form — required for proper signal handling (SIGTERM on ECS task stop)
CMD ["python", "app.py"]

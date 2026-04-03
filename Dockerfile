# Combined production Dockerfile for Cloud Run
# Builds the Vite frontend, copies into the FastAPI backend as static files

# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npm run fetch-ephemeris && npm run build

# Stage 2: Production backend + static files
FROM python:3.12-slim

WORKDIR /app

# Install ffmpeg and yt-dlp for live feed capture
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    pip install --no-cache-dir yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend into backend/static/
COPY --from=frontend-build /frontend/dist ./static/

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD uvicorn main:app --host 0.0.0.0 --port $PORT

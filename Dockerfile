# --- Stage 1: Build Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Final Backend Image ---
FROM python:3.10-slim
WORKDIR /app

# Install System Dependencies
# libgl1-mesa-glx and libglib2.0-0 are for OpenCV
# tesseract-ocr and poppler-utils for the OCR engine
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-mal \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy Backend Requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Project Structure
COPY backend/ ./backend/
COPY core/ ./core/
COPY voter_vault/ ./voter_vault/
COPY assets/ ./assets/
COPY server.py .

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create necessary directories for runtime
RUN mkdir -p data/raw_pdf data/page_images data/voter_crops data/party_symbols

# Environment Variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Metadata
EXPOSE 8000

# Start Command
CMD ["python", "server.py"]

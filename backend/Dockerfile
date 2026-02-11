FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (gcc for C extensions, plus libs for PDF/OCR/WeasyPrint)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libffi-dev libcairo2 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port
EXPOSE 8000

# Render injects PORT env var dynamically — must use shell form for variable expansion
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}

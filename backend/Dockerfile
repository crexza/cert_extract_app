# --- BACKEND DOCKERFILE ---
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the Python path variable so module imports resolve correctly from the workspace root
ENV PYTHONPATH=/app

WORKDIR /app

# Install system-level dependencies for cryptography/PDF processing
# Clean up apt caches in the same layer to keep the build image light
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies separately to utilize Docker layer caching efficiencies
# Since the Dockerfile sits inside /backend, COPY handles context locally
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the exact source files from the local directory into the container environment
COPY . .

# Expose production-ready internal ports to network bridges
EXPOSE 8000

# Start the application pointing to the exact path where app = FastAPI() exists
# Layout translates module structure to: app (folder) -> main (file) -> app (variable)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
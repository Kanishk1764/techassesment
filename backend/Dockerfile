FROM python:3.10-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=4000 \
    DATABASE_URL="sqlite:////app/data/dev.db"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/
COPY main.py .

# Persistent SQLite directory
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["python", "main.py"]

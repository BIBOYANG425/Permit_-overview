FROM python:3.11-slim

WORKDIR /app

# Copy everything first, then install (hatchling needs source to build)
COPY . .
RUN pip install --no-cache-dir .

EXPOSE 8080

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]

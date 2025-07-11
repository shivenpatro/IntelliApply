# Use an official Python runtime as a parent image
FROM python:3.12

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install any needed packages specified in requirements.txt
# Use --no-cache-dir to reduce image size
# Use --trusted-host pypi.python.org to avoid SSL issues in some environments
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --upgrade setuptools wheel Cython && \
    pip install --no-cache-dir --trusted-host pypi.python.org --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code into the container at /app
# This includes your 'app' directory, etc.
COPY . .

# Make port 80 available to the world outside this container
# (Render will map this to its own $PORT, which Uvicorn will use)
EXPOSE 8080

# Define environment variable for the port (Render often sets this, Uvicorn will use it)
# Default to 80 if not set by the platform.
# ENV PORT 80 # Koyeb will provide the PORT environment variable.

# Run uvicorn when the container launches.
# Bind to 0.0.0.0 to be accessible from outside the container.
# Use the PORT environment variable provided by the platform (e.g., Koyeb), default to 8080 if not set.
# --workers 1 is a good default for many PaaS free/hobby tiers.
# --forwarded-allow-ips='*' is important if running behind a reverse proxy (common on PaaS)
# Using sh -c to ensure environment variable substitution for $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --forwarded-allow-ips '*'"]

# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Use --no-cache-dir to reduce image size
# Use --trusted-host pypi.python.org to avoid SSL issues in some environments
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --trusted-host pypi.python.org -r requirements.txt

# Copy the rest of the backend application code into the container at /app
# This includes your 'app' directory, etc.
COPY . .

# Make port 80 available to the world outside this container
# (Render will map this to its own $PORT, which Uvicorn will use)
EXPOSE 80

# Define environment variable for the port (Render often sets this, Uvicorn will use it)
# Default to 80 if not set by the platform.
ENV PORT 80

# Run uvicorn when the container launches.
# Bind to 0.0.0.0 to be accessible from outside the container.
# Use $PORT environment variable.
# --workers 1 is a good default for many PaaS free/hobby tiers.
# --forwarded-allow-ips='*' is important if running behind a reverse proxy (common on PaaS)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80", "--forwarded-allow-ips", "*"]

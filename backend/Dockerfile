FROM python:3.12.14-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# Wheels in the reviewed lockfile include the required native libraries.
COPY --chmod=644 requirements.lock .
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export PIP_CERT=/run/secrets/build_ca; fi; \
    python -m pip install --no-cache-dir --require-hashes -r requirements.lock \
    && useradd --create-home --uid 10001 appuser

# Copy only runtime and migration sources. No local environment or test data.
COPY --chmod=755 app ./app
COPY --chmod=755 migrations ./migrations
COPY --chmod=644 alembic.ini .
USER appuser
EXPOSE 8080

# Migrations are an explicit release step, never an automatic startup mutation.
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

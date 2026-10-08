from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool  # Import QueuePool

from app.core.config import settings

# Configure engine with connection pooling options
engine = create_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1).replace(
        "postgres://", "postgresql+psycopg2://", 1
    ),
    poolclass=QueuePool,  # Use QueuePool
    pool_size=settings.DB_POOL_SIZE,  # Increase pool size (default is 5)
    max_overflow=settings.DB_MAX_OVERFLOW,  # Allow temporary overflow
    pool_timeout=10,
    pool_recycle=1800,  # Recycle connections every 30 minutes (adjust as needed)
    pool_pre_ping=True,  # Add pre-ping to check connection liveness
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

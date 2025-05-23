from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool # Import QueuePool

from app.core.config import settings

# Configure engine with connection pooling options
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool, # Use QueuePool
    pool_size=10,        # Increase pool size (default is 5)
    max_overflow=5,      # Allow temporary overflow
    pool_recycle=1800,   # Recycle connections every 30 minutes (adjust as needed)
    pool_pre_ping=True   # Add pre-ping to check connection liveness
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

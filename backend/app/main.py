from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all routers
from app.api import profile, jobs, auth
from app.core.config import settings
from app.db.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="IntelliApply API",
    description="API for IntelliApply - an AI-powered job application assistant",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix='/api/auth', tags=['Authentication']) # Add auth router
app.include_router(profile.router, prefix='/api/profile', tags=['User Profile'])
app.include_router(jobs.router, prefix='/api/jobs', tags=['Jobs'])

@app.get("/")
async def root():
    return {"message": "Welcome to IntelliApply API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

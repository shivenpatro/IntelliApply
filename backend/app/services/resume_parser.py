import os
import PyPDF2
import docx
import re
from sqlalchemy.orm import Session

from app.db.models import Profile, Skill, Experience

# Removed spaCy dependency for testing

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file"""
    text = ""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(docx_path):
    """Extract text from a DOCX file"""
    doc = docx.Document(docx_path)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_from_resume(file_path):
    """Extract text from a resume file (PDF or DOCX)"""
    file_extension = file_path.split('.')[-1].lower()
    
    if file_extension == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_extension == "docx":
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")

def extract_skills(text):
    """Extract skills from resume text - simplified version without spaCy"""
    # Common skill keywords to look for
    common_skills = [
        "python", "java", "javascript", "react", "angular", "vue", "node", "express",
        "django", "flask", "fastapi", "spring", "hibernate", "docker", "kubernetes",
        "aws", "azure", "gcp", "sql", "mysql", "postgresql", "mongodb", "nosql",
        "html", "css", "sass", "less", "bootstrap", "tailwind", "jquery", "ajax"
    ]
    
    found_skills = set()
    
    # Create a pattern to match common skills (case insensitive)
    pattern = r'\b(' + '|'.join(common_skills) + r')\b'
    matches = re.finditer(pattern, text.lower())
    
    for match in matches:
        found_skills.add(match.group(0))
    
    return list(found_skills)

def extract_experiences(text):
    """Extract work experiences from resume text - simplified version without spaCy"""
    experiences = []
    
    # Simple pattern to match job titles and companies
    job_patterns = [
        r'(?i)(\b(?:senior|junior|lead|staff|principal|associate)?\s?\w+\s?(?:developer|engineer|designer|architect|analyst|manager|director|consultant|specialist))\s+(?:at|@|,|-)\s+([A-Za-z0-9\s&]+)'
    ]
    
    for pattern in job_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            if len(match.groups()) >= 2:
                title = match.group(1).strip()
                company = match.group(2).strip()
                
                # Basic experience object
                exp = {
                    "title": title,
                    "company": company,
                    "description": ""
                }
                
                experiences.append(exp)
    
    return experiences

async def parse_resume(file_path, profile_id, db: Session):
    """Parse a resume and store the extracted information - simplified version without spaCy"""
    try:
        # Get the profile
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            print(f"Profile {profile_id} not found")
            return
        
        # Extract text from resume
        text = extract_text_from_resume(file_path)
        
        # Extract skills and save to database
        skills = extract_skills(text)
        for skill_name in skills:
            # Check if skill already exists
            existing_skill = db.query(Skill).filter(
                Skill.profile_id == profile_id,
                Skill.name == skill_name
            ).first()
            
            if not existing_skill:
                skill = Skill(name=skill_name, profile_id=profile_id)
                db.add(skill)
        
        # Extract experiences and save to database
        experiences = extract_experiences(text)
        for exp_data in experiences:
            experience = Experience(
                profile_id=profile_id,
                title=exp_data["title"],
                company=exp_data["company"],
                description=exp_data["description"]
            )
            db.add(experience)
        
        # Basic name extraction from filename (fallback)
        filename = os.path.basename(file_path)
        if not profile.first_name and "_" in filename:
            name_parts = filename.split("_")
            if len(name_parts) >= 2:
                profile.first_name = name_parts[0]
                profile.last_name = name_parts[1].split('.')[0]
        
        db.commit()
        print(f"Resume parsing completed for profile {profile_id}")
        
    except Exception as e:
        print(f"Error parsing resume: {str(e)}")
        db.rollback()

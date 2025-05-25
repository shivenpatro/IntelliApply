import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Add the backend directory to sys.path to allow importing app.core.config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.core.config import settings
    print("Successfully imported settings from app.core.config")
    print(f"DATABASE_URL from settings: {settings.DATABASE_URL}")
except ImportError as e:
    print(f"Error importing settings: {e}")
    print("Please ensure backend/app/core/config.py is correct and backend/.env is being loaded.")
    sys.exit(1)
except AttributeError:
    print("Error: 'settings' object does not have DATABASE_URL attribute or settings failed to load.")
    sys.exit(1)

def test_sqlalchemy_connection():
    print(f"\nAttempting to connect to database: {settings.DATABASE_URL}")
    try:
        engine = create_engine(settings.DATABASE_URL, connect_args={"sslmode": "prefer"})
        
        with engine.connect() as connection:
            print("Successfully created a connection using SQLAlchemy engine.")
            
            # Test with a simple query
            result = connection.execute(text("SELECT 1"))
            for row in result:
                print(f"Query 'SELECT 1' returned: {row[0]}")
            
            print("Database connection via SQLAlchemy appears to be working correctly!")
            return True

    except OperationalError as e:
        print(f"SQLAlchemy OperationalError: {e}")
        print("This often indicates issues with database server address, port, credentials, or network connectivity/firewall.")
        if "password authentication failed" in str(e).lower():
            print("Hint: Check your database password in the DATABASE_URL.")
        elif "timeout" in str(e).lower():
            print("Hint: Connection timed out. Check network, firewall, or if the DB server is reachable.")
        return False
    except SQLAlchemyError as e:
        print(f"SQLAlchemy Error: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    test_sqlalchemy_connection()

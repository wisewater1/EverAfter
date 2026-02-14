import sys
import sqlalchemy
try:
    import psycopg
    print(f"psycopg version: {psycopg.__version__}")
except ImportError:
    print("psycopg NOT installed")

print(f"SQLAlchemy version: {sqlalchemy.__version__}")
print(f"Python version: {sys.version}")

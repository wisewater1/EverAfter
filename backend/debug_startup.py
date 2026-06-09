import traceback
import sys
import os

# Add the backend directory to sys.path to ensure imports work correctly
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
sys.path.insert(0, '.')

try:
    print("Attempting to import app.main...")
    from app.main import app
    print("Successfully imported app.")
except Exception:
    print("FAILED to import app. See traceback below:")
    traceback.print_exc()

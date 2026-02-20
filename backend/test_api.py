from fastapi.testclient import TestClient
import sys
import os

# Ensure app is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

client = TestClient(app)

def test_api():
    print("Testing API locally via TestClient...")
    
    # Test Health
    try:
        resp = client.get("/health")
        print(f"GET /health: {resp.status_code}")
        if resp.status_code != 200:
            print(f"Health check failed: {resp.text}")
        else:
            print("Health check OK.")
    except Exception as e:
        print(f"GET /health FAILED: {e}")

    # Test Finance (Expect 401)
    print("Testing Finance Endpoint...")
    try:
        resp = client.get("/api/v1/finance/transactions")
        print(f"GET /api/v1/finance/transactions: {resp.status_code}")
        if resp.status_code == 401:
            print("Success! Endpoint exists and requires auth.")
        elif resp.status_code == 404:
            print("FAILURE: Endpoint not found (404). Router not mounted?")
        elif resp.status_code == 200:
            print("WARNING: Endpoint accessible without auth (UNEXPECTED).")
        else:
            print(f"Unexpected status: {resp.status_code}")
    except Exception as e:
        print(f"GET /finance FAILED: {e}")

if __name__ == "__main__":
    test_api()

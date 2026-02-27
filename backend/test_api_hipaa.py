import asyncio
import httpx
from termcolor import colored
from app.auth.jwt import create_access_token

async def test_api():
    base_url = "http://127.0.0.1:8001"
    
    # 1. Create a valid mock token for a test user
    test_user_id = "11111111-2222-3333-4444-555555555555"
    token = create_access_token({"sub": test_user_id})
    headers = {"Authorization": f"Bearer {token}"}
    
    print(colored(f"Generated JWT for user: {test_user_id}", "cyan"))
    
    async with httpx.AsyncClient() as client:
        # Test HIPAA Report Endpoint
        print(colored("\n--- Testing GET /api/v1/integrity/hipaa-report ---", "yellow"))
        res1 = await client.get(f"{base_url}/api/v1/integrity/hipaa-report", headers=headers)
        
        if res1.status_code == 200:
            print(colored("[PASS] 200 OK", "green"))
            print(res1.json())
        else:
            print(colored(f"[FAIL] {res1.status_code}: {res1.text}", "red"))

        # Test Access Log Endpoint
        print(colored("\n--- Testing GET /api/v1/integrity/hipaa-access-log ---", "yellow"))
        res2 = await client.get(f"{base_url}/api/v1/integrity/hipaa-access-log", headers=headers)
        
        if res2.status_code == 200:
            print(colored("[PASS] 200 OK", "green"))
            print(res2.json())
        else:
            print(colored(f"[FAIL] {res2.status_code}: {res2.text}", "red"))

if __name__ == "__main__":
    asyncio.run(test_api())


import asyncio
import httpx
import uuid

async def test():
    user_id = "00000000-0000-0000-0000-000000000000" # Dummy UUID
    base_url = "http://localhost:8002/api/v1"
    
    print(f"Testing {base_url}/saints/status...")
    try:
        async with httpx.AsyncClient() as client:
            # We need a token normally, but let's see if we can get a 401 or 500
            # If we get 401, the route exists. If we get 500, we found the bug.
            response = await client.get(f"{base_url}/saints/status")
            print(f"Status: {response.status_code}")
            print(f"Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())

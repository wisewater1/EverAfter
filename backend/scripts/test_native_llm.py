import asyncio
import os
from app.ai.llm_client import LLMClient

async def test_native_llm():
    print("Initializing LLMClient...")
    client = LLMClient()
    
    messages = [{"role": "user", "content": "Hello! Are you running natively?"}]
    
    print("Requesting response (Native primary)...")
    try:
        response = await client.generate_response(messages)
        print("\n--- Response ---")
        print(response)
        print("----------------")
        
        if "[NATIVE]" in response:
            print("\nSUCCESS: Native generation confirmed.")
        else:
            print("\nWARNING: Fallback detected. Check logs.")
            
    except Exception as e:
        print(f"\nERROR during native test: {e}")

if __name__ == "__main__":
    # Ensure PYTHONPATH is correct
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(test_native_llm())

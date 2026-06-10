import asyncio
import sys
import uvicorn

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    # Verify loop type
    loop = asyncio.new_event_loop()
    print(f"DEBUG: Initialized loop type: {type(loop)}")
    loop.close()
    
    print("====================================================")
    print("EVERAFTER BACKEND STARTING ON PORT 8001 (STABLE)")
    print("====================================================")
    
    uvicorn.run(
        'app.main:app',
        host='0.0.0.0',
        port=8001,
        reload=False,
        loop='asyncio'
    )

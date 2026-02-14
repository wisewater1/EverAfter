import asyncio
import sys
import logging

# MUST be first for Windows psycopg/sqlalchemy async
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("====================================================")
    print("EVERAFTER BACKEND STARTING ON PORT 8001 (FORCED)")
    print("====================================================")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")

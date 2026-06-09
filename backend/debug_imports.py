import sys
import os
import time

# Mock Windows loop policy if needed
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

modules = [
    'app.core.config',
    'app.db.session',
    'app.api.engrams',
    'app.api.chat',
    'app.api.tasks',
    'app.api.social',
    'app.api.saints',
    'app.services.saint_runtime.core',
    'app.services.oasis_service',
    'app.services.interaction_service'
]

for mod in modules:
    print(f"Importing {mod}...", flush=True)
    start = time.time()
    try:
        __import__(mod)
        print(f"DONE in {time.time() - start:.2f}s", flush=True)
    except Exception as e:
        print(f"FAILED: {e}", flush=True)

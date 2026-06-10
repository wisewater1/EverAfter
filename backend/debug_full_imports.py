import sys
import os
import time

print("DEBUG: Starting full import trace...", flush=True)

import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

modules = [
    'app.core.config',
    'app.auth.middleware',
    'app.api.engrams',
    'app.api.chat',
    'app.api.tasks',
    'app.api.autonomous_tasks',
    'app.api.personality',
    'app.api.health',
    'app.api.social',
    'app.api.saints',
    'app.api.finance',
    'app.api.monitoring',
    'app.api.akashic',
    'app.api.council',
    'app.api.time_capsule',
    'app.api.rituals',
    'app.api.sacred_state',
    'app.api.integrity',
    'app.api.marketplace_assets',
    'app.api.causal_twin',
    'app.api.integration',
    'app.api.health_predictions',
    'app.api.media_uploads',
    'app.api.personality_quiz',
    'app.api.family_home',
    'app.api.endpoints.audit'
]

for mod in modules:
    print(f"DEBUG: Importing {mod}...", flush=True)
    start = time.time()
    try:
        __import__(mod)
        print(f"DEBUG: SUCCESS: {mod} (took {time.time() - start:.2f}s)", flush=True)
    except Exception as e:
        print(f"DEBUG: FAILED: {mod} with error: {e}", flush=True)

print("DEBUG: Full trace complete.", flush=True)

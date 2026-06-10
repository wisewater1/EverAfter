import sys
import os
import time

print("DEBUG: Starting granular import trace...", flush=True)

# Test torch/cuda first as it's a known hang point
print("DEBUG: Checking torch and CUDA...", flush=True)
try:
    import torch
    print(f"DEBUG: Torch version: {torch.__version__}", flush=True)
    start = time.time()
    cuda_available = torch.cuda.is_available()
    print(f"DEBUG: CUDA available: {cuda_available} (took {time.time() - start:.2f}s)", flush=True)
except Exception as e:
    print(f"DEBUG: Torch/CUDA check failed: {e}", flush=True)

import asyncio
if sys.platform == 'win32':
    print("DEBUG: Setting event loop policy...", flush=True)
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def trace_import(mod_name):
    print(f"DEBUG: Attempting to import {mod_name}...", flush=True)
    start = time.time()
    try:
        __import__(mod_name)
        print(f"DEBUG: SUCCESS: {mod_name} (took {time.time() - start:.2f}s)", flush=True)
    except Exception as e:
        print(f"DEBUG: FAILED: {mod_name} with error: {e}", flush=True)

trace_import('app.core.config')
trace_import('app.db.session')
trace_import('app.services.embeddings')
trace_import('app.services.personality_synthesizer')
trace_import('app.services.mentorship_service')
trace_import('app.services.saint_runtime')
trace_import('app.api.engrams')

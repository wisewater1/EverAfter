import asyncio
import sys

print(f"Platform: {sys.platform}")
policy = asyncio.get_event_loop_policy()
print(f"Current policy: {type(policy).__name__}")

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    new_policy = asyncio.get_event_loop_policy()
    print(f"New policy: {type(new_policy).__name__}")

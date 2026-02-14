import asyncio
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import select

# Add parent directory to path
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.agent import AgentTaskQueue
from app.models.engram import Engram
from app.core.config import settings

async def test_scheduler():
    print(f"DEBUG: DATABASE_URL starts with: {settings.DATABASE_URL[:25]}...")
    print(f"DEBUG: DATABASE_URL contains pooler? {'pooler' in settings.DATABASE_URL}")
    print("Starting scheduler test...")
    async with AsyncSessionLocal() as session:
        # 1. Get a valid user/engram or create dummy
        result = await session.execute(select(Engram).limit(1))
        engram = result.scalar_one_or_none()
        
        if not engram:
            # Try to get a valid user from profiles table
            from sqlalchemy import text
            result = await session.execute(text("SELECT id FROM profiles LIMIT 1"))
            user_row = result.fetchone()
            
            if user_row:
                user_id = user_row[0]
                print(f"Found existing user: {user_id}")
            else:
                print("No user found in profiles. Cannot create task.")
                return

            engram = Engram(
                user_id=user_id,
                name="Test Engram"
            )
            session.add(engram)
            await session.commit()
            print(f"Created dummy engram: {engram.id}")

        user_id = engram.user_id
        engram_id = engram.id

        # 2. Create a task scheduled in the past
        task_id = uuid4()
        task = AgentTaskQueue(
            id=task_id,
            engram_id=engram_id,
            user_id=user_id,
            task_type="health_reminder",
            task_title="Test Health Task",
            task_description="Testing scheduler functionality",
            priority="high",
            status="pending",
            scheduled_for=datetime.utcnow() - timedelta(minutes=1),
            execution_config={"health_category": "hydration"}
        )
        
        session.add(task)
        await session.commit()
        print(f"Created task {task_id} with status: PENDING")

        # 3. Poll for completion
        print("Waiting for worker to pick up task...")
        for i in range(15):
            await asyncio.sleep(2)
            await session.refresh(task)
            print(f"Time {i*2}s: Task status = {task.status}")
            
            if task.status in ['completed', 'failed']:
                print(f"Task finished with status: {task.status}")
                if task.status == 'failed':
                    print(f"Error: {task.error_message}")
                return
            
            # Re-query to strictly ensure fresh data if refresh behaves oddly
            result = await session.execute(select(AgentTaskQueue).where(AgentTaskQueue.id == task_id))
            task = result.scalar_one_or_none()

        print("Timeout: Task was not processed within 30 seconds.")

if __name__ == "__main__":
    # Windows selector event loop policy fix
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    try:
        asyncio.run(test_scheduler())
    except Exception as e:
        import traceback
        with open("scheduler_error_final.txt", "w") as f:
            f.write(traceback.format_exc())
        print("Error written to scheduler_error_final.txt")

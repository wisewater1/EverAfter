import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.agent import AgentTaskQueue
from app.services.task_executor import TaskExecutor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaskWorker:
    """Background worker for processing autonomous tasks"""

    def __init__(self):
        self.is_running = False
        self.poll_interval = 5  # seconds

    async def start(self):
        """Start the background worker"""
        self.is_running = True
        logger.info("Task worker started")

        while self.is_running:
            try:
                await self.process_pending_tasks()
                await asyncio.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"Error in task worker: {e}")
                await asyncio.sleep(self.poll_interval)

    async def stop(self):
        """Stop the background worker"""
        self.is_running = False
        logger.info("Task worker stopped")

    async def process_pending_tasks(self):
        """Process all pending tasks"""
        async with AsyncSessionLocal() as session:
            # Get pending tasks that are scheduled
            query = select(AgentTaskQueue).where(
                AgentTaskQueue.status == 'pending',
                AgentTaskQueue.scheduled_for <= datetime.utcnow()
            ).order_by(
                AgentTaskQueue.priority.desc(),
                AgentTaskQueue.scheduled_for.asc()
            ).limit(10)

            result = await session.execute(query)
            tasks = result.scalars().all()

            logger.info(f"Found {len(tasks)} pending tasks to process")

            for task in tasks:
                try:
                    await self.execute_task(session, task)
                except Exception as e:
                    logger.error(f"Error executing task {task.id}: {e}")

    async def execute_task(self, session: AsyncSession, task: AgentTaskQueue):
        """Execute a single task"""
        logger.info(f"Executing task {task.id}: {task.task_title}")

        # Check if credentials are needed
        if task.requires_credentials and not task.credential_ids:
            await self.request_credentials(session, task)
            return

        executor = TaskExecutor(session)

        try:
            result = await executor.execute_task(str(task.id))
            logger.info(f"Task {task.id} completed successfully")
        except Exception as e:
            logger.error(f"Task {task.id} failed: {e}")

    async def request_credentials(self, session: AsyncSession, task: AgentTaskQueue):
        """Request credentials from user"""
        from app.models.agent import CredentialRequest

        # Create credential request
        credential_request = CredentialRequest(
            task_id=task.id,
            user_id=task.user_id,
            engram_id=task.engram_id,
            credential_type='health_portal',  # Inferred from task type
            service_name=self._get_service_name(task),
            purpose=f"Required to complete: {task.task_title}",
            ai_reasoning=f"I need access to {self._get_service_name(task)} to {task.task_description}",
            expires_at=datetime.utcnow()
        )

        session.add(credential_request)

        # Update task status
        task.status = 'awaiting_credentials'
        await session.commit()

        logger.info(f"Credential request created for task {task.id}")

    def _get_service_name(self, task: AgentTaskQueue) -> str:
        """Get service name based on task type"""
        service_map = {
            'doctor_appointment': 'Patient Portal',
            'prescription_refill': 'Pharmacy Account',
            'lab_results': 'Lab Results Portal',
            'insurance_claim': 'Insurance Portal'
        }
        return service_map.get(task.task_type, 'Health Service')


# Global worker instance
worker = TaskWorker()


async def start_worker():
    """Start the background task worker"""
    await worker.start()


async def stop_worker():
    """Stop the background task worker"""
    await worker.stop()


if __name__ == "__main__":
    # Run worker standalone
    asyncio.run(start_worker())

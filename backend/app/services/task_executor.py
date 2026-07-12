import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import json


# Task types whose real-world integrations (scheduling portals, pharmacy
# systems, clinical portals, outbound email) are NOT built yet. EverAfter
# never fabricates a completed real-world action: these are declined with an
# honest, user-facing explanation instead of invented confirmation numbers.
UNSUPPORTED_REAL_WORLD_TASKS = {
    'doctor_appointment': 'booking medical appointments with a provider',
    'prescription_refill': 'submitting pharmacy refill requests',
    'lab_results': 'retrieving lab results from a clinical portal',
    'email_send': 'sending email on your behalf',
}


class TaskExecutor:
    """Autonomous task execution engine for AI agents"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def execute_task(self, task_id: str) -> Dict[str, Any]:
        """Execute a single task autonomously"""
        from app.models.agent import AgentTaskQueue, AgentTaskExecution

        # Get task
        task_query = select(AgentTaskQueue).where(AgentTaskQueue.id == task_id)
        result = await self.session.execute(task_query)
        task = result.scalar_one_or_none()

        if not task:
            raise ValueError(f"Task {task_id} not found")

        # Real-world integrations that do not exist are declined honestly —
        # never simulated into a fake "completed" state.
        if task.task_type in UNSUPPORTED_REAL_WORLD_TASKS or task.task_type not in ('health_reminder',):
            capability = UNSUPPORTED_REAL_WORLD_TASKS.get(
                task.task_type, 'autonomously executing this kind of real-world task'
            )
            message = (
                f"EverAfter can't complete this yet: {capability} isn't connected to a "
                "real integration. Nothing was booked, submitted, or sent. This task "
                "type will activate once the real integration ships."
            )
            task.status = 'failed'
            task.error_message = message
            task.retry_count = task.max_retries  # honest terminal state; retries won't help
            task.completed_at = datetime.utcnow()
            task.result = {
                "success": False,
                "status": "integration_not_available",
                "message": message,
            }
            await self.session.commit()
            return task.result

        # Update status to in_progress
        task.status = 'in_progress'
        task.started_at = datetime.utcnow()
        await self.session.commit()

        try:
            result = await self._execute_health_reminder(task)

            # Mark as completed
            task.status = 'completed'
            task.completed_at = datetime.utcnow()
            task.completion_percentage = 100
            task.result = result
            await self.session.commit()

            return result

        except Exception as e:
            # Mark as failed
            task.status = 'failed'
            task.error_message = str(e)
            task.retry_count += 1

            if task.retry_count < task.max_retries:
                task.status = 'pending'
                task.last_retry_at = datetime.utcnow()

            await self.session.commit()
            raise

    async def _execute_health_reminder(self, task) -> Dict[str, Any]:
        """Execute health reminder task"""
        from app.models.agent import AgentNotification

        config = task.execution_config or {}

        # Create notification
        notification = AgentNotification(
            user_id=task.user_id,
            engram_id=task.engram_id,
            task_id=task.id,
            notification_type='health_reminder',
            title=task.task_title,
            message=task.task_description,
            priority=task.priority,
            health_category=config.get('health_category'),
            is_actionable=True
        )

        self.session.add(notification)
        await self.session.commit()

        return {
            "success": True,
            "reminder_sent": True,
            "notification_id": str(notification.id)
        }

    async def _log_execution_step(
        self,
        task_id: str,
        step_name: str,
        step_order: int,
        description: str,
        status: str,
        result: Optional[Dict] = None
    ):
        """Log execution step to database"""
        from app.models.agent import AgentTaskExecution

        execution = AgentTaskExecution(
            task_id=task_id,
            execution_step=step_name,
            step_order=step_order,
            step_description=description,
            status=status,
            step_result=result,
            started_at=datetime.utcnow()
        )

        if status == 'completed':
            execution.completed_at = datetime.utcnow()

        self.session.add(execution)
        await self.session.commit()

    async def _update_task_progress(self, task_id: str, percentage: int):
        """Update task progress percentage"""
        from app.models.agent import AgentTaskQueue

        stmt = update(AgentTaskQueue).where(
            AgentTaskQueue.id == task_id
        ).values(completion_percentage=percentage)

        await self.session.execute(stmt)
        await self.session.commit()

    async def _log_email_send(self, task, email_data: Dict):
        """Log email sending attempt"""
        from app.models.agent import AgentEmailLog

        email_log = AgentEmailLog(
            task_id=task.id,
            user_id=task.user_id,
            engram_id=task.engram_id,
            to_addresses=email_data["to"],
            cc_addresses=email_data.get("cc", []),
            subject=email_data["subject"],
            body_text=email_data["body"],
            email_purpose=task.task_title,
            status='sent',
            sent_at=datetime.utcnow()
        )

        self.session.add(email_log)
        await self.session.commit()

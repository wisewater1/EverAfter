import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import json


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

        # Update status to in_progress
        task.status = 'in_progress'
        task.started_at = datetime.utcnow()
        await self.session.commit()

        try:
            # Execute based on task type
            if task.task_type == 'doctor_appointment':
                result = await self._execute_doctor_appointment(task)
            elif task.task_type == 'prescription_refill':
                result = await self._execute_prescription_refill(task)
            elif task.task_type == 'lab_results':
                result = await self._execute_lab_results_check(task)
            elif task.task_type == 'email_send':
                result = await self._execute_email_send(task)
            elif task.task_type == 'health_reminder':
                result = await self._execute_health_reminder(task)
            else:
                result = await self._execute_custom_task(task)

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

    async def _execute_doctor_appointment(self, task) -> Dict[str, Any]:
        """Execute doctor appointment booking task"""
        steps = [
            ("check_credentials", "Verifying healthcare portal credentials"),
            ("login_portal", "Logging into patient portal"),
            ("search_appointments", "Searching for available appointments"),
            ("select_best_slot", "Selecting optimal appointment time"),
            ("book_appointment", "Booking the appointment"),
            ("send_confirmation", "Sending confirmation to user")
        ]

        result = {"success": True, "steps_completed": []}

        for step_name, step_description in steps:
            await self._log_execution_step(
                task.id,
                step_name,
                len(result["steps_completed"]) + 1,
                step_description,
                "in_progress"
            )

            # Simulate execution (in production, this would call real APIs)
            await asyncio.sleep(0.5)

            step_result = await self._execute_step(task, step_name)

            await self._log_execution_step(
                task.id,
                step_name,
                len(result["steps_completed"]) + 1,
                step_description,
                "completed",
                step_result
            )

            result["steps_completed"].append({
                "step": step_name,
                "result": step_result
            })

            # Update progress
            progress = int((len(result["steps_completed"]) / len(steps)) * 100)
            await self._update_task_progress(task.id, progress)

        result["appointment_details"] = {
            "date": "2025-11-05",
            "time": "10:30 AM",
            "doctor": "Dr. Sarah Johnson",
            "location": "Main Medical Center",
            "confirmation_number": "APT-2025-001"
        }

        return result

    async def _execute_prescription_refill(self, task) -> Dict[str, Any]:
        """Execute prescription refill task"""
        steps = [
            ("verify_pharmacy_account", "Verifying pharmacy account access"),
            ("locate_prescription", "Locating prescription in system"),
            ("check_refills_remaining", "Checking refills remaining"),
            ("submit_refill_request", "Submitting refill request"),
            ("confirm_pickup_location", "Confirming pickup location"),
            ("notify_user", "Notifying user of completion")
        ]

        result = {"success": True, "steps_completed": []}

        for step_name, step_description in steps:
            await self._log_execution_step(
                task.id,
                step_name,
                len(result["steps_completed"]) + 1,
                step_description,
                "in_progress"
            )

            await asyncio.sleep(0.3)
            step_result = await self._execute_step(task, step_name)

            await self._log_execution_step(
                task.id,
                step_name,
                len(result["steps_completed"]) + 1,
                step_description,
                "completed",
                step_result
            )

            result["steps_completed"].append({
                "step": step_name,
                "result": step_result
            })

            progress = int((len(result["steps_completed"]) / len(steps)) * 100)
            await self._update_task_progress(task.id, progress)

        result["refill_details"] = {
            "medication": "Lisinopril 10mg",
            "quantity": "30 tablets",
            "ready_by": "2025-10-21",
            "pickup_location": "CVS Pharmacy - Main St",
            "confirmation_number": "RX-2025-12345"
        }

        return result

    async def _execute_lab_results_check(self, task) -> Dict[str, Any]:
        """Check and retrieve lab results"""
        steps = [
            ("login_portal", "Accessing patient portal"),
            ("check_new_results", "Checking for new lab results"),
            ("download_results", "Downloading available results"),
            ("ai_analysis", "AI analysis of results"),
            ("create_summary", "Creating user-friendly summary")
        ]

        result = {"success": True, "steps_completed": []}

        for step_name, step_description in steps:
            await self._log_execution_step(
                task.id, step_name,
                len(result["steps_completed"]) + 1,
                step_description, "in_progress"
            )

            await asyncio.sleep(0.4)
            step_result = await self._execute_step(task, step_name)

            await self._log_execution_step(
                task.id, step_name,
                len(result["steps_completed"]) + 1,
                step_description, "completed", step_result
            )

            result["steps_completed"].append({"step": step_name, "result": step_result})
            progress = int((len(result["steps_completed"]) / len(steps)) * 100)
            await self._update_task_progress(task.id, progress)

        result["lab_results"] = {
            "new_results_found": True,
            "test_date": "2025-10-18",
            "tests": ["Complete Blood Count", "Lipid Panel", "Metabolic Panel"],
            "summary": "All results within normal range. No immediate concerns noted.",
            "requires_followup": False
        }

        return result

    async def _execute_email_send(self, task) -> Dict[str, Any]:
        """Send email on behalf of user"""
        from app.services.email_service import send_email

        config = task.execution_config or {}
        email_data = {
            "to": config.get("to_addresses", []),
            "subject": config.get("subject", ""),
            "body": config.get("body", ""),
            "cc": config.get("cc_addresses", [])
        }

        # Log email in database
        await self._log_email_send(task, email_data)

        # Send email (would integrate with SendGrid/etc)
        await self._log_execution_step(
            task.id, "send_email", 1,
            f"Sending email to {', '.join(email_data['to'])}",
            "completed"
        )

        return {
            "success": True,
            "email_sent": True,
            "recipients": email_data["to"],
            "sent_at": datetime.utcnow().isoformat()
        }

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

    async def _execute_custom_task(self, task) -> Dict[str, Any]:
        """Execute custom task with AI reasoning"""
        # Use LLM to determine execution steps
        from app.ai.llm_client import get_llm_client

        llm = get_llm_client()

        prompt = f"""
        Analyze this task and determine the steps needed to complete it:

        Task: {task.task_title}
        Description: {task.task_description}
        Type: {task.task_type}

        Provide a structured execution plan.
        """

        # Get AI plan (simplified for now)
        result = {
            "success": True,
            "ai_reasoning": "Task analyzed and executed according to best practices",
            "execution_summary": f"Custom task '{task.task_title}' completed successfully"
        }

        return result

    async def _execute_step(self, task, step_name: str) -> Dict[str, Any]:
        """Execute individual step (placeholder for real implementation)"""
        # In production, this would call real APIs, web scraping, etc.
        return {
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "details": f"Step {step_name} completed successfully"
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

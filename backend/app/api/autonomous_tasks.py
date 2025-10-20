from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from uuid import UUID
from datetime import datetime, timedelta

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.models.agent import (
    AgentTaskQueue, AgentTaskExecution, AgentNotification,
    AgentCredential, CredentialRequest, AgentEmailLog,
    HealthTaskTemplate
)
from app.services.task_executor import TaskExecutor
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/autonomous", tags=["autonomous_tasks"])


# Schemas
class TaskCreate(BaseModel):
    engram_id: UUID
    task_type: str
    task_title: str
    task_description: str
    priority: str = 'medium'
    scheduled_for: datetime = None
    requires_credentials: bool = False
    execution_config: dict = {}


class TaskResponse(BaseModel):
    id: UUID
    engram_id: UUID
    task_type: str
    task_title: str
    task_description: str
    status: str
    priority: str
    completion_percentage: int
    scheduled_for: datetime
    created_at: datetime
    started_at: datetime = None
    completed_at: datetime = None
    result: dict = None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    notification_type: str
    title: str
    message: str
    priority: str
    is_read: bool
    is_actionable: bool
    health_category: str = None
    created_at: datetime

    class Config:
        from_attributes = True


class CredentialCreate(BaseModel):
    engram_id: UUID = None
    credential_type: str
    service_name: str
    username: str
    password: str
    additional_data: dict = {}


# Task Management Endpoints

@router.post("/tasks/create", response_model=TaskResponse)
async def create_autonomous_task(
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Create a new autonomous task"""
    new_task = AgentTaskQueue(
        engram_id=task_data.engram_id,
        user_id=str(current_user.get("sub")),
        task_type=task_data.task_type,
        task_title=task_data.task_title,
        task_description=task_data.task_description,
        priority=task_data.priority,
        scheduled_for=task_data.scheduled_for or datetime.utcnow(),
        requires_credentials=task_data.requires_credentials,
        execution_config=task_data.execution_config
    )

    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)

    return new_task


@router.get("/tasks", response_model=List[TaskResponse])
async def list_autonomous_tasks(
    status: str = None,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List all autonomous tasks for user"""
    user_id = str(current_user.get("sub"))

    query = select(AgentTaskQueue).where(AgentTaskQueue.user_id == user_id)

    if status:
        query = query.where(AgentTaskQueue.status == status)

    query = query.order_by(AgentTaskQueue.created_at.desc())

    result = await session.execute(query)
    tasks = result.scalars().all()

    return tasks


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_details(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed task information"""
    query = select(AgentTaskQueue).where(AgentTaskQueue.id == task_id)
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return task


@router.get("/tasks/{task_id}/executions")
async def get_task_executions(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Get execution steps for a task"""
    query = select(AgentTaskExecution).where(
        AgentTaskExecution.task_id == task_id
    ).order_by(AgentTaskExecution.step_order.asc())

    result = await session.execute(query)
    executions = result.scalars().all()

    return [{
        "id": str(e.id),
        "execution_step": e.execution_step,
        "step_order": e.step_order,
        "status": e.status,
        "step_description": e.step_description,
        "step_result": e.step_result,
        "started_at": e.started_at.isoformat() if e.started_at else None,
        "completed_at": e.completed_at.isoformat() if e.completed_at else None
    } for e in executions]


@router.post("/tasks/{task_id}/execute")
async def execute_task_now(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger task execution"""
    executor = TaskExecutor(session)

    try:
        result = await executor.execute_task(str(task_id))
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Notification Endpoints

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List user notifications"""
    user_id = str(current_user.get("sub"))

    query = select(AgentNotification).where(AgentNotification.user_id == user_id)

    if unread_only:
        query = query.where(AgentNotification.is_read == False)

    query = query.order_by(AgentNotification.created_at.desc()).limit(50)

    result = await session.execute(query)
    notifications = result.scalars().all()

    return notifications


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    query = select(AgentNotification).where(AgentNotification.id == notification_id)
    result = await session.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await session.commit()

    return {"success": True}


# Credential Management Endpoints

@router.post("/credentials")
async def save_credentials(
    cred_data: CredentialCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """Save encrypted credentials for AI agent"""
    # In production, encrypt password with proper encryption
    from cryptography.fernet import Fernet
    import base64

    # Simple encryption (in production, use proper key management)
    key = Fernet.generate_key()
    cipher = Fernet(key)
    encrypted_password = cipher.encrypt(cred_data.password.encode()).decode()

    credential = AgentCredential(
        user_id=str(current_user.get("sub")),
        engram_id=cred_data.engram_id,
        credential_type=cred_data.credential_type,
        service_name=cred_data.service_name,
        username=cred_data.username,
        encrypted_password=encrypted_password,
        additional_data=cred_data.additional_data,
        is_verified=False
    )

    session.add(credential)
    await session.commit()
    await session.refresh(credential)

    return {
        "id": str(credential.id),
        "service_name": credential.service_name,
        "credential_type": credential.credential_type
    }


@router.get("/credentials")
async def list_credentials(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List saved credentials (without passwords)"""
    user_id = str(current_user.get("sub"))

    query = select(AgentCredential).where(AgentCredential.user_id == user_id)
    result = await session.execute(query)
    credentials = result.scalars().all()

    return [{
        "id": str(c.id),
        "service_name": c.service_name,
        "credential_type": c.credential_type,
        "username": c.username,
        "is_verified": c.is_verified,
        "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None
    } for c in credentials]


@router.get("/credential-requests")
async def list_credential_requests(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List pending credential requests"""
    user_id = str(current_user.get("sub"))

    query = select(CredentialRequest).where(
        and_(
            CredentialRequest.user_id == user_id,
            CredentialRequest.status == 'pending'
        )
    ).order_by(CredentialRequest.created_at.desc())

    result = await session.execute(query)
    requests = result.scalars().all()

    return [{
        "id": str(r.id),
        "task_id": str(r.task_id),
        "credential_type": r.credential_type,
        "service_name": r.service_name,
        "purpose": r.purpose,
        "ai_reasoning": r.ai_reasoning,
        "created_at": r.created_at.isoformat()
    } for r in requests]


# Health Task Templates

@router.get("/templates")
async def list_health_templates(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List available health task templates"""
    query = select(HealthTaskTemplate).where(HealthTaskTemplate.is_active == True)
    result = await session.execute(query)
    templates = result.scalars().all()

    return [{
        "id": str(t.id),
        "template_name": t.template_name,
        "display_name": t.display_name,
        "description": t.description,
        "task_type": t.task_type,
        "required_credentials": t.required_credentials
    } for t in templates]


@router.get("/email-logs")
async def list_email_logs(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    """List emails sent by AI agent"""
    user_id = str(current_user.get("sub"))

    query = select(AgentEmailLog).where(
        AgentEmailLog.user_id == user_id
    ).order_by(AgentEmailLog.created_at.desc()).limit(50)

    result = await session.execute(query)
    logs = result.scalars().all()

    return [{
        "id": str(log.id),
        "to_addresses": log.to_addresses,
        "subject": log.subject,
        "status": log.status,
        "email_purpose": log.email_purpose,
        "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        "created_at": log.created_at.isoformat()
    } for log in logs]

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from datetime import datetime

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.schemas.engram import TaskCreate, TaskResponse
from app.models.engram import Engram, EngramAITask

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.post("/{engram_id}/create", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    engram_id: UUID,
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    engram_query = select(Engram).where(Engram.id == engram_id)
    result = await session.execute(engram_query)
    engram = result.scalar_one_or_none()

    if not engram:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engram not found"
        )

    new_task = EngramAITask(
        engram_id=engram_id,
        task_name=task_data.task_name,
        task_description=task_data.task_description,
        task_type=task_data.task_type,
        frequency=task_data.frequency,
        is_active=task_data.is_active
    )

    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)

    return new_task


@router.get("/{engram_id}", response_model=List[TaskResponse])
async def list_engram_tasks(
    engram_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(EngramAITask).where(
        EngramAITask.engram_id == engram_id
    ).order_by(EngramAITask.created_at.desc())

    result = await session.execute(query)
    tasks = result.scalars().all()

    return tasks


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(EngramAITask).where(EngramAITask.id == task_id)
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    task.task_name = task_data.task_name
    task.task_description = task_data.task_description
    task.task_type = task_data.task_type
    task.frequency = task_data.frequency
    task.is_active = task_data.is_active

    await session.commit()
    await session.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(EngramAITask).where(EngramAITask.id == task_id)
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    await session.delete(task)
    await session.commit()


@router.post("/{task_id}/execute", response_model=TaskResponse)
async def execute_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user)
):
    query = select(EngramAITask).where(EngramAITask.id == task_id)
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    execution_record = {
        "executed_at": datetime.utcnow().isoformat(),
        "status": "completed",
        "result": f"Task '{task.task_name}' executed successfully"
    }

    if task.execution_log is None:
        task.execution_log = []

    task.execution_log.append(execution_record)
    task.last_executed = datetime.utcnow()

    await session.commit()
    await session.refresh(task)

    return task

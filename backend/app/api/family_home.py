"""
Family Home API — tasks, shopping list, calendar events, bulletin board.

Router prefix: /api/v1/family-home
"""
from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import get_session
from app.models.family_home import FamilyTask, ShoppingItem, CalendarEvent, BulletinMessage

router = APIRouter(prefix="/api/v1/family-home", tags=["Family Home"])

# Auth helpers
def _get_user_id(current_user: dict) -> str:
    return current_user.get("id") or current_user.get("sub", "anonymous")

def _get_current_user():
    from app.auth.dependencies import get_current_user
    return get_current_user

# ═════════════════════════════════════════════════════════════════
#  Tasks
# ═════════════════════════════════════════════════════════════════

@router.get("/tasks")
async def get_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Return all family tasks."""
    user_id = _get_user_id(current_user)
    
    query = select(FamilyTask).where(FamilyTask.user_id == user_id)
    result = await session.execute(query)
    tasks = result.scalars().all()
    
    # Format to match frontend expectations
    formatted_tasks = []
    for t in tasks:
        formatted_tasks.append({
            "id": t.id,
            "action": t.text,
            "description": "",
            "status": "completed" if t.completed else "pending",
            "category": "chore", 
            "assignedTo": t.assigned_to
        })
        
    return {"tasks": formatted_tasks, "total": len(formatted_tasks)}

@router.post("/tasks")
async def create_task(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Create a new task."""
    user_id = _get_user_id(current_user)
    action = payload.get("action", "New Task")
    
    task = FamilyTask(
        text=action,
        completed=False,
        assigned_to=payload.get("assignedTo"),
        user_id=user_id
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    
    formatted_task = {
        "id": task.id,
        "action": task.text,
        "description": "",
        "status": "pending",
        "category": "chore",
        "assignedTo": task.assigned_to
    }
    return {"task": formatted_task, "created": True}

@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Mark a task as complete."""
    user_id = _get_user_id(current_user)
    
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.completed = True
    await session.commit()
    await session.refresh(task)
    
    return {"task": {"id": task.id, "status": "completed"}, "updated": True}

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Delete a task."""
    user_id = _get_user_id(current_user)
    
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()
    
    if task:
        await session.delete(task)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


# ═════════════════════════════════════════════════════════════════
#  Shopping
# ═════════════════════════════════════════════════════════════════

@router.get("/shopping")
async def get_shopping_list(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Return the shopping list."""
    user_id = _get_user_id(current_user)
    
    query = select(ShoppingItem).where(ShoppingItem.user_id == user_id)
    result = await session.execute(query)
    items = result.scalars().all()
    
    formatted_items = []
    for item in items:
        formatted_items.append({
            "id": item.id,
            "name": item.text,
            "quantity": item.quantity or "1",
            "addedBy": "Family", 
            "status": "bought" if item.bought else "needed"
        })
        
    return {"items": formatted_items, "total": len(formatted_items)}


@router.post("/shopping")
async def add_shopping_item(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Add an item to the shopping list."""
    user_id = _get_user_id(current_user)
    
    item = ShoppingItem(
        text=payload.get("name", "Item"),
        bought=False,
        quantity=payload.get("quantity", "1"),
        user_id=user_id
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    
    formatted_item = {
        "id": item.id,
        "name": item.text,
        "quantity": item.quantity,
        "addedBy": "Family",
        "status": "needed",
    }
    return {"item": formatted_item, "created": True}


@router.post("/shopping/{item_id}/bought")
async def mark_item_bought(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Mark a shopping item as bought."""
    user_id = _get_user_id(current_user)
    
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    item.bought = True
    await session.commit()
    await session.refresh(item)
    
    return {"item": {"id": item.id, "status": "bought"}, "updated": True}


@router.delete("/shopping/{item_id}")
async def delete_shopping_item(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Remove an item from the shopping list."""
    user_id = _get_user_id(current_user)
    
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()
    
    if item:
        await session.delete(item)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


# ═════════════════════════════════════════════════════════════════
#  Calendar
# ═════════════════════════════════════════════════════════════════

@router.get("/calendar")
async def get_calendar(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Return upcoming family events."""
    user_id = _get_user_id(current_user)
    
    query = select(CalendarEvent).where(CalendarEvent.user_id == user_id)
    result = await session.execute(query)
    events = result.scalars().all()
    
    formatted_events = []
    for e in events:
        start_dt = f"{e.date}T{e.time or '12:00'}:00Z"
        # simple backend end time just mapped +2h
        formatted_events.append({
            "id": e.id,
            "title": e.title,
            "startTime": start_dt,
            "endTime": start_dt, # For display purposes, simplifying
            "location": "TBD",
            "attendees": e.attendees or []
        })
        
    return {"events": formatted_events, "total": len(formatted_events)}


@router.post("/calendar")
async def add_calendar_event(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Add a new calendar event."""
    user_id = _get_user_id(current_user)
    
    # Simple parse from ISO startTime
    start_time_iso = payload.get("startTime", datetime.utcnow().isoformat() + "Z")
    try:
        # e.g., '2026-02-28T18:00:00Z'
        date_part, time_part = start_time_iso.replace('Z', '').split('T')
        time_part = time_part[:5] # HH:MM
    except:
        date_part = datetime.utcnow().strftime("%Y-%m-%d")
        time_part = "12:00"
    
    event = CalendarEvent(
        title=payload.get("title", "Family Event"),
        date=date_part,
        time=time_part,
        attendees=payload.get("attendees", []),
        user_id=user_id
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    
    formatted_event = {
        "id": event.id,
        "title": event.title,
        "startTime": start_time_iso,
        "endTime": payload.get("endTime", start_time_iso),
        "location": payload.get("location"),
        "attendees": event.attendees
    }
    return {"event": formatted_event, "created": True}


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Delete a calendar event."""
    user_id = _get_user_id(current_user)
    
    query = select(CalendarEvent).where(and_(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id))
    result = await session.execute(query)
    event = result.scalar_one_or_none()
    
    if event:
        await session.delete(event)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


# ═════════════════════════════════════════════════════════════════
#  Bulletin Board
# ═════════════════════════════════════════════════════════════════

@router.get("/bulletin")
async def get_bulletin(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Return bulletin board messages (newest first)."""
    user_id = _get_user_id(current_user)
    
    query = select(BulletinMessage).where(BulletinMessage.user_id == user_id).order_by(BulletinMessage.created_at.desc())
    result = await session.execute(query)
    messages = result.scalars().all()
    
    formatted_msgs = []
    for msg in messages:
        formatted_msgs.append({
            "id": msg.id,
            "text": msg.text,
            "author": msg.author,
            "createdAt": msg.created_at.isoformat() + "Z" if msg.created_at else datetime.utcnow().isoformat() + "Z"
        })
        
    return {"messages": formatted_msgs, "total": len(formatted_msgs)}


@router.post("/bulletin")
async def post_bulletin_message(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Post a new bulletin message."""
    user_id = _get_user_id(current_user)
    
    if not payload.get("text"):
        raise HTTPException(status_code=400, detail="text is required")
        
    message = BulletinMessage(
        text=payload["text"],
        author=payload.get("author", "Family"),
        user_id=user_id
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    
    formatted_msg = {
        "id": message.id,
        "text": message.text,
        "author": message.author,
        "createdAt": message.created_at.isoformat() + "Z" if message.created_at else datetime.utcnow().isoformat() + "Z"
    }
    return {"message": formatted_msg, "created": True}


@router.delete("/bulletin/{message_id}")
async def delete_bulletin_message(
    message_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Delete a bulletin message."""
    user_id = _get_user_id(current_user)
    
    query = select(BulletinMessage).where(and_(BulletinMessage.id == message_id, BulletinMessage.user_id == user_id))
    result = await session.execute(query)
    msg = result.scalar_one_or_none()
    
    if msg:
        await session.delete(msg)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


# ═════════════════════════════════════════════════════════════════
#  Household Summary (convenience endpoint)
# ═════════════════════════════════════════════════════════════════

@router.get("/summary")
async def get_summary(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Return a composite household summary."""
    user_id = _get_user_id(current_user)
    
    # Active Tasks
    t_query = select(FamilyTask).where(and_(FamilyTask.user_id == user_id, FamilyTask.completed == False))
    tasks = await session.execute(t_query)
    active_tasks = len(tasks.scalars().all())
    
    # Shopping List Needed
    s_query = select(ShoppingItem).where(and_(ShoppingItem.user_id == user_id, ShoppingItem.bought == False))
    items = await session.execute(s_query)
    items_needed = len(items.scalars().all())
    
    # Calendar Events
    c_query = select(CalendarEvent).where(CalendarEvent.user_id == user_id)
    events = await session.execute(c_query)
    upcoming_events = len(events.scalars().all())
    
    return {
        "activeTasks": active_tasks,
        "upcomingEvents": upcoming_events,
        "shoppingListCount": items_needed,
        "familyStatus": [
            {"name": "Alice", "status": "home"},
            {"name": "Bob", "status": "away"}
        ],
    }

"""
Family Home API - tasks, shopping list, calendar events, and bulletin board.

Router prefix: /api/v1/family-home
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import create_supabase_client, get_session
from app.models.family_home import BulletinMessage, CalendarEvent, FamilyTask, ShoppingItem

router = APIRouter(prefix="/api/v1/family-home", tags=["Family Home"])
logger = logging.getLogger(__name__)


def _get_user_id(current_user: dict) -> str:
    return current_user.get("id") or current_user.get("sub", "anonymous")


def _get_current_user():
    from app.auth.dependencies import get_current_user
    return get_current_user


def _serialize_task(task: FamilyTask) -> Dict[str, Any]:
    status = task.status or ("completed" if task.completed else "pending")
    task_type = task.task_type or "standard"
    return {
        "id": task.id,
        "action": task.text,
        "title": task.text,
        "description": task.description or "",
        "status": status,
        "category": "chore" if task_type == "standard" else task_type,
        "type": task_type,
        "assignedTo": task.assigned_to,
        "assignee": task.assigned_to,
        "rewardWG": task.reward_wg,
        "aiBrief": task.ai_brief,
        "dueDate": task.due_date.isoformat() if task.due_date else None,
        "createdAt": task.created_at.isoformat() if task.created_at else None,
        "metadata": task.metadata_json or {},
    }


def _serialize_item(item: ShoppingItem) -> Dict[str, Any]:
    status = item.status or ("bought" if item.bought else "needed")
    item_type = item.item_type or "standard"
    return {
        "id": item.id,
        "name": item.text,
        "quantity": item.quantity or "1",
        "addedBy": "Family",
        "status": status,
        "type": item_type,
        "priceEst": item.price_est,
        "triggerSource": item.trigger_source,
        "legacyBeneficiary": item.legacy_beneficiary,
        "unlockYear": item.unlock_year,
        "metadata": item.metadata_json or {},
        "createdAt": item.created_at.isoformat() if item.created_at else None,
    }


def _serialize_task_record(task: Dict[str, Any]) -> Dict[str, Any]:
    status = task.get("status") or ("completed" if task.get("completed") else "pending")
    task_type = task.get("task_type") or "standard"
    return {
        "id": task.get("id"),
        "action": task.get("text"),
        "title": task.get("text"),
        "description": task.get("description") or "",
        "status": status,
        "category": "chore" if task_type == "standard" else task_type,
        "type": task_type,
        "assignedTo": task.get("assigned_to"),
        "assignee": task.get("assigned_to"),
        "rewardWG": task.get("reward_wg"),
        "aiBrief": task.get("ai_brief"),
        "dueDate": task.get("due_date"),
        "createdAt": task.get("created_at"),
        "metadata": task.get("metadata_json") or {},
    }


def _serialize_item_record(item: Dict[str, Any]) -> Dict[str, Any]:
    status = item.get("status") or ("bought" if item.get("bought") else "needed")
    item_type = item.get("item_type") or "standard"
    return {
        "id": item.get("id"),
        "name": item.get("text"),
        "quantity": item.get("quantity") or "1",
        "addedBy": "Family",
        "status": status,
        "type": item_type,
        "priceEst": item.get("price_est"),
        "triggerSource": item.get("trigger_source"),
        "legacyBeneficiary": item.get("legacy_beneficiary"),
        "unlockYear": item.get("unlock_year"),
        "metadata": item.get("metadata_json") or {},
        "createdAt": item.get("created_at"),
    }


async def _fetch_supabase_rows(
    table_name: str,
    user_id: str,
    *,
    order_by: str | None = None,
    descending: bool = False,
) -> list[Dict[str, Any]]:
    def _run():
        client = create_supabase_client()
        query = client.table(table_name).select("*").eq("user_id", user_id)
        if order_by:
            query = query.order(order_by, desc=descending)
        return query.execute()

    response = await asyncio.to_thread(_run)
    return response.data or []


def _format_calendar_event_record(event: Dict[str, Any]) -> Dict[str, Any]:
    date_value = event.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
    time_value = event.get("time") or "12:00"
    start_dt = f"{date_value}T{time_value}:00Z"
    return {
        "id": event.get("id"),
        "title": event.get("title"),
        "startTime": start_dt,
        "endTime": start_dt,
        "location": "TBD",
        "attendees": event.get("attendees") or [],
    }


def _format_bulletin_record(message: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": message.get("id"),
        "text": message.get("text"),
        "author": message.get("author"),
        "createdAt": message.get("created_at") or datetime.utcnow().isoformat() + "Z",
    }


def _coerce_task_status(task: FamilyTask, next_status: str) -> None:
    normalized = next_status if next_status in {"pending", "in_progress", "completed"} else "pending"
    task.status = normalized
    task.completed = normalized == "completed"


def _coerce_item_status(item: ShoppingItem, next_status: str) -> None:
    normalized = next_status if next_status in {"needed", "negotiating", "bought", "vaulted"} else "needed"
    item.status = normalized
    item.bought = normalized in {"bought", "vaulted"}


@router.get("/tasks")
async def get_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(FamilyTask).where(FamilyTask.user_id == user_id).order_by(FamilyTask.created_at.desc())
    try:
        result = await session.execute(query)
        tasks = result.scalars().all()

        formatted_tasks = [_serialize_task(task) for task in tasks]
        return {"tasks": formatted_tasks, "total": len(formatted_tasks)}
    except Exception as exc:
        logger.warning("SQL task lookup failed; using Supabase fallback: %s", exc)
        rows = await _fetch_supabase_rows("family_tasks", user_id, order_by="created_at", descending=True)
        formatted_tasks = [_serialize_task_record(row) for row in rows]
        return {"tasks": formatted_tasks, "total": len(formatted_tasks)}


@router.post("/tasks")
async def create_task(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    title = str(payload.get("title") or payload.get("action") or "New Task").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")

    reward_wg = payload.get("rewardWG")
    task = FamilyTask(
        text=title,
        description=payload.get("description"),
        task_type=str(payload.get("type") or "standard"),
        assigned_to=payload.get("assignee") or payload.get("assignedTo"),
        reward_wg=int(reward_wg) if reward_wg not in (None, "") else None,
        ai_brief=payload.get("aiBrief"),
        metadata_json=payload.get("metadata") or {},
        user_id=user_id,
    )
    _coerce_task_status(task, str(payload.get("status") or "pending"))
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return {"task": _serialize_task(task), "created": True}


@router.put("/tasks/{task_id}")
async def update_task(
    task_id: str,
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if "title" in payload or "action" in payload:
        task.text = str(payload.get("title") or payload.get("action") or task.text).strip() or task.text
    if "description" in payload:
        task.description = payload.get("description")
    if "type" in payload:
        task.task_type = str(payload.get("type") or task.task_type)
    if "assignee" in payload or "assignedTo" in payload:
        task.assigned_to = payload.get("assignee") or payload.get("assignedTo")
    if "rewardWG" in payload:
        reward_wg = payload.get("rewardWG")
        task.reward_wg = int(reward_wg) if reward_wg not in (None, "") else None
    if "aiBrief" in payload:
        task.ai_brief = payload.get("aiBrief")
    if "metadata" in payload:
        task.metadata_json = payload.get("metadata") or {}
    if "status" in payload:
        _coerce_task_status(task, str(payload.get("status")))

    await session.commit()
    await session.refresh(task)
    return {"task": _serialize_task(task), "updated": True}


@router.post("/tasks/{task_id}/dispatch")
async def dispatch_task(
    task_id: str,
    payload: Dict[str, Any] = Body(default={}),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if (task.task_type or "standard") == "ghost":
        _coerce_task_status(task, "completed")
        task.ai_brief = payload.get("aiBrief") or task.ai_brief or f'St. Joseph compiled a backend brief for "{task.text}".'
    else:
        _coerce_task_status(task, "in_progress")

    await session.commit()
    await session.refresh(task)
    return {"task": _serialize_task(task), "dispatched": True}


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    _coerce_task_status(task, "completed")
    await session.commit()
    await session.refresh(task)
    return {"task": _serialize_task(task), "updated": True}


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(FamilyTask).where(and_(FamilyTask.id == task_id, FamilyTask.user_id == user_id))
    result = await session.execute(query)
    task = result.scalar_one_or_none()

    if task:
        await session.delete(task)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


@router.get("/shopping")
async def get_shopping_list(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(ShoppingItem.user_id == user_id).order_by(ShoppingItem.created_at.desc())
    try:
        result = await session.execute(query)
        items = result.scalars().all()

        formatted_items = [_serialize_item(item) for item in items]
        return {"items": formatted_items, "total": len(formatted_items)}
    except Exception as exc:
        logger.warning("SQL shopping lookup failed; using Supabase fallback: %s", exc)
        rows = await _fetch_supabase_rows("shopping_items", user_id, order_by="created_at", descending=True)
        formatted_items = [_serialize_item_record(row) for row in rows]
        return {"items": formatted_items, "total": len(formatted_items)}


@router.post("/shopping")
async def add_shopping_item(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    name = str(payload.get("name") or "Item").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Item name is required")

    price_est = payload.get("priceEst")
    unlock_year = payload.get("unlockYear")
    item = ShoppingItem(
        text=name,
        item_type=str(payload.get("type") or "standard"),
        quantity=str(payload.get("quantity") or "1"),
        price_est=int(price_est) if price_est not in (None, "") else None,
        trigger_source=payload.get("triggerSource"),
        legacy_beneficiary=payload.get("legacyBeneficiary"),
        unlock_year=int(unlock_year) if unlock_year not in (None, "") else None,
        metadata_json=payload.get("metadata") or {},
        user_id=user_id,
    )
    _coerce_item_status(item, str(payload.get("status") or "needed"))
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return {"item": _serialize_item(item), "created": True}


@router.put("/shopping/{item_id}")
async def update_shopping_item(
    item_id: str,
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if "name" in payload:
        item.text = str(payload.get("name") or item.text).strip() or item.text
    if "quantity" in payload:
        item.quantity = str(payload.get("quantity") or item.quantity or "1")
    if "type" in payload:
        item.item_type = str(payload.get("type") or item.item_type)
    if "priceEst" in payload:
        price_est = payload.get("priceEst")
        item.price_est = int(price_est) if price_est not in (None, "") else None
    if "triggerSource" in payload:
        item.trigger_source = payload.get("triggerSource")
    if "legacyBeneficiary" in payload:
        item.legacy_beneficiary = payload.get("legacyBeneficiary")
    if "unlockYear" in payload:
        unlock_year = payload.get("unlockYear")
        item.unlock_year = int(unlock_year) if unlock_year not in (None, "") else None
    if "metadata" in payload:
        item.metadata_json = payload.get("metadata") or {}
    if "status" in payload:
        _coerce_item_status(item, str(payload.get("status")))

    await session.commit()
    await session.refresh(item)
    return {"item": _serialize_item(item), "updated": True}


@router.post("/shopping/{item_id}/bought")
async def mark_item_bought(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    _coerce_item_status(item, "bought")
    await session.commit()
    await session.refresh(item)
    return {"item": _serialize_item(item), "updated": True}


@router.post("/shopping/{item_id}/negotiate")
async def negotiate_shopping_item(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    _coerce_item_status(item, "needed")
    if item.price_est:
        item.price_est = max(1, round(item.price_est * 0.85))
    if item.text and "(Negotiated Discount)" not in item.text:
        item.text = f"{item.text} (Negotiated Discount)"
    await session.commit()
    await session.refresh(item)
    return {"item": _serialize_item(item), "updated": True}


@router.post("/shopping/{item_id}/acquire")
async def acquire_shopping_item(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    _coerce_item_status(item, "vaulted" if (item.item_type or "standard") == "legacy_asset" else "bought")
    await session.commit()
    await session.refresh(item)
    return {"item": _serialize_item(item), "updated": True}


@router.delete("/shopping/{item_id}")
async def delete_shopping_item(
    item_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(ShoppingItem).where(and_(ShoppingItem.id == item_id, ShoppingItem.user_id == user_id))
    result = await session.execute(query)
    item = result.scalar_one_or_none()

    if item:
        await session.delete(item)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


@router.get("/calendar")
async def get_calendar(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(CalendarEvent).where(CalendarEvent.user_id == user_id)
    try:
        result = await session.execute(query)
        events = result.scalars().all()

        formatted_events = []
        for event in events:
            start_dt = f"{event.date}T{event.time or '12:00'}:00Z"
            formatted_events.append({
                "id": event.id,
                "title": event.title,
                "startTime": start_dt,
                "endTime": start_dt,
                "location": "TBD",
                "attendees": event.attendees or [],
            })

        return {"events": formatted_events, "total": len(formatted_events)}
    except Exception as exc:
        logger.warning("SQL calendar lookup failed; using Supabase fallback: %s", exc)
        rows = await _fetch_supabase_rows("calendar_events", user_id, order_by="created_at")
        formatted_events = [_format_calendar_event_record(row) for row in rows]
        return {"events": formatted_events, "total": len(formatted_events)}


@router.post("/calendar")
async def add_calendar_event(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    start_time_iso = payload.get("startTime", datetime.utcnow().isoformat() + "Z")
    try:
        date_part, time_part = start_time_iso.replace("Z", "").split("T")
        time_part = time_part[:5]
    except Exception:
        date_part = datetime.utcnow().strftime("%Y-%m-%d")
        time_part = "12:00"

    event = CalendarEvent(
        title=payload.get("title", "Family Event"),
        date=date_part,
        time=time_part,
        attendees=payload.get("attendees", []),
        user_id=user_id,
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
        "attendees": event.attendees,
    }
    return {"event": formatted_event, "created": True}


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(CalendarEvent).where(and_(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id))
    result = await session.execute(query)
    event = result.scalar_one_or_none()

    if event:
        await session.delete(event)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


@router.get("/bulletin")
async def get_bulletin(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(BulletinMessage).where(BulletinMessage.user_id == user_id).order_by(BulletinMessage.created_at.desc())
    try:
        result = await session.execute(query)
        messages = result.scalars().all()

        formatted_messages = []
        for message in messages:
            formatted_messages.append({
                "id": message.id,
                "text": message.text,
                "author": message.author,
                "createdAt": message.created_at.isoformat() + "Z" if message.created_at else datetime.utcnow().isoformat() + "Z",
            })

        return {"messages": formatted_messages, "total": len(formatted_messages)}
    except Exception as exc:
        logger.warning("SQL bulletin lookup failed; using Supabase fallback: %s", exc)
        rows = await _fetch_supabase_rows("bulletin_messages", user_id, order_by="created_at", descending=True)
        formatted_messages = [_format_bulletin_record(row) for row in rows]
        return {"messages": formatted_messages, "total": len(formatted_messages)}


@router.post("/bulletin")
async def post_bulletin_message(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    if not payload.get("text"):
        raise HTTPException(status_code=400, detail="text is required")

    message = BulletinMessage(
        text=payload["text"],
        author=payload.get("author", "Family"),
        user_id=user_id,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)

    formatted_message = {
        "id": message.id,
        "text": message.text,
        "author": message.author,
        "createdAt": message.created_at.isoformat() + "Z" if message.created_at else datetime.utcnow().isoformat() + "Z",
    }
    return {"message": formatted_message, "created": True}


@router.delete("/bulletin/{message_id}")
async def delete_bulletin_message(
    message_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)
    query = select(BulletinMessage).where(and_(BulletinMessage.id == message_id, BulletinMessage.user_id == user_id))
    result = await session.execute(query)
    message = result.scalar_one_or_none()

    if message:
        await session.delete(message)
        await session.commit()
        return {"deleted": True}
    return {"deleted": False}


@router.get("/summary")
async def get_summary(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    user_id = _get_user_id(current_user)

    task_query = select(FamilyTask).where(and_(FamilyTask.user_id == user_id, FamilyTask.completed == False))
    tasks = await session.execute(task_query)
    active_tasks = len(tasks.scalars().all())

    shopping_query = select(ShoppingItem).where(and_(ShoppingItem.user_id == user_id, ShoppingItem.bought == False))
    items = await session.execute(shopping_query)
    items_needed = len(items.scalars().all())

    calendar_query = select(CalendarEvent).where(CalendarEvent.user_id == user_id)
    events = await session.execute(calendar_query)
    upcoming_events = len(events.scalars().all())

    return {
        "activeTasks": active_tasks,
        "upcomingEvents": upcoming_events,
        "shoppingListCount": items_needed,
        "familyStatus": [
            {"name": "Alice", "status": "home"},
            {"name": "Bob", "status": "away"},
        ],
    }

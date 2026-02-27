"""
Family Home API — tasks, shopping list, calendar events, bulletin board.

Router prefix: /api/v1/family-home
"""
from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import APIRouter, Body
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/family-home", tags=["Family Home"])

# ── In-memory stores (per-user isolation via user_id in future) ────
_tasks: list[dict] = [
    {"id": "t1", "action": "Mow Lawn", "description": "Front and back yard", "status": "pending", "category": "chore", "assignedTo": None},
    {"id": "t2", "action": "Fix Kitchen Faucet", "description": "Kitchen sink leak", "status": "pending", "category": "maintenance", "assignedTo": None},
    {"id": "t3", "action": "Pick up Dry Cleaning", "description": "Suits for the wedding", "status": "completed", "category": "errand", "assignedTo": None},
]

_shopping: list[dict] = [
    {"id": "s1", "name": "Milk", "quantity": "2 gallons", "addedBy": "Alice", "status": "needed"},
    {"id": "s2", "name": "Eggs", "quantity": "1 dozen", "addedBy": "Bob", "status": "needed"},
    {"id": "s3", "name": "Bread", "quantity": "2 loaves", "addedBy": "Charlie", "status": "bought"},
]

_calendar: list[dict] = [
    {"id": "e1", "title": "Family Dinner", "startTime": "2026-02-28T18:00:00Z", "endTime": "2026-02-28T20:00:00Z", "location": "Grandma's house", "attendees": ["All"]},
    {"id": "e2", "title": "Soccer Practice", "startTime": "2026-03-01T09:00:00Z", "endTime": "2026-03-01T11:00:00Z", "location": "City Park", "attendees": ["Charlie"]},
]

_bulletin: list[dict] = [
    {"id": "b1", "text": "Don't forget family dinner at Grandma's on Sunday! 6:00 PM.", "author": "Alice", "createdAt": "2026-02-26T10:00:00Z"},
    {"id": "b2", "text": "Pick up the package at the front door if you get home first.", "author": "Bob", "createdAt": "2026-02-26T11:00:00Z"},
]


# ═════════════════════════════════════════════════════════════════
#  Tasks
# ═════════════════════════════════════════════════════════════════

@router.get("/tasks")
async def get_tasks():
    """Return all family tasks."""
    return {"tasks": _tasks, "total": len(_tasks)}


@router.post("/tasks")
async def create_task(payload: Dict[str, Any] = Body(...)):
    """Create a new task."""
    task = {
        "id": f"t_{uuid.uuid4().hex[:8]}",
        "action": payload.get("action", "New Task"),
        "description": payload.get("description", ""),
        "status": "pending",
        "category": payload.get("category", "chore"),
        "assignedTo": payload.get("assignedTo"),
    }
    _tasks.append(task)
    return {"task": task, "created": True}


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str):
    """Mark a task as complete."""
    for t in _tasks:
        if t["id"] == task_id:
            t["status"] = "completed"
            return {"task": t, "updated": True}
    return {"error": "Task not found"}


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task."""
    global _tasks
    before = len(_tasks)
    _tasks = [t for t in _tasks if t["id"] != task_id]
    return {"deleted": len(_tasks) < before}


# ═════════════════════════════════════════════════════════════════
#  Shopping
# ═════════════════════════════════════════════════════════════════

@router.get("/shopping")
async def get_shopping_list():
    """Return the shopping list."""
    return {"items": _shopping, "total": len(_shopping)}


@router.post("/shopping")
async def add_shopping_item(payload: Dict[str, Any] = Body(...)):
    """Add an item to the shopping list."""
    item = {
        "id": f"s_{uuid.uuid4().hex[:8]}",
        "name": payload.get("name", "Item"),
        "quantity": payload.get("quantity", "1"),
        "addedBy": payload.get("addedBy", "Family"),
        "status": "needed",
    }
    _shopping.append(item)
    return {"item": item, "created": True}


@router.post("/shopping/{item_id}/bought")
async def mark_item_bought(item_id: str):
    """Mark a shopping item as bought."""
    for item in _shopping:
        if item["id"] == item_id:
            item["status"] = "bought"
            return {"item": item, "updated": True}
    return {"error": "Item not found"}


@router.delete("/shopping/{item_id}")
async def delete_shopping_item(item_id: str):
    """Remove an item from the shopping list."""
    global _shopping
    before = len(_shopping)
    _shopping = [s for s in _shopping if s["id"] != item_id]
    return {"deleted": len(_shopping) < before}


# ═════════════════════════════════════════════════════════════════
#  Calendar
# ═════════════════════════════════════════════════════════════════

@router.get("/calendar")
async def get_calendar():
    """Return upcoming family events."""
    return {"events": _calendar, "total": len(_calendar)}


@router.post("/calendar")
async def add_calendar_event(payload: Dict[str, Any] = Body(...)):
    """Add a new calendar event."""
    event = {
        "id": f"e_{uuid.uuid4().hex[:8]}",
        "title": payload.get("title", "Family Event"),
        "startTime": payload.get("startTime", datetime.utcnow().isoformat() + "Z"),
        "endTime": payload.get("endTime", datetime.utcnow().isoformat() + "Z"),
        "location": payload.get("location"),
        "attendees": payload.get("attendees", []),
    }
    _calendar.append(event)
    return {"event": event, "created": True}


@router.delete("/calendar/{event_id}")
async def delete_calendar_event(event_id: str):
    """Delete a calendar event."""
    global _calendar
    before = len(_calendar)
    _calendar = [e for e in _calendar if e["id"] != event_id]
    return {"deleted": len(_calendar) < before}


# ═════════════════════════════════════════════════════════════════
#  Bulletin Board
# ═════════════════════════════════════════════════════════════════

@router.get("/bulletin")
async def get_bulletin():
    """Return bulletin board messages (newest first)."""
    return {"messages": list(reversed(_bulletin)), "total": len(_bulletin)}


@router.post("/bulletin")
async def post_bulletin_message(payload: Dict[str, Any] = Body(...)):
    """Post a new bulletin message."""
    if not payload.get("text"):
        return {"error": "text is required"}
    message = {
        "id": f"b_{uuid.uuid4().hex[:8]}",
        "text": payload["text"],
        "author": payload.get("author", "Family"),
        "createdAt": datetime.utcnow().isoformat() + "Z",
    }
    _bulletin.append(message)
    return {"message": message, "created": True}


@router.delete("/bulletin/{message_id}")
async def delete_bulletin_message(message_id: str):
    """Delete a bulletin message."""
    global _bulletin
    before = len(_bulletin)
    _bulletin = [b for b in _bulletin if b["id"] != message_id]
    return {"deleted": len(_bulletin) < before}


# ═════════════════════════════════════════════════════════════════
#  Household Summary (convenience endpoint)
# ═════════════════════════════════════════════════════════════════

@router.get("/summary")
async def get_summary():
    """Return a composite household summary."""
    active_tasks = len([t for t in _tasks if t["status"] == "pending"])
    items_needed = len([s for s in _shopping if s["status"] == "needed"])
    return {
        "activeTasks": active_tasks,
        "upcomingEvents": len(_calendar),
        "shoppingListCount": items_needed,
        "familyStatus": [
            {"name": "Alice", "status": "home"},
            {"name": "Bob", "status": "away"},
            {"name": "Charlie", "status": "busy"},
        ],
    }

"""
Genealogy API - Family Tree and relationships
Router prefix: /api/v1/genealogy
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import create_supabase_client, get_session
from app.models.genealogy import FamilyNode, FamilyRelationship, FamilyEvent

router = APIRouter(prefix="/api/v1/genealogy", tags=["Genealogy"])
logger = logging.getLogger(__name__)

# Auth helpers
def _get_user_id(current_user: dict) -> str:
    return current_user.get("id") or current_user.get("sub", "anonymous")

def _get_current_user():
    from app.auth.dependencies import get_current_user
    return get_current_user


async def _fetch_supabase_tree(user_id: str) -> Dict[str, Any]:
    def _run():
        client = create_supabase_client()
        nodes_response = client.table("family_nodes").select("*").eq("user_id", user_id).execute()
        nodes = nodes_response.data or []
        node_ids = {node.get("id") for node in nodes if node.get("id")}
        relationships_response = client.table("family_relationships").select("*").execute()
        relationships = [
            relationship
            for relationship in (relationships_response.data or [])
            if relationship.get("from_node_id") in node_ids or relationship.get("to_node_id") in node_ids
        ]
        return {"nodes": nodes, "relationships": relationships}

    return await asyncio.to_thread(_run)

@router.get("/tree")
async def get_family_tree(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Retrieve all family nodes and their relationships for the current user."""
    user_id = _get_user_id(current_user)

    try:
        # 1. Fetch nodes
        nodes_query = select(FamilyNode).where(FamilyNode.user_id == user_id)
        nodes_result = await session.execute(nodes_query)
        nodes = nodes_result.scalars().all()

        if not nodes:
            return {"nodes": [], "relationships": []}

        # 2. Extract node IDs to fetch relationships
        node_ids = [node.id for node in nodes]

        # 3. Fetch relationships
        rels_query = select(FamilyRelationship).where(
            FamilyRelationship.from_node_id.in_(node_ids)
        )
        rels_result = await session.execute(rels_query)
        relationships = rels_result.scalars().all()

        # FORMAT
        formatted_nodes = []
        for n in nodes:
            formatted_nodes.append({
                "id": n.id,
                "name": n.name,
                "gender": n.gender,
                "birthDate": n.birth_date,
                "deathDate": n.death_date,
                "healthMetrics": n.health_metrics or {}
            })

        formatted_relationships = []
        for r in relationships:
            formatted_relationships.append({
                "id": r.id,
                "fromNodeId": r.from_node_id,
                "toNodeId": r.to_node_id,
                "relationType": r.relation_type
            })

        return {
            "nodes": formatted_nodes,
            "relationships": formatted_relationships
        }
    except Exception as exc:
        logger.warning("SQL genealogy lookup failed; using Supabase fallback: %s", exc)
        tree = await _fetch_supabase_tree(user_id)
        return {
            "nodes": [
                {
                    "id": node.get("id"),
                    "name": node.get("name"),
                    "gender": node.get("gender"),
                    "birthDate": node.get("birth_date"),
                    "deathDate": node.get("death_date"),
                    "healthMetrics": node.get("health_metrics") or {},
                }
                for node in tree["nodes"]
            ],
            "relationships": [
                {
                    "id": relationship.get("id"),
                    "fromNodeId": relationship.get("from_node_id"),
                    "toNodeId": relationship.get("to_node_id"),
                    "relationType": relationship.get("relation_type"),
                }
                for relationship in tree["relationships"]
            ],
        }

@router.post("/node")
async def create_node(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Create a new person in the family tree."""
    user_id = _get_user_id(current_user)
    
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Name is required")
        
    node = FamilyNode(
        user_id=user_id,
        name=payload["name"],
        gender=payload.get("gender"),
        birth_date=payload.get("birthDate"),
        death_date=payload.get("deathDate"),
        health_metrics=payload.get("healthMetrics", {})
    )
    session.add(node)
    await session.commit()
    await session.refresh(node)
    
    return {
        "node": {
            "id": node.id,
            "name": node.name,
            "gender": node.gender,
            "birthDate": node.birth_date,
            "deathDate": node.death_date,
            "healthMetrics": node.health_metrics
        },
        "created": True
    }

@router.post("/relationship")
async def create_relationship(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Link two nodes together (e.g. parent to child)."""
    user_id = _get_user_id(current_user)
    
    from_node_id = payload.get("fromNodeId")
    to_node_id = payload.get("toNodeId")
    relation_type = payload.get("relationType")
    
    if not all([from_node_id, to_node_id, relation_type]):
        raise HTTPException(status_code=400, detail="fromNodeId, toNodeId, and relationType are required")
        
    rel = FamilyRelationship(
        from_node_id=from_node_id,
        to_node_id=to_node_id,
        relation_type=relation_type
    )
    session.add(rel)
    await session.commit()
    await session.refresh(rel)
    
    return {
        "relationship": {
            "id": rel.id,
            "fromNodeId": rel.from_node_id,
            "toNodeId": rel.to_node_id,
            "relationType": rel.relation_type
        },
        "created": True
    }

@router.get("/events")
async def get_family_events(
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Retrieve all family events for the current user."""
    user_id = _get_user_id(current_user)
    
    query = select(FamilyEvent).where(FamilyEvent.user_id == user_id)
    try:
        result = await session.execute(query)
        events = result.scalars().all()
    except Exception as e:
        # Table might not exist yet if migrations haven't run
        return {"events": []}
        
    formatted = []
    for e in events:
        formatted.append({
            "id": e.id,
            "memberId": e.member_id,
            "memberName": e.member_name,
            "type": e.type,
            "date": e.date,
            "title": e.title,
            "description": e.description,
            "mediaUrl": e.media_url,
        })
    return {"events": formatted}

@router.post("/events")
async def create_family_event(
    payload: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Create a new event on the family timeline."""
    user_id = _get_user_id(current_user)
    
    if not payload.get("title") or not payload.get("memberId") or not payload.get("type"):
        raise HTTPException(status_code=400, detail="title, memberId, and type are required")
        
    event = FamilyEvent(
        user_id=user_id,
        member_id=payload["memberId"],
        member_name=payload.get("memberName", "Unknown"),
        type=payload["type"],
        date=payload.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
        title=payload["title"],
        description=payload.get("description"),
        media_url=payload.get("mediaUrl")
    )
    session.add(event)
    try:
        await session.commit()
        await session.refresh(event)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "event": {
            "id": event.id,
            "memberId": event.member_id,
            "memberName": event.member_name,
            "type": event.type,
            "date": event.date,
            "title": event.title,
            "description": event.description,
            "mediaUrl": event.media_url,
        },
        "created": True
    }

@router.delete("/events/{event_id}")
async def delete_family_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(_get_current_user())
):
    """Delete an event from the timeline."""
    user_id = _get_user_id(current_user)
    
    query = select(FamilyEvent).where(
        and_(FamilyEvent.id == event_id, FamilyEvent.user_id == user_id)
    )
    result = await session.execute(query)
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    await session.delete(event)
    await session.commit()
    
    return {"deleted": True, "id": event_id}


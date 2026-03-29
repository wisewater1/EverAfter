"""
Canonical onboarding API.

This consolidates onboarding status, health profile, media consent, family graph,
starter OCEAN profile, and first engram creation behind one backend path so the
frontend can stop treating local drafts and direct Supabase reads as the source of truth.
"""
from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.session import create_supabase_client, get_session
from app.models.dht import OceanProfile, OceanScores
from app.models.engram import Engram
from app.models.genealogy import FamilyNode, FamilyRelationship
from app.services import dht_store
from app.services.dht_engine import compute_behavioral_modifiers

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])
logger = logging.getLogger(__name__)


class HealthProfilePayload(BaseModel):
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    weightKg: Optional[float] = None
    heightCm: Optional[float] = None
    healthConditions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    healthGoals: List[str] = Field(default_factory=list)
    activityLevel: Optional[str] = None


class MediaConsentPayload(BaseModel):
    photoLibraryAccess: bool = False
    cameraAccess: bool = False
    videoAccess: bool = False
    allowFaceDetection: bool = False
    allowExpressionAnalysis: bool = False


class FirstEngramPayload(BaseModel):
    name: str
    archetype: str


class PersonalityQuizPayload(BaseModel):
    answers: Dict[str, int] = Field(default_factory=dict)
    scores: Optional[Dict[str, float]] = None


class RelativePayload(BaseModel):
    id: Optional[str] = None
    firstName: str
    lastName: str
    relationship: Literal["parent", "sibling", "spouse", "child"]
    birthYear: Optional[str] = None


class FamilySetupPayload(BaseModel):
    selfName: Optional[str] = None
    relatives: List[RelativePayload] = Field(default_factory=list)


class OnboardingReconcilePayload(BaseModel):
    current_step: Optional[int] = None
    completed_steps: Optional[List[str]] = None
    onboarding_complete: Optional[bool] = None
    onboarding_skipped: Optional[bool] = None
    skip_reason: Optional[str] = None
    health_profile: Optional[HealthProfilePayload] = None
    media_consent: Optional[MediaConsentPayload] = None
    first_engram: Optional[FirstEngramPayload] = None
    personality_quiz: Optional[PersonalityQuizPayload] = None
    family_setup: Optional[FamilySetupPayload] = None
    primary_member_id: Optional[str] = None


def _user_id(current_user: Dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("sub") or "anonymous")


def _user_email(current_user: Dict[str, Any], user_id: str) -> str:
    return str(current_user.get("email") or f"{user_id}@everafter.local")


def _user_display_name(current_user: Dict[str, Any], fallback_email: str) -> str:
    metadata = current_user.get("user_metadata") or {}
    return str(
        metadata.get("full_name")
        or metadata.get("name")
        or current_user.get("full_name")
        or fallback_email.split("@")[0]
        or "User"
    ).strip()


def _normalized_name(value: Optional[str]) -> str:
    return " ".join(str(value or "").strip().split()).lower()


def _split_name(full_name: Optional[str]) -> tuple[str, str]:
    parts = str(full_name or "").strip().split()
    if not parts:
        return ("Primary", "User")
    return (parts[0], " ".join(parts[1:]) or "User")


def _default_profile_bundle(current_user: Dict[str, Any]) -> Dict[str, Any]:
    user_id = _user_id(current_user)
    email = _user_email(current_user, user_id)
    return {
        "profile": {
            "id": user_id,
            "full_name": _user_display_name(current_user, email),
            "has_completed_onboarding": False,
            "onboarding_skipped": False,
        },
        "onboarding_status": {
            "user_id": user_id,
            "current_step": 1,
            "completed_steps": [],
            "onboarding_complete": False,
        },
        "health_profile": None,
        "media_consent": None,
    }


def _find_primary_node(nodes: List[FamilyNode], self_name: Optional[str]) -> Optional[FamilyNode]:
    wanted = _normalized_name(self_name)
    if wanted:
        for node in nodes:
            if _normalized_name(node.name) == wanted:
                return node
    return nodes[0] if nodes else None


async def _upsert_profile_records(
    current_user: Dict[str, Any],
    payload: OnboardingReconcilePayload,
) -> Dict[str, Any]:
    user_id = _user_id(current_user)
    email = _user_email(current_user, user_id)
    display_name = payload.family_setup.selfName if payload.family_setup and payload.family_setup.selfName else _user_display_name(current_user, email)
    client = create_supabase_client()

    profile_payload_candidates = [
        {
            "id": user_id,
            "email": email,
            "full_name": display_name,
            "has_completed_onboarding": bool(payload.onboarding_complete),
            "onboarding_skipped": bool(payload.onboarding_skipped),
            "onboarding_skipped_at": datetime.utcnow().isoformat() if payload.onboarding_skipped else None,
        },
        {
            "id": user_id,
            "display_name": display_name,
            "has_completed_onboarding": bool(payload.onboarding_complete),
            "onboarding_skipped": bool(payload.onboarding_skipped),
            "onboarding_skipped_at": datetime.utcnow().isoformat() if payload.onboarding_skipped else None,
        },
        {
            "id": user_id,
            "has_completed_onboarding": bool(payload.onboarding_complete),
            "onboarding_skipped": bool(payload.onboarding_skipped),
            "onboarding_skipped_at": datetime.utcnow().isoformat() if payload.onboarding_skipped else None,
        },
    ]
    for candidate in profile_payload_candidates:
        try:
            client.table("profiles").upsert(candidate, on_conflict="id").execute()
            break
        except Exception:
            continue

    completed_steps = payload.completed_steps or []
    onboarding_status_payload = {
        "user_id": user_id,
        "current_step": payload.current_step or max(len(completed_steps) + 1, 1),
        "completed_steps": completed_steps,
        "onboarding_complete": bool(payload.onboarding_complete),
        "skip_reason": payload.skip_reason,
        "last_step_at": datetime.utcnow().isoformat(),
        "completed_at": datetime.utcnow().isoformat() if payload.onboarding_complete else None,
        "welcome_completed": "welcome" in completed_steps,
        "meet_raphael_completed": "meet_raphael" in completed_steps,
        "health_profile_completed": "health_profile" in completed_steps,
        "health_connections_completed": "health_connections" in completed_steps,
        "media_permissions_completed": "media_permissions" in completed_steps,
        "first_engram_completed": "first_engram" in completed_steps,
    }
    client.table("onboarding_status").upsert(onboarding_status_payload, on_conflict="user_id").execute()

    if payload.health_profile is not None:
        health = payload.health_profile
        client.table("health_demographics").upsert(
            {
                "user_id": user_id,
                "date_of_birth": health.dateOfBirth,
                "gender": health.gender,
                "weight_kg": health.weightKg,
                "height_cm": health.heightCm,
                "health_conditions": health.healthConditions,
                "allergies": health.allergies,
                "health_goals": health.healthGoals,
                "activity_level": health.activityLevel,
            },
            on_conflict="user_id",
        ).execute()

    if payload.media_consent is not None:
        consent = payload.media_consent
        client.table("media_consent").upsert(
            {
                "user_id": user_id,
                "photo_library_access": consent.photoLibraryAccess,
                "camera_access": consent.cameraAccess,
                "video_access": consent.videoAccess,
                "allow_face_detection": consent.allowFaceDetection,
                "allow_expression_analysis": consent.allowExpressionAnalysis,
                "consent_given_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id",
        ).execute()

    profile_res = client.table("profiles").select("id, full_name, has_completed_onboarding, onboarding_skipped").eq("id", user_id).single().execute()
    status_res = client.table("onboarding_status").select("*").eq("user_id", user_id).single().execute()
    health_res = client.table("health_demographics").select("*").eq("user_id", user_id).limit(1).execute()
    media_res = client.table("media_consent").select("*").eq("user_id", user_id).limit(1).execute()

    return {
        "profile": profile_res.data or {},
        "onboarding_status": status_res.data or {},
        "health_profile": (health_res.data or [None])[0],
        "media_consent": (media_res.data or [None])[0],
    }


async def _reconcile_family_setup(
    session: AsyncSession,
    current_user: Dict[str, Any],
    payload: OnboardingReconcilePayload,
) -> Dict[str, Any]:
    if payload.family_setup is None:
        return {"primary_member_id": payload.primary_member_id, "family_setup": None}

    user_id = _user_id(current_user)
    nodes_result = await session.execute(select(FamilyNode).where(FamilyNode.user_id == user_id))
    nodes = list(nodes_result.scalars().all())

    primary_node = None
    if payload.primary_member_id:
        primary_node = next((node for node in nodes if node.id == payload.primary_member_id), None)

    if primary_node is None:
        primary_node = _find_primary_node(nodes, payload.family_setup.selfName)

    if primary_node is None:
        primary_node = FamilyNode(
            user_id=user_id,
            name=payload.family_setup.selfName or _user_display_name(current_user, _user_email(current_user, user_id)),
            gender="other",
        )
        session.add(primary_node)
        await session.flush()
        nodes.append(primary_node)
    elif payload.family_setup.selfName and primary_node.name != payload.family_setup.selfName:
        primary_node.name = payload.family_setup.selfName

    relationships_result = await session.execute(
        select(FamilyRelationship).where(
            (FamilyRelationship.from_node_id == primary_node.id) | (FamilyRelationship.to_node_id == primary_node.id)
        )
    )
    existing_relationships = list(relationships_result.scalars().all())

    relative_summaries: List[Dict[str, Any]] = []
    for relative in payload.family_setup.relatives:
        relative_name = f"{relative.firstName} {relative.lastName}".strip()
        relative_node = next((node for node in nodes if _normalized_name(node.name) == _normalized_name(relative_name)), None)

        if relative_node is None:
            relative_node = FamilyNode(
                user_id=user_id,
                name=relative_name,
                gender="other",
                birth_date=f"{relative.birthYear}-01-01" if relative.birthYear else None,
            )
            session.add(relative_node)
            await session.flush()
            nodes.append(relative_node)
        else:
            if relative.birthYear and not relative_node.birth_date:
                relative_node.birth_date = f"{relative.birthYear}-01-01"

        if relative.relationship == "parent":
            from_node_id, to_node_id = relative_node.id, primary_node.id
        else:
            from_node_id, to_node_id = primary_node.id, relative_node.id

        relation_exists = any(
            relationship.from_node_id == from_node_id
            and relationship.to_node_id == to_node_id
            and relationship.relation_type == relative.relationship
            for relationship in existing_relationships
        )
        if not relation_exists:
            new_relationship = FamilyRelationship(
                from_node_id=from_node_id,
                to_node_id=to_node_id,
                relation_type=relative.relationship,
            )
            session.add(new_relationship)
            await session.flush()
            existing_relationships.append(new_relationship)

        relative_summaries.append(
            {
                "id": relative_node.id,
                "firstName": relative.firstName,
                "lastName": relative.lastName,
                "relationship": relative.relationship,
                "birthYear": relative.birthYear,
            }
        )

    await session.commit()
    return {
        "primary_member_id": primary_node.id,
        "family_setup": {
            "selfName": primary_node.name,
            "relatives": relative_summaries,
        },
    }


async def _reconcile_first_engram(
    session: AsyncSession,
    current_user: Dict[str, Any],
    payload: OnboardingReconcilePayload,
) -> Optional[Dict[str, Any]]:
    if payload.first_engram is None:
        return None

    user_id = _user_id(current_user)
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        return None

    existing_result = await session.execute(
        select(Engram)
        .where(Engram.user_id == user_uuid)
        .where(Engram.name == payload.first_engram.name)
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return {"id": str(existing.id), "name": existing.name, "archetype": existing.archetype}

    engram = Engram(
        user_id=user_uuid,
        name=payload.first_engram.name,
        archetype=payload.first_engram.archetype,
        description=f"Starter onboarding engram for {_user_display_name(current_user, _user_email(current_user, user_id))}",
        personality_traits={
            "source": "onboarding_reconcile",
            "archetype": payload.first_engram.archetype,
        },
        training_status="ready",
    )
    session.add(engram)
    await session.commit()
    await session.refresh(engram)
    return {"id": str(engram.id), "name": engram.name, "archetype": engram.archetype}


def _reconcile_ocean_profile(primary_member_id: Optional[str], payload: OnboardingReconcilePayload) -> Optional[Dict[str, Any]]:
    scores = (payload.personality_quiz.scores if payload.personality_quiz else None) or {}
    if not primary_member_id or not scores:
        return None

    ocean_scores = OceanScores(
        O=float(scores.get("openness", scores.get("O", 50))),
        C=float(scores.get("conscientiousness", scores.get("C", 50))),
        E=float(scores.get("extraversion", scores.get("E", 50))),
        A=float(scores.get("agreeableness", scores.get("A", 50))),
        N=float(scores.get("neuroticism", scores.get("N", 50))),
    )
    all_versions = dht_store.get_all_ocean_versions(primary_member_id)
    latest = all_versions[0] if all_versions else None
    if latest and latest.scores.model_dump() == ocean_scores.model_dump():
        return latest.model_dump(mode="json")

    profile = OceanProfile(
        person_id=primary_member_id,
        version=(max((item.version for item in all_versions), default=0) + 1),
        scores=ocean_scores,
        behavioral_modifiers=compute_behavioral_modifiers(ocean_scores),
    )
    dht_store.save_ocean_profile(profile)
    return profile.model_dump(mode="json")


@router.get("/status")
async def get_onboarding_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user_id = _user_id(current_user)
    profile_bundle = _default_profile_bundle(current_user)
    try:
        client = create_supabase_client()
        profile_res = client.table("profiles").select("id, full_name, has_completed_onboarding, onboarding_skipped").eq("id", user_id).limit(1).execute()
        status_res = client.table("onboarding_status").select("*").eq("user_id", user_id).limit(1).execute()
        health_res = client.table("health_demographics").select("*").eq("user_id", user_id).limit(1).execute()
        media_res = client.table("media_consent").select("*").eq("user_id", user_id).limit(1).execute()
        profile_bundle = {
            "profile": (profile_res.data or [None])[0] or profile_bundle["profile"],
            "onboarding_status": (status_res.data or [None])[0] or profile_bundle["onboarding_status"],
            "health_profile": (health_res.data or [None])[0],
            "media_consent": (media_res.data or [None])[0],
        }
    except Exception:
        logger.warning("Onboarding status profile load failed for user %s", user_id, exc_info=True)

    nodes: List[FamilyNode] = []
    try:
        nodes_result = await session.execute(select(FamilyNode).where(FamilyNode.user_id == user_id))
        nodes = list(nodes_result.scalars().all())
    except Exception:
        logger.warning("Onboarding family load failed for user %s", user_id, exc_info=True)

    primary_node = _find_primary_node(nodes, (profile_bundle.get("profile") or {}).get("full_name"))

    family_setup = None
    personality_quiz = None
    if primary_node is not None:
        try:
            rels_result = await session.execute(
                select(FamilyRelationship).where(
                    (FamilyRelationship.from_node_id == primary_node.id) | (FamilyRelationship.to_node_id == primary_node.id)
                )
            )
            relatives: List[Dict[str, Any]] = []
            for relationship in rels_result.scalars().all():
                other_id = relationship.to_node_id if relationship.from_node_id == primary_node.id else relationship.from_node_id
                other = next((node for node in nodes if node.id == other_id), None)
                if other is None:
                    continue
                first_name, last_name = _split_name(other.name)
                relatives.append(
                    {
                        "id": other.id,
                        "firstName": first_name,
                        "lastName": last_name,
                        "relationship": relationship.relation_type,
                        "birthYear": str(other.birth_date or "")[:4] or None,
                    }
                )
            family_setup = {
                "selfName": primary_node.name,
                "relatives": relatives,
            }
        except Exception:
            logger.warning("Onboarding relationship load failed for user %s", user_id, exc_info=True)

        try:
            latest_ocean = dht_store.get_latest_ocean(primary_node.id)
            if latest_ocean is not None:
                personality_quiz = {
                    "answers": {},
                    "scores": {
                        "openness": latest_ocean.scores.O,
                        "conscientiousness": latest_ocean.scores.C,
                        "extraversion": latest_ocean.scores.E,
                        "agreeableness": latest_ocean.scores.A,
                        "neuroticism": latest_ocean.scores.N,
                    },
                }
        except Exception:
            logger.warning("Onboarding OCEAN profile load failed for user %s", user_id, exc_info=True)

    try:
        user_uuid = UUID(user_id)
        engram_result = await session.execute(
            select(Engram).where(Engram.user_id == user_uuid).order_by(Engram.created_at.desc())
        )
        first_engram = next(iter(engram_result.scalars().all()), None)
    except Exception:
        logger.warning("Onboarding engram load failed for user %s", user_id, exc_info=True)
        first_engram = None

    return {
        **profile_bundle,
        "primary_member_id": primary_node.id if primary_node is not None else None,
        "family_setup": family_setup,
        "personality_quiz": personality_quiz,
        "first_engram": (
            {
                "id": str(first_engram.id),
                "name": first_engram.name,
                "archetype": first_engram.archetype,
            }
            if first_engram is not None
            else None
        ),
    }


@router.post("/reconcile")
async def reconcile_onboarding(
    payload: OnboardingReconcilePayload = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    profile_bundle = await _upsert_profile_records(current_user, payload)
    family_bundle = await _reconcile_family_setup(session, current_user, payload)
    first_engram = await _reconcile_first_engram(session, current_user, payload)
    ocean_profile = _reconcile_ocean_profile(family_bundle.get("primary_member_id"), payload)

    return {
        "ok": True,
        **profile_bundle,
        **family_bundle,
        "first_engram": first_engram,
        "personality_quiz": (
            {
                "answers": payload.personality_quiz.answers if payload.personality_quiz else {},
                "scores": payload.personality_quiz.scores if payload.personality_quiz else None,
                "profile": ocean_profile,
            }
            if payload.personality_quiz is not None
            else None
        ),
    }


@router.post("/import-local")
async def import_local_onboarding(
    payload: OnboardingReconcilePayload = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await reconcile_onboarding(payload, current_user, session)

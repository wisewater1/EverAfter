import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings


class SaintFallbackStore:
    def __init__(self, storage_dir: Optional[str] = None):
        self.root = Path(storage_dir or settings.SAINT_FALLBACK_STORAGE_DIR)
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    @staticmethod
    def _synthetic_engram_id(user_id: str, saint_id: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"saint:{saint_id}:user:{user_id}"))

    @staticmethod
    def _synthetic_conversation_id(user_id: str, saint_id: str) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"saint:{saint_id}:conversation:{user_id}"))

    def _state_path(self, user_id: str, saint_id: str) -> Path:
        safe_user = str(user_id).replace("/", "_")
        safe_saint = str(saint_id).replace("/", "_")
        return self.root / f"{safe_user}__{safe_saint}.json"

    def _default_state(self, user_id: str, saint_id: str, saint_name: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        return {
            "user_id": str(user_id),
            "saint_id": saint_id,
            "name": saint_name,
            "engram_id": self._synthetic_engram_id(str(user_id), saint_id),
            "conversation_id": self._synthetic_conversation_id(str(user_id), saint_id),
            "messages": [],
            "knowledge": [],
            "created_at": now,
            "updated_at": now,
        }

    def _read_state_sync(self, user_id: str, saint_id: str, saint_name: str) -> tuple[Dict[str, Any], bool]:
        path = self._state_path(user_id, saint_id)
        if not path.exists():
            return self._default_state(user_id, saint_id, saint_name), True

        try:
            state = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(state, dict):
                raise ValueError("Invalid saint fallback state")
        except Exception:
            state = self._default_state(user_id, saint_id, saint_name)
            return state, True

        state.setdefault("user_id", str(user_id))
        state.setdefault("saint_id", saint_id)
        state["name"] = saint_name
        state.setdefault("engram_id", self._synthetic_engram_id(str(user_id), saint_id))
        state.setdefault("conversation_id", self._synthetic_conversation_id(str(user_id), saint_id))
        state.setdefault("messages", [])
        state.setdefault("knowledge", [])
        state.setdefault("created_at", datetime.utcnow().isoformat())
        state["updated_at"] = datetime.utcnow().isoformat()
        return state, False

    def _write_state_sync(self, user_id: str, saint_id: str, state: Dict[str, Any]) -> None:
        path = self._state_path(user_id, saint_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(state, ensure_ascii=True, indent=2), encoding="utf-8")
        temp_path.replace(path)

    async def _mutate_state(
        self,
        user_id: str,
        saint_id: str,
        saint_name: str,
        mutate,
    ) -> Any:
        async with self._lock:
            state, is_new = await asyncio.to_thread(self._read_state_sync, user_id, saint_id, saint_name)
            result = mutate(state, is_new)
            state["updated_at"] = datetime.utcnow().isoformat()
            await asyncio.to_thread(self._write_state_sync, user_id, saint_id, state)
            return result

    async def bootstrap(self, user_id: str, saint_id: str, saint_name: str) -> Dict[str, Any]:
        def mutate(state: Dict[str, Any], is_new: bool) -> Dict[str, Any]:
            return {
                "engram_id": state["engram_id"],
                "conversation_id": state["conversation_id"],
                "name": saint_name,
                "is_new": is_new,
            }

        return await self._mutate_state(user_id, saint_id, saint_name, mutate)

    async def get_history(self, user_id: str, saint_id: str, saint_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        async with self._lock:
            state, _ = await asyncio.to_thread(self._read_state_sync, user_id, saint_id, saint_name)
            return list(state.get("messages", []))[-limit:]

    async def get_recent_conversation_messages(
        self,
        user_id: str,
        saint_id: str,
        saint_name: str,
        *,
        limit: int = 10,
        pending_user_message: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        history = await self.get_history(user_id, saint_id, saint_name, limit=limit)
        conversation = [{"role": item["role"], "content": item["content"]} for item in history if item.get("role") in {"user", "assistant"}]
        if pending_user_message:
            conversation.append({"role": "user", "content": pending_user_message})
        return conversation[-limit:]

    async def append_exchange(
        self,
        user_id: str,
        saint_id: str,
        saint_name: str,
        user_message: str,
        assistant_message: str,
        *,
        created_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        timestamp = created_at or datetime.utcnow().isoformat()
        assistant_id = str(uuid.uuid4())

        def mutate(state: Dict[str, Any], _is_new: bool) -> Dict[str, Any]:
            state.setdefault("messages", []).extend(
                [
                    {
                        "id": str(uuid.uuid4()),
                        "role": "user",
                        "content": user_message,
                        "timestamp": timestamp,
                    },
                    {
                        "id": assistant_id,
                        "role": "assistant",
                        "content": assistant_message,
                        "timestamp": timestamp,
                    },
                ]
            )
            state["messages"] = state["messages"][-100:]
            return {
                "id": assistant_id,
                "conversation_id": state["conversation_id"],
                "engram_id": state["engram_id"],
                "created_at": timestamp,
            }

        return await self._mutate_state(user_id, saint_id, saint_name, mutate)

    async def upsert_knowledge(
        self,
        user_id: str,
        saint_id: str,
        saint_name: str,
        *,
        key: str,
        value: str,
        category: str,
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        timestamp = datetime.utcnow().isoformat()

        def mutate(state: Dict[str, Any], _is_new: bool) -> Dict[str, Any]:
            knowledge_items = state.setdefault("knowledge", [])
            for item in knowledge_items:
                if item.get("key") == key:
                    item.update(
                        {
                            "value": value,
                            "category": category,
                            "confidence": confidence,
                            "updated_at": timestamp,
                        }
                    )
                    return item

            new_item = {
                "id": str(uuid.uuid4()),
                "key": key,
                "value": value,
                "category": category,
                "confidence": confidence,
                "updated_at": timestamp,
            }
            knowledge_items.append(new_item)
            state["knowledge"] = knowledge_items[-100:]
            return new_item

        return await self._mutate_state(user_id, saint_id, saint_name, mutate)

    async def get_knowledge(
        self,
        user_id: str,
        saint_id: str,
        saint_name: str,
        *,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            state, _ = await asyncio.to_thread(self._read_state_sync, user_id, saint_id, saint_name)
            items = list(state.get("knowledge", []))
            if category:
                items = [item for item in items if item.get("category") == category]
            return list(reversed(items[-limit:]))

    async def get_status(self, user_id: str, saint_id: str, saint_name: str) -> Dict[str, Any]:
        async with self._lock:
            state, is_new = await asyncio.to_thread(self._read_state_sync, user_id, saint_id, saint_name)
            return {
                "engram_id": state.get("engram_id"),
                "knowledge_count": len(state.get("knowledge", [])),
                "message_count": len(state.get("messages", [])),
                "is_active": not is_new or bool(state.get("messages")) or bool(state.get("knowledge")),
            }


saint_fallback_store = SaintFallbackStore()

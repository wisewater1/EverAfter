import asyncio
from typing import Dict, List, Callable, Awaitable, Any, Type
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# --- Event Schemas ---

class SaintEvent(BaseModel):
    """Base class for all inter-saint events."""
    event_type: str
    timestamp: datetime = datetime.utcnow()
    source_saint: str
    target_saint: str = "broadcast"  # "broadcast" or specific saint_id
    payload: Dict[str, Any]

class HealthDeclineEvent(SaintEvent):
    """Triggered when St. Raphael detects a significant health drop."""
    event_type: str = "health_decline"
    source_saint: str = "raphael"
    
class FinancialCrisisEvent(SaintEvent):
    """Triggered when St. Gabriel detects financial instability."""
    event_type: str = "financial_crisis"
    source_saint: str = "gabriel"
    # Specific fields
    amount: float = 0.0
    severity: str = "medium"

class LifeMilestoneEvent(SaintEvent):
    """Triggered by various saints for major life events (marriage, birth, etc)."""
    event_type: str = "life_milestone"
    milestone_type: str  # 'birthday', 'job_change', 'marriage'
    description: str

class SecurityBreachEvent(SaintEvent):
    """Triggered when St. Michael detects a security threat."""
    event_type: str = "security_breach"
    source_saint: str = "michael"
    severity: str = "high"
    location: str = "unknown"

class PersonalityDriftEvent(SaintEvent):
    """Triggered by ReflectionEngine when an agent evolves."""
    event_type: str = "personality_drift"
    source_saint: str
    sentiment_delta: float  # -1.0 to 1.0 (negative = more neurotic/withdrawn, positive = more open/extraverted)
    trigger_memory: str

# --- Event Bus ---

class SaintEventBus:
    """
    In-memory specialized Event Bus for the Society of Saints.
    Allows Saints to subscribe to and publish events to coordinate actions.
    """
    _instance = None
    _subscribers: Dict[str, List[Callable[[SaintEvent], Awaitable[None]]]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SaintEventBus, cls).__new__(cls)
            cls._instance._subscribers = {}
        return cls._instance

    def subscribe(self, event_type: str, handler: Callable[[SaintEvent], Awaitable[None]]):
        """Register a async handler for a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.info(f"SaintEventBus: Handler registered for {event_type}")

    async def publish(self, event: SaintEvent):
        """Publish an event to all subscribers."""
        logger.info(f"SaintEventBus: Publishing {event.event_type} from {event.source_saint}")
        
        if event.event_type in self._subscribers:
            handlers = self._subscribers[event.event_type]
            # Execute handlers concurrently
            await asyncio.gather(
                *[self._safe_execute(handler, event) for handler in handlers]
            )
        
        # Also handle "broadcast" or wildcard subscriptions if we add them later

    async def _safe_execute(self, handler, event):
        try:
            await handler(event)
        except Exception as e:
            logger.error(f"SaintEventBus: Error in handler for {event.event_type}: {e}")

# Singleton accessor
saint_event_bus = SaintEventBus()

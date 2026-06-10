import asyncio
import logging
from typing import List, Callable, Dict, Any, Optional
from app.schemas.saint_runtime import AgentEvent

logger = logging.getLogger(__name__)

class AgentBus:
    """
    Simple in-memory Event Bus for Saint Inter-Communication.
    Allows agents to subscribe to events and publish new ones.
    """
    def __init__(self):
        self._subscribers: List[Callable[[AgentEvent], Any]] = []
        self._queue: Optional[asyncio.Queue] = None
        self._is_running = False

    @property
    def queue(self) -> asyncio.Queue:
        if self._queue is None:
            self._queue = asyncio.Queue()
        return self._queue

    def subscribe(self, callback: Callable[[AgentEvent], Any]):
        """Register a callback for all events."""
        self._subscribers.append(callback)

    async def publish(self, event: AgentEvent):
        """Publish an event to the bus."""
        logger.info(f"AgentBus: Received event {event.type} from {event.sender}")
        await self.queue.put(event)

    async def listen(self):
        """Background loop to process events."""
        self._is_running = True
        logger.info("AgentBus Listener Started")
        while self._is_running:
            try:
                event = await self.queue.get()
                for callback in self._subscribers:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(event)
                        else:
                            callback(event)
                    except Exception as e:
                        logger.error(f"Error in subscriber callback: {e}")
                
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in AgentBus loop: {e}")

    def stop(self):
        self._is_running = False

# Singleton
agent_bus = AgentBus()

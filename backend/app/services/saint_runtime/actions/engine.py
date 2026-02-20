import logging
import json
import re
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.saint import GuardianIntercession

logger = logging.getLogger(__name__)

class ActionEngine:
    """
    Parses LLM responses for <ACTION>...</ACTION> JSON blocks,
    executes the requested real-world simulated actions, and returns results.
    """
    
    def __init__(self):
        # Register available tools
        self.tools: Dict[str, Callable] = {
            "send_email": self._action_send_email,
            "create_calendar_event": self._action_create_calendar_event,
            "order_delivery": self._action_order_delivery
        }

    def parse_and_execute(self, session: AsyncSession, llm_response: str, user_id: str, saint_id: str) -> tuple[str, List[Dict[str, Any]]]:
        """
        Extracts action blocks from the text, drafts them as GuardianIntercessions
        in the database, and returns the cleaned text + list of drafted actions.
        """
        action_pattern = re.compile(r"<ACTION>(.*?)</ACTION>", re.DOTALL)
        actions_found = action_pattern.findall(llm_response)
        
        drafted_actions = []
        cleaned_response = action_pattern.sub("", llm_response).strip()
        
        for action_str in actions_found:
            try:
                # Sometimes LLMs add markdown code blocks inside the XML tags
                clean_json = action_str.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                    
                action_data = json.loads(clean_json.strip())
                tool_name = action_data.get("tool")
                kwargs = action_data.get("kwargs", {})
                
                if tool_name in self.tools:
                    logger.info(f"ActionEngine: Drafting '{tool_name}' for user {user_id} by {saint_id}")
                    
                    # Instead of executing it, create a drafted intercession
                    import uuid
                    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                    
                    # Generate a human-readable description for the UI
                    description = f"Proposed Action: {tool_name}"
                    if tool_name == "send_email":
                        description = f"Draft an email to {kwargs.get('to')} regarding '{kwargs.get('subject')}'"
                    elif tool_name == "create_calendar_event":
                        description = f"Create a calendar event for '{kwargs.get('title')}' on {kwargs.get('date')}"
                    elif tool_name == "order_delivery":
                        description = f"Initiate a delivery order via {kwargs.get('service')}"
                    
                    new_intercession = GuardianIntercession(
                        user_id=user_uuid,
                        saint_id=saint_id,
                        description=description,
                        tool_name=tool_name,
                        tool_kwargs=kwargs,
                        status="pending"
                    )
                    
                    session.add(new_intercession)
                    # We don't commit here, we let the caller (SaintAgentService.chat) commit the transaction.
                    
                    drafted_actions.append({
                        "tool": tool_name,
                        "description": description,
                        "status": "pending_approval"
                    })
                else:
                    logger.warning(f"ActionEngine: Tool '{tool_name}' not found.")
                    
            except json.JSONDecodeError as e:
                logger.error(f"ActionEngine: Failed to parse action JSON: {e} - Content: {action_str}")
            except Exception as e:
                logger.error(f"ActionEngine: Error executing action: {e}")
                
        return cleaned_response, drafted_actions

    # --- Tool Implementations (Simulated for Phase 1) ---

    def _action_send_email(self, user_id: str, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Simulates sending an email on behalf of the user."""
        logger.info(f"[SIMULATED EMAIL] To: {to}, Subject: {subject}")
        # In a real impl, this would call SendGrid, AWS SES, or an SMTP server
        return {
            "status": "success",
            "message": f"Drafted simulated email to {to}",
            "delivered": True
        }

    def _action_create_calendar_event(self, user_id: str, title: str, date: str, time: str, attendees: Optional[List[str]] = None) -> Dict[str, Any]:
        """Simulates creating a household calendar event."""
        logger.info(f"[SIMULATED CALENDAR EVENT] {title} at {date} {time}")
        # In a real impl, this would insert into the FamilyEvent DB or call Google Calendar API
        return {
            "status": "success",
            "message": f"Added '{title}' to the household calendar.",
            "event_date": date
        }

    def _action_order_delivery(self, user_id: str, service: str, items: List[str], address: str) -> Dict[str, Any]:
        """Simulates ordering groceries or food delivery."""
        logger.info(f"[SIMULATED DELIVERY] Service: {service}, Items: {items}")
        # In a real impl, this would hit the Instacart or DoorDash API
        return {
            "status": "success",
            "message": f"Initiated simulated {service} delivery order.",
            "items_count": len(items)
        }

action_engine = ActionEngine()

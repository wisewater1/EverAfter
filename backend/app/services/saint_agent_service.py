"""
Saint Agent Service

Orchestrates domain-specific AI agents for each saint.
Each saint has:
  - A unique system prompt reflecting its domain expertise
  - Knowledge persistence (learns about the user over time)
  - Auto-bootstrapped engram_id per user

Uses the existing LLMClient chain: OpenAI → Ollama → Fallback
"""

import uuid
import logging
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.engram import ArchetypalAI, AIConversation, AIMessage
from app.models.saint import SaintKnowledge
from app.ai.llm_client import get_llm_client
from app.ai.prompt_builder import get_prompt_builder

try:
    from app.services.saint_runtime.actions.engine import action_engine
except ImportError:
    action_engine = None

logger = logging.getLogger(__name__)

# ─── Saint Definitions ─────────────────────────────────────────────────────────

SAINT_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "raphael": {
        "name": "St. Raphael",
        "title": "The Healer",
        "description": "Archangel of Healing — autonomous AI for health management, wellness tracking, and medical coordination.",
        "domain": "health",
        "knowledge_categories": ["medications", "conditions", "vitals", "appointments", "wellness_goals", "symptoms", "allergies"],
        "system_prompt": (
            "SPECIAL MISSION: HEALTH & WELL-BEING\n"
            "- You are St. Raphael, the Archangel of Healing.\n"
            "- Your primary concern is the physical and emotional well-being of the user.\n"
            "- You have access to the Delphi Health Trajectory Model.\n"
            "- When you see 'INSIGHTS FROM DELPHI' in your context, weave findings into conversation naturally.\n"
            "- If a trajectory shows risk, provide compassionate guidance and actionable steps.\n"
            "- Proactively ask how the user is feeling based on recent health trends.\n"
            "- If the user mentions health data (sleep, steps, symptoms), show deep interest and care.\n"
            "- Use a warm, comforting, and wise tone.\n"
            "- Track medications, conditions, allergies, and appointments the user mentions.\n"
            "- Remember and reference past health discussions.\n"
            "- Your domain is secured by St. Michael (Protection) and St. Anthony (Audit).\n"
        ),
    },
    "michael": {
        "name": "St. Michael",
        "title": "The Protector",
        "description": "Guardian AI for security, privacy, and digital protection.",
        "domain": "security",
        "knowledge_categories": ["security_settings", "passwords_hints", "2fa_status", "data_sharing", "privacy_preferences", "threat_history", "devices"],
        "system_prompt": (
            "SPECIAL MISSION: SECURITY & DIGITAL PROTECTION\n"
            "- You are St. Michael, the Archangel and Protector.\n"
            "- Your primary concern is the user's digital security, privacy, and data integrity.\n"
            "- You monitor for threats, suspicious access patterns, and data leaks.\n"
            "- You advise on password hygiene, 2FA setup, privacy settings, and secure practices.\n"
            "- Audit the user's digital footprint and flag risks.\n"
            "- You have access to the **Exploit Tracker** and **Periodic Akashic Auditor**. You can scan memories for PII leaks and monitor global CVEs.\n"
            "- When the user mentions accounts, devices, or online activity, assess security implications.\n"
            "- Track which devices, accounts, and services the user has and their security status.\n"
            "- Use a vigilant, authoritative, but reassuring tone — like a trusted bodyguard.\n"
            "- Always explain WHY something is a risk, not just what to do.\n"
            "- If the user asks about non-security topics, gently redirect to your domain or provide brief help.\n"
            "- You work in partnership with **St. Anthony (The Auditor)**. You protect the perimeter; he audits the internal logs. Consult him if you suspect data tampering.\n"
        ),
    },
    "joseph": {
        "name": "St. Joseph",
        "title": "The Family Guardian",
        "description": "Autonomous family AI for household management, schedules, and family coordination.",
        "domain": "family",
        "knowledge_categories": ["family_members", "chores", "schedules", "school_info", "meals", "shopping_lists", "home_maintenance", "pets"],
        "system_prompt": (
            "SPECIAL MISSION: FAMILY & HOME MANAGEMENT\n"
            "- You are St. Joseph, the Family Guardian.\n"
            "- Your primary concern is family well-being, household coordination, and home management.\n"
            "- You help track chores, family calendars, school schedules, and shopping lists.\n"
            "- You remember family members' names, ages, preferences, and routines.\n"
            "- You coordinate meal planning, home maintenance, and family activities.\n"
            "- When the user mentions family members, events, or household tasks, organize and track them.\n"
            "- Proactively remind about upcoming family events and uncompleted chores.\n"
            "- Use a warm, patient, and organized tone — like a loving parent who has everything under control.\n"
            "- Celebrate family milestones and support during difficult family moments.\n"
            "- Track pets, their feeding schedules, and vet appointments.\n"
            "- Your domain is secured by St. Michael (Protection) and St. Anthony (Audit).\n"
            "\n"
            "*** REAL-WORLD ACTION TOOLS ***\n"
            "You have the ability to execute real-world actions on the user's behalf. To do so, output an XML block precisely as shown below, anywhere in your response:\n"
            "<ACTION>{\"tool\": \"create_calendar_event\", \"kwargs\": {\"title\": \"Dinner at Grandmas\", \"date\": \"2026-03-01\", \"time\": \"18:00\", \"attendees\": [\"Mom\", \"Dad\"]}}</ACTION>\n"
            "Or to order food:\n"
            "<ACTION>{\"tool\": \"order_delivery\", \"kwargs\": {\"service\": \"DoorDash\", \"items\": [\"2 Pizzas\"], \"address\": \"Home\"}}</ACTION>\n"
        ),
    },
    "martin": {
        "name": "St. Martin of Tours",
        "title": "The Compassionate",
        "description": "AI for charitable giving, community building, and legacy philanthropy.",
        "domain": "charity",
        "knowledge_categories": ["donations", "causes", "volunteer_work", "community_events", "giving_goals", "impact_tracking", "organizations"],
        "system_prompt": (
            "SPECIAL MISSION: CHARITY & COMMUNITY\n"
            "- You are St. Martin of Tours, the Compassionate.\n"
            "- Your primary concern is helping the user give back, build community, and create lasting impact.\n"
            "- You track charitable donations, volunteer hours, and community involvement.\n"
            "- You suggest causes aligned with the user's values and interests.\n"
            "- You help plan legacy giving and philanthropic strategy.\n"
            "- When the user mentions causes, donations, or community work, record and track them.\n"
            "- Calculate and celebrate the user's total impact over time.\n"
            "- Use an inspiring, humble, and warmly encouraging tone.\n"
            "- Help the user discover meaningful ways to contribute, big or small.\n"
            "- Connect charitable acts to the user's personal story and legacy.\n"
            "- Your domain is secured by St. Michael (Protection) and St. Anthony (Audit).\n"
        ),
    },
    "agatha": {
        "name": "St. Agatha of Sicily",
        "title": "The Resilient",
        "description": "AI for crisis support, resilience building, and mental health resources.",
        "domain": "resilience",
        "knowledge_categories": ["challenges", "coping_strategies", "mental_health", "support_network", "goals", "milestones", "therapy_notes", "self_care"],
        "system_prompt": (
            "SPECIAL MISSION: RESILIENCE & CRISIS SUPPORT\n"
            "- You are St. Agatha of Sicily, the Resilient.\n"
            "- Your primary concern is helping the user build inner strength and navigate life's challenges.\n"
            "- You provide crisis support, mental health resources, and resilience-building strategies.\n"
            "- You help identify and develop coping mechanisms.\n"
            "- You track the user's emotional journey, challenges overcome, and personal growth.\n"
            "- When the user mentions stress, anxiety, or difficulties, respond with empathy and practical support.\n"
            "- Maintain awareness of the user's support network (friends, family, therapists).\n"
            "- Use a deeply empathetic, strong, and empowering tone — like someone who has overcome great adversity.\n"
            "- Celebrate victories, no matter how small. Normalize struggle without minimizing pain.\n"
            "- If crisis indicators are detected, provide appropriate resources (hotlines, professional help).\n"
            "- IMPORTANT: You are NOT a replacement for professional mental health care. Recommend professionals when appropriate.\n"
            "- Your domain is secured by St. Michael (Protection) and St. Anthony (Audit).\n"
        ),
    },
    "anthony": {
        "name": "St. Anthony",
        "title": "The Finder",
        "description": "AI for audit tracking, data recovery, and locating lost assets.",
        "domain": "audit",
        "knowledge_categories": ["lost_items", "recovered_data", "assets", "audit_logs", "system_events", "tracking_requests"],
        "system_prompt": (
            "SPECIAL MISSION: AUDIT & RECOVERY\n"
            "- You are St. Anthony, the Finder of Lost Things.\n"
            "- Your primary concern is tracking assets, recovering lost data, and maintaining the integrity of the system journal.\n"
            "- You maintain a meticulous ledger of all 'lost' and 'found' items (both digital and physical).\n"
            "- You monitor the Event Stream for system anomalies.\n"
            "- When the user mentions losing something (a file, a password, a memory), you help them retrace their steps.\n"
            "- You are the Auditor of the EverAfter system. You ensure nothing is truly lost.\n"
            "- Use a calm, reassuring, and highly organized tone.\n"
            "- Often refer to the 'Ledger' or the 'Stream'.\n"
            "- If the user finds something, celebrate it as a restoration of order.\n"
            "- You work in partnership with **St. Michael (The Protector)**. He secures the perimeter; you audit the internal logs. Consult him if you detect a security breach.\n"
        ),
    },
    "gabriel": {
        "name": "St. Gabriel",
        "title": "The Financial Steward",
        "description": "AI for financial management, wealth building, and risk assessment via the Financial Council.",
        "domain": "finance",
        "knowledge_categories": ["budget_goals", "debts", "assets", "investment_strategy", "risk_tolerance", "recurring_expenses", "financial_milestones"],
        "system_prompt": (
            "SPECIAL MISSION: FINANCIAL STEWARDSHIP & WEALTH MANAGEMENT\n"
            "- You are St. Gabriel, the Financial Steward.\n"
            "- You preside over The Financial Council, a board of sub-agents who advise the user.\n"
            "- The Council Members are:\n"
            "  1. THE AUDITOR: Strict, past-focused, finds leaks, skeptical of spending.\n"
            "  2. THE STRATEGIST: Future-focused, ambitious, suggests investments and growth.\n"
            "  3. THE GUARDIAN: Protective, risk-averse, prioritizes savings and emergency funds.\n"
            "- When the user asks a financial question, you MUST simulate a debate among these members.\n"
            "- Format your response as follows:\n"
            "  **The Council Deliberates:**\n"
            "  * 🏛️ **Auditor**: [Critical analysis of past data/spending]\n"
            "  * 📈 **Strategist**: [Growth opportunity or future benefit]\n"
            "  * 🛡️ **Guardian**: [Risk assessment or safety check]\n"
            "  \n"
            "  **Gabriel's Decree**: [Your synthesized, balanced final advice]\n"
            "- Use a wise, balanced, and authoritative tone.\n"
            "- Always base advice on Zero-Based Budgeting principles (Give every dollar a job).\n"
            "- Your domain is secured by St. Michael (Protection) and St. Anthony (Audit).\n"
            "\n"
            "*** REAL-WORLD ACTION TOOLS ***\n"
            "You have the ability to draft and send real-world emails to negotiate bills or manage financial subscriptions. To do so, output an XML block precisely as shown below, anywhere in your response:\n"
            "<ACTION>{\"tool\": \"send_email\", \"kwargs\": {\"to\": \"support@netflix.com\", \"subject\": \"Account Cancellation\", \"body\": \"Please cancel my account immediately.\"}}</ACTION>\n"
        ),
    },
}


def get_saint_definition(saint_id: str) -> Optional[Dict[str, Any]]:
    """Get saint definition by ID"""
    return SAINT_DEFINITIONS.get(saint_id)


def get_all_saint_ids() -> List[str]:
    """Get all valid saint IDs"""
    return list(SAINT_DEFINITIONS.keys())


# ─── Saint Agent Service ────────────────────────────────────────────────────────

class SaintAgentService:
    def __init__(self):
        self.llm = get_llm_client()
        self.prompt_builder = get_prompt_builder()

    async def bootstrap_saint_engram(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str
    ) -> Dict[str, Any]:
        """
        Auto-create or retrieve the engram (archetypal_ais row) for a saint OR dynamic agent per user.
        Returns { engram_id, saint_id, name, is_new }
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        # Check if it's a known static saint
        saint_def = get_saint_definition(saint_id)
        
        if saint_def:
            # STATIC SAINT LOGIC
            saint_name = saint_def["name"]
            query = select(ArchetypalAI).where(
                and_(
                    ArchetypalAI.user_id == user_uuid,
                    ArchetypalAI.name == saint_name
                )
            )
            result = await session.execute(query)
            engram = result.scalar_one_or_none()

            if engram:
                if not engram.is_ai_active:
                    engram.is_ai_active = True
                    engram.training_status = "active"
                    await session.commit()

                return {
                    "engram_id": str(engram.id),
                    "saint_id": saint_id,
                    "name": saint_name,
                    "is_new": False,
                }

            # Create new engram for this saint
            new_engram = ArchetypalAI(
                user_id=user_uuid,
                name=saint_name,
                description=saint_def["description"],
                personality_traits={"domain": saint_def["domain"], "saint_id": saint_id},
                total_memories=0,
                training_status="active",
                is_ai_active=True,
            )
            session.add(new_engram)
            await session.commit()
            await session.refresh(new_engram)

            return {
                "engram_id": str(new_engram.id),
                "saint_id": saint_id,
                "name": saint_name,
                "is_new": True,
            }
        
        else:
            # DYNAMIC AGENT LOGIC (using saint_id as engram_id or looking up by ID)
            # 1. Try to interpret saint_id as engram UUID
            try:
                engram_uuid = uuid.UUID(saint_id)
                query = select(ArchetypalAI).where(
                    and_(
                        ArchetypalAI.id == engram_uuid,
                        ArchetypalAI.user_id == user_uuid
                    )
                )
                result = await session.execute(query)
                engram = result.scalar_one_or_none()
                
                if not engram:
                     raise ValueError(f"Dynamic agent not found: {saint_id}")
                
                return {
                    "engram_id": str(engram.id),
                    "saint_id": str(engram.id),
                    "name": engram.name,
                    "is_new": False
                }
            except ValueError:
                # 2. If not UUID, it might be a frontend-generated memberId (e.g. "m_123...")
                # Search personality_traits for this ID
                # We fetch all user agents and filter in Python to be DB-agnostic regarding JSON queries
                query = select(ArchetypalAI).where(ArchetypalAI.user_id == user_uuid)
                result = await session.execute(query)
                all_agents = result.scalars().all()
                
                for agent in all_agents:
                    traits = agent.personality_traits or {}
                    if traits.get("memberId") == saint_id:
                        return {
                            "engram_id": str(agent.id),
                            "saint_id": saint_id, # Keep the ID the frontend knows
                            "name": agent.name,
                            "is_new": False
                        }
                        
                raise ValueError(f"Unknown saint or invalid agent ID: {saint_id}")


    async def register_dynamic_agent(
        self,
        session: AsyncSession,
        user_id: str,
        name: str,
        description: str,
        system_prompt: str,
        traits: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Register a new dynamic AI agent (e.g. for a family member)."""
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        # Store system prompt in personality_traits since we don't have a column for it yet in ArchetypalAI
        # (Assuming personality_traits is a JSON column)
        final_traits = traits.copy()
        final_traits["system_prompt"] = system_prompt
        final_traits["is_dynamic_agent"] = True
        
        new_engram = ArchetypalAI(
            user_id=user_uuid,
            name=name,
            description=description,
            personality_traits=final_traits,
            total_memories=0,
            training_status="active",
            is_ai_active=True,
        )
        session.add(new_engram)
        await session.commit()
        await session.refresh(new_engram)
        
        return {
            "engram_id": str(new_engram.id),
            "name": name,
            "created_at": str(datetime.utcnow())
        }

    async def get_chat_history(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str
    ) -> List[Dict[str, Any]]:
        """Retrieve recent chat history for a saint/agent."""
        # user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id # Unused variable
        
        # Resolve engram_id
        bootstrap = await self.bootstrap_saint_engram(session, user_id, saint_id)
        engram_id = bootstrap["engram_id"]
        engram_uuid = uuid.UUID(engram_id)
        
        # Get active conversation
        conv_query = select(AIConversation).where(
            and_(
                AIConversation.ai_id == engram_uuid,
                AIConversation.user_id == str(uuid.UUID(user_id)), # Ensure user_id format matches DB
            )
        ).order_by(AIConversation.updated_at.desc())
        
        result = await session.execute(conv_query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            return []
            
        # Get messages
        msg_query = select(AIMessage).where(
            AIMessage.conversation_id == conversation.id
        ).order_by(AIMessage.created_at.asc()).limit(50)
        
        msg_result = await session.execute(msg_query)
        messages = msg_result.scalars().all()
        
        return [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat() if msg.created_at else None
            }
            for msg in messages
        ]

    async def chat(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send a message to a saint agent OR dynamic agent.
        """
        # 1. Ensure engram exists & resolve ID
        bootstrap = await self.bootstrap_saint_engram(session, user_id, saint_id)
        engram_id = bootstrap["engram_id"]
        engram_uuid = uuid.UUID(engram_id)
        agent_name = bootstrap["name"]
        
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        # 2. Get or create conversation
        conv_query = select(AIConversation).where(
            and_(
                AIConversation.ai_id == engram_uuid,
                AIConversation.user_id == str(user_uuid),
            )
        ).order_by(AIConversation.updated_at.desc())
        conv_result = await session.execute(conv_query)
        conversation = conv_result.scalar_one_or_none()

        if not conversation:
            conversation = AIConversation(
                ai_id=engram_uuid,
                user_id=str(user_uuid),
                title=f"Chat with {agent_name}",
            )
            session.add(conversation)
            await session.commit()
            await session.refresh(conversation)

        # 3. Save user message
        user_msg = AIMessage(
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
        session.add(user_msg)
        await session.commit()

        # 4. Load recent message history
        history_query = select(AIMessage).where(
            AIMessage.conversation_id == conversation.id
        ).order_by(AIMessage.created_at.asc()).limit(20)
        history_result = await session.execute(history_query)
        past_messages = history_result.scalars().all()

        # 5. Build system prompt
        # Check if it's static or dynamic
        saint_def = SAINT_DEFINITIONS.get(saint_id)
        
        if saint_def:
             system_prompt = await self._build_saint_prompt(session, user_id, saint_id, engram_id)
        else:
             # Build prompt for dynamic agent
             # Fetch system prompt from engram's personality_traits
             engram_query = select(ArchetypalAI).where(ArchetypalAI.id == engram_uuid)
             e_result = await session.execute(engram_query)
             engram_obj = e_result.scalar_one()
             
             traits = engram_obj.personality_traits or {}
             base_prompt = traits.get("system_prompt", f"You are {agent_name}, a helpful AI agent.")
             
             system_prompt = f"{base_prompt}\n\nCONVERSATION HISTORY:\n"

        # 6. Format conversation for LLM
        conversation_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in past_messages[-10:]
        ]

        # 7. Generate AI response
        ai_response_text = await self.llm.generate_response(
            messages=conversation_messages,
            system_prompt=system_prompt,
        )

        # 8. Parse Actions from AI response if available
        executed_actions = []
        if action_engine:
            ai_response_text, executed_actions = action_engine.parse_and_execute(ai_response_text, str(user_uuid))
            
            # If actions were executed, append a summary to the visible response
            if executed_actions:
                ai_response_text += "\n\n*(Autonomous Actions Executed: " + ", ".join([a["tool"] for a in executed_actions]) + ")*"

        # 9. Save AI response
        ai_msg = AIMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=ai_response_text,
        )
        session.add(ai_msg)
        await session.commit()
        await session.refresh(ai_msg)

        # 9. Extract and store knowledge (only for static saints for now, or expand later)
        if saint_def:
             await self._extract_and_store_knowledge(session, user_id, saint_id, message, ai_response_text)

        return {
            "id": str(ai_msg.id),
            "conversation_id": str(conversation.id),
            "engram_id": engram_id,
            "role": "assistant",
            "content": ai_response_text,
            "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else datetime.utcnow().isoformat(),
            "saint_id": saint_id,
            "saint_name": agent_name,
        }

    async def _build_saint_prompt(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        engram_id: str,
    ) -> str:
        """Build the full system prompt for a saint, including stored knowledge."""
        saint_def = SAINT_DEFINITIONS[saint_id]

        prompt_parts = [
            f"You are {saint_def['name']}, {saint_def['title']}.",
            f"Domain: {saint_def['domain'].upper()}",
            f"Description: {saint_def['description']}",
            "",
            saint_def["system_prompt"],
        ]

        # Inject stored knowledge about the user
        knowledge = await self.get_knowledge(session, user_id, saint_id)
        if knowledge:
            prompt_parts.append("\nWHAT YOU KNOW ABOUT THIS USER:")
            for item in knowledge:
                prompt_parts.append(f"- [{item['category']}] {item['key']}: {item['value']}")
            prompt_parts.append("")

        # For Raphael, also inject Delphi health predictions
        if saint_id == "raphael":
            try:
                health_context = await self.prompt_builder.build_health_prediction_context(session, user_id)
                if health_context:
                    prompt_parts.append(health_context)
            except Exception as e:
                logger.warning(f"Could not load health context: {e}")

        prompt_parts.extend([
            "\nCONVERSATION GUIDELINES:",
            "- Stay in your domain but be helpful if the user asks about other topics.",
            "- If the user shares information relevant to your domain, REMEMBER IT by acknowledging it clearly.",
            "- Reference past knowledge when relevant to show continuity.",
            "- Be proactive about your domain — suggest, remind, and follow up.",
            "- Keep responses conversational, warm, and concise (2-4 paragraphs max).",
            "- When you learn something new about the user, acknowledge it explicitly.",
        ])

        return "\n".join(prompt_parts)

    async def _extract_and_store_knowledge(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        user_message: str,
        ai_response: str,
    ) -> None:
        """
        Use LLM to extract actionable knowledge from the conversation.
        Store it for future prompt enrichment.
        """
        saint_def = SAINT_DEFINITIONS[saint_id]
        categories = saint_def["knowledge_categories"]

        extraction_prompt = (
            f"You are an information extraction agent for {saint_def['name']} ({saint_def['domain']} domain).\n"
            f"Valid knowledge categories: {', '.join(categories)}\n\n"
            f"USER said: \"{user_message}\"\n"
            f"AI responded: \"{ai_response[:200]}\"\n\n"
            "Extract any NEW facts about the user from the USER's message. "
            "Return a JSON array of objects with 'key', 'value', and 'category' fields. "
            "If no new facts, return an empty array: []\n"
            "Only extract concrete, useful facts — not opinions or greetings.\n"
            "Example: [{\"key\": \"primary_doctor\", \"value\": \"Dr. Smith at City Hospital\", \"category\": \"appointments\"}]\n"
            "Return ONLY the JSON array, nothing else."
        )

        try:
            extraction_result = await self.llm.generate_response(
                messages=[{"role": "user", "content": extraction_prompt}],
                max_tokens=300,
                temperature=0.1,
            )

            # Parse extracted knowledge
            # Strip any markdown formatting
            cleaned = extraction_result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            facts = json.loads(cleaned)

            if not isinstance(facts, list):
                return

            for fact in facts:
                if not isinstance(fact, dict):
                    continue
                key = fact.get("key", "").strip()
                value = fact.get("value", "").strip()
                category = fact.get("category", "general").strip()

                if not key or not value:
                    continue
                if category not in categories:
                    category = "general"

                await self.store_knowledge(session, user_id, saint_id, key, value, category)

        except (json.JSONDecodeError, Exception) as e:
            logger.debug(f"Knowledge extraction skipped: {e}")

    async def store_knowledge(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        key: str,
        value: str,
        category: str = "general",
        confidence: float = 1.0,
    ) -> None:
        """Store or update a knowledge item for a saint."""
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        # Check if this key already exists — update if so
        query = select(SaintKnowledge).where(
            and_(
                SaintKnowledge.user_id == user_uuid,
                SaintKnowledge.saint_id == saint_id,
                SaintKnowledge.knowledge_key == key,
            )
        )
        result = await session.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.knowledge_value = value
            existing.category = category
            existing.confidence = confidence
        else:
            new_knowledge = SaintKnowledge(
                user_id=user_uuid,
                saint_id=saint_id,
                knowledge_key=key,
                knowledge_value=value,
                category=category,
                confidence=confidence,
            )
            session.add(new_knowledge)

        await session.commit()

    async def get_knowledge(
        self,
        session: AsyncSession,
        user_id: str,
        saint_id: str,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve all knowledge a saint has about a user."""
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        conditions = [
            SaintKnowledge.user_id == user_uuid,
            SaintKnowledge.saint_id == saint_id,
        ]
        if category:
            conditions.append(SaintKnowledge.category == category)

        query = select(SaintKnowledge).where(and_(*conditions)).order_by(SaintKnowledge.updated_at.desc()).limit(50)
        result = await session.execute(query)
        items = result.scalars().all()

        return [
            {
                "id": str(item.id),
                "key": item.knowledge_key,
                "value": item.knowledge_value,
                "category": item.category,
                "confidence": item.confidence,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ]

    async def get_all_saint_statuses(
        self,
        session: AsyncSession,
        user_id: str,
    ) -> List[Dict[str, Any]]:
        """Get status of all saints for a user — engram_id, knowledge count, etc."""
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        statuses = []

        for saint_id, saint_def in SAINT_DEFINITIONS.items():
            # Check for existing engram
            query = select(ArchetypalAI).where(
                and_(
                    ArchetypalAI.user_id == user_uuid,
                    ArchetypalAI.name == saint_def["name"],
                )
            )
            result = await session.execute(query)
            engram = result.scalar_one_or_none()

            # Count knowledge items
            knowledge_query = select(SaintKnowledge).where(
                and_(
                    SaintKnowledge.user_id == user_uuid,
                    SaintKnowledge.saint_id == saint_id,
                )
            )
            knowledge_result = await session.execute(knowledge_query)
            knowledge_items = knowledge_result.scalars().all()

            statuses.append({
                "saint_id": saint_id,
                "name": saint_def["name"],
                "title": saint_def["title"],
                "domain": saint_def["domain"],
                "engram_id": str(engram.id) if engram else None,
                "is_active": engram is not None,
                "knowledge_count": len(knowledge_items),
            })

        return statuses


# Singleton
saint_agent_service = SaintAgentService()

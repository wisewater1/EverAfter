import asyncio
import sys
import uuid
from sqlalchemy import select, text
from app.db.session import get_async_session
from app.models.engram import EngramDailyResponse
from app.services.embeddings import get_embeddings_service
from app.ai.prompt_builder import get_prompt_builder

async def seed_and_test():
    async for session in get_async_session():
        # Use existing valid IDs from the database
        user_id = uuid.UUID("8e98f16d-5f94-49b2-b335-23d63ee0649f")
        ai_id = uuid.UUID("a5f238d9-2d73-4294-86b2-671dc1d7ea59")
        
        print(f"Using existing AI: {ai_id}")
        
        # Add some diverse responses for this AI
        responses = [
            ("What is a core value you hold?", "I strongly believe in honesty and being authentic with people."),
            ("Tell me about a childhood memory.", "I remember playing in the rain and jumping in mud puddles in our backyard."),
            ("What are your career goals?", "I aspire to lead a team that builds ethical AI to help humanity."),
            ("How do you handle stress?", "I usually go for a long walk in the woods to clear my head.")
        ]
        
        service = get_embeddings_service()
        new_response_ids = []
        
        for q, a in responses:
            res = EngramDailyResponse(
                ai_id=ai_id,
                user_id=user_id,
                question_text=q,
                response_text=a,
                day_number=1,
                question_category="test"
            )
            session.add(res)
            await session.commit()
            await session.refresh(res)
            new_response_ids.append(res.id)
            print(f"Added response: {q}")
            
            # Generate embedding
            await service.generate_response_embedding(session, str(res.id))
            
        # 3. Test Retrieval
        test_queries = [
            "What do you believe in?", # Should match honesty/authentic
            "Tell me about your childhood", # Should match childhood memory
            "How do you relax?",        # Should match walk in the woods
            "Work and future"           # Should match career goals
        ]
        
        builder = get_prompt_builder()
        for query_text in test_queries:
            print(f"\nQUERY: '{query_text}'")
            context = await builder.get_relevant_context(session, str(ai_id), query_text, limit=1)
            if context:
                print(f"MATCH: {context[0]['answer']}")
            else:
                print("NO MATCH FOUND")
        
        # Cleanup seeded responses
        for rid in new_response_ids:
            await session.execute(text(f"DELETE FROM daily_question_responses WHERE id = '{rid}'"))
        await session.commit()
        print("\nCleanup complete.")
        break

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_and_test())

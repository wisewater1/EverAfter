import asyncio
import sys
import os

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.services.health.service import health_service
from app.services.finance_service import FinanceService
from app.services.akashic_service import akashic
import uuid

async def test_neural_graph():
    print("Testing Akashic Record...")
    # 1. Test dumping memories
    memories = akashic.memories
    print(f"Current Akashic memories count: {len(memories)}")
    
    old_len = len(akashic.memories)
    # 2. Test emitting a health event
    print("Testing Health Emitter...")
    report = await health_service.analyze_metric(
        metric_type="heart_rate",
        value=180.0, # High -> Warning/Critical
        user_id=str(uuid.uuid4())
    )
    print(f"Health Report Status: {report.status}")
    
    # Check if memory was added
    new_len = len(akashic.memories)
    print(f"New Akashic memories count: {new_len}")
    if new_len > old_len:
        print("✅ Health Emitter successfully wrote to Neural Graph!")
    else:
        print("❌ Health Emitter failed to write to Neural Graph.")
        
    old_len = new_len
        
    print("\nTesting Finance Emitter...")
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    import app.core.config as config
    from app.services.finance_service import FinanceService
    
    # We need a proper DB session
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    from app.db.session import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        f_service = FinanceService(session)
        try:
            tx = await f_service.add_transaction(
                user_id=str(uuid.uuid4()),
                data={
                    'date': '2025-10-27',
                    'payee': 'Test Major Purchase',
                    'amount': -600.0,
                    'category_id': None,
                    'description': 'A very significant purchase'
                }
            )
            print(f"Transaction added: {tx.amount}")
            
            new_len_fin = len(akashic.memories)
            print(f"New Akashic memories count: {new_len_fin}")
            if new_len_fin > old_len:
                print("✅ Finance Emitter successfully wrote to Neural Graph!")
            else:
                print("❌ Finance Emitter failed to write to Neural Graph.")
        except Exception as e:
            print(f"Finance test error: {e}")

    print("\nAll tests finished without crashing.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_neural_graph())

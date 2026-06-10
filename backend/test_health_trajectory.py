import asyncio
import sys
import uuid
from sqlalchemy import text
from app.db.session import get_async_session

async def test_health_api():
    print("Testing Health Prediction API...")
    async for session in get_async_session():
        # Using the same user_id from previous tests
        user_id = "8e98f16d-5f94-49b2-b335-23d63ee0649f"
        
        # We can't easily test the API router directly without a running server,
        # but we can test the service layer that the router calls.
        from app.services.health.service import health_service
        
        mock_history = [
            {"timestamp": "2026-02-14T10:00:00", "type": "heart_rate", "value": 72},
            {"timestamp": "2026-02-14T12:00:00", "type": "heart_rate", "value": 75},
            {"timestamp": "2026-02-14T14:00:00", "type": "glucose", "value": 110},
        ]
        
        print(f"Requesting predictions for user: {user_id}")
        predictions = await health_service.get_predictions(user_id, mock_history)
        
        if predictions and predictions[0].trajectory:
            print(f"SUCCESS: Generated {len(predictions[0].trajectory)} trajectory points.")
            print(f"First point: {predictions[0].trajectory[0]}")
            print(f"Insight: {predictions[0].contributing_factors[0]}")
        else:
            print("FAILURE: No trajectory generated.")
        break

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_health_api())

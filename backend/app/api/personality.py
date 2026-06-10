from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.services.personality_predictor import predictor

router = APIRouter(prefix="/api/v1/personality", tags=["personality"])

@router.post("/predict")
async def predict_personality(member_data: Dict[str, Any] = Body(...)):
    """
    Predict Big Five personality traits from family member data.
    """
    try:
        return predictor.predict(member_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

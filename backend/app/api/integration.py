from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any

from app.services.github_service import github_service

router = APIRouter()

class GitHubAnalyzeRequest(BaseModel):
    username: str

class GitHubAnalyzeResponse(BaseModel):
    username: str
    analysis: Dict[str, Any]

@router.post("/github/analyze", response_model=GitHubAnalyzeResponse)
async def analyze_github_user(request: GitHubAnalyzeRequest):
    """
    Analyze a GitHub user's personality based on public data.
    """
    try:
        analysis = await github_service.analyze_coding_personality(request.username)
        return GitHubAnalyzeResponse(
            username=request.username,
            analysis=analysis
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

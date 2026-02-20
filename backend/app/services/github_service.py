import httpx
import logging
from typing import Dict, Any, List, Optional
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.llm = get_llm_client()

    async def fetch_user_data(self, username: str) -> Dict[str, Any]:
        """
        Fetch public data for a GitHub user: bio, repos, languages, commit style.
        """
        async with httpx.AsyncClient() as client:
            # 1. User Info
            user_resp = await client.get(f"{self.base_url}/users/{username}")
            if user_resp.status_code == 404:
                return None
            user_data = user_resp.json()

            # 2. Repos (limit to 10 recently updated)
            repos_resp = await client.get(f"{self.base_url}/users/{username}/repos?sort=updated&per_page=10")
            repos = repos_resp.json() if repos_resp.status_code == 200 else []

            # 3. Aggregate Languages
            languages = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1
            
            # Sort languages by usage
            top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)
            
            # 4. Extract Commit Messages (from events - lighter than cloning)
            events_resp = await client.get(f"{self.base_url}/users/{username}/events/public?per_page=20")
            events = events_resp.json() if events_resp.status_code == 200 else []
            
            commit_msgs = []
            for event in events:
                if event["type"] == "PushEvent":
                    for commit in event.get("payload", {}).get("commits", []):
                        commit_msgs.append(commit["message"])

            return {
                "username": username,
                "name": user_data.get("name"),
                "bio": user_data.get("bio"),
                "company": user_data.get("company"),
                "location": user_data.get("location"),
                "top_languages": [l[0] for l in top_languages[:5]],
                "recent_repos": [r["name"] for r in repos[:5]],
                "commit_samples": commit_msgs[:10],
                "public_repos": user_data.get("public_repos"),
                "followers": user_data.get("followers")
            }

    async def analyze_coding_personality(self, username: str) -> Dict[str, Any]:
        """
        Analyze the user's coding personality using LLM.
        """
        data = await self.fetch_user_data(username)
        if not data:
            raise ValueError(f"GitHub user '{username}' not found.")

        prompt = f"""
        Analyze the coding personality of this GitHub user based on their public activity.
        
        Profile:
        - Username: {data['username']}
        - Bio: {data['bio']}
        - Top Languages: {', '.join(data['top_languages'])}
        - Recent Repos: {', '.join(data['recent_repos'])}
        - Recent Commit Messages: {json.dumps(data['commit_samples'])}
        
        Task:
        1. Identify 3-5 distinct personality traits (e.g. "Meticulous", "Experimental", "Community-focused").
        2. Describe their likely communication style (e.g. "Terse and technical", "Detailed and explanatory").
        3. Infer their "Archetype" (e.g. "The Architect", "The Hacker", "The Maintainer").
        
        Return JSON:
        {{
            "archetype": "string",
            "traits": [{{ "name": "string", "score": 0-100, "explanation": "string" }}],
            "communication_style": "string",
            "summary": "string"
        }}
        """
        
        import json
        
        try:
            response = await self.llm.generate_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            # Clean possible markdown code blocks
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                
            analysis = json.loads(cleaned)
            analysis["source_data"] = data
            return analysis
            
        except Exception as e:
            logger.error(f"GitHub analysis failed: {e}")
            # Fallback
            return {
                "archetype": "The Developer",
                "traits": [{"name": "Curious", "score": 50, "explanation": "Failed to analyze deeply."}],
                "communication_style": "Technical",
                "summary": "Analysis unavailable.",
                "source_data": data
            }

github_service = GitHubService()

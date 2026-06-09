import httpx
import logging
import json
import os
from typing import Dict, Any, List, Optional
from git import Repo
from app.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.llm = get_llm_client()

    async def fetch_user_data(self, username: str) -> Dict[str, Any]:
        """
        Fetch public data for a GitHub user. Fallback to local if username is 'local'.
        """
        if username.lower() == 'local' or not username:
            return await self.fetch_local_data()
            
        async with httpx.AsyncClient() as client:
            # ... existing remote fetch logic ...
            user_resp = await client.get(f"{self.base_url}/users/{username}")
            if user_resp.status_code == 404:
                return await self.fetch_local_data() # Fallback to local
            user_data = user_resp.json()
            
            # (Keeping the rest of the existing fetch logic for backup)
            repos_resp = await client.get(f"{self.base_url}/users/{username}/repos?sort=updated&per_page=10")
            repos = repos_resp.json() if repos_resp.status_code == 200 else []

            languages = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1
            
            top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)
            
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
                "followers": user_data.get("followers"),
                "source": "remote"
            }

    async def fetch_local_data(self) -> Dict[str, Any]:
        """
        Extract data from the local .git repository for personality analysis.
        """
        try:
            repo_path = os.getcwd()
            # Walk up to find .git if not in current dir
            for _ in range(3):
                if os.path.exists(os.path.join(repo_path, ".git")):
                    break
                repo_path = os.path.dirname(repo_path)
            
            repo = Repo(repo_path)
            
            # 1. Languages (approximate by file extensions)
            ext_counts = {}
            ext_map = {'.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript', '.tsx': 'React', '.html': 'HTML', '.css': 'CSS', '.go': 'Go', '.rs': 'Rust'}
            
            for item in repo.tree().traverse():
                if item.type == 'blob':
                    ext = os.path.splitext(item.name)[1]
                    if ext in ext_map:
                        lang = ext_map[ext]
                        ext_counts[lang] = ext_counts.get(lang, 0) + 1
            
            top_languages = sorted(ext_counts.items(), key=lambda x: x[1], reverse=True)

            # 2. Commit Samples
            commits = list(repo.iter_commits(max_count=20))
            commit_msgs = [c.message.strip() for c in commits]

            # 3. Basic Stats
            author = commits[0].author if commits else None

            return {
                "username": "Local Architect",
                "name": author.name if author else "Unknown",
                "bio": f"Analyzing local repository: {os.path.basename(repo_path)}",
                "top_languages": [l[0] for l in top_languages[:5]],
                "recent_repos": [os.path.basename(repo_path)],
                "commit_samples": commit_msgs[:15],
                "source": "native-git"
            }
        except Exception as e:
            logger.error(f"Local git analysis failed: {e}")
            return {
                "username": "Unknown",
                "top_languages": ["Python"],
                "commit_samples": ["initial commit"],
                "source": "minimal-fallback"
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

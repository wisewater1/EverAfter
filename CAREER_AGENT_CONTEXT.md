# Career Agent Feature - Implementation Context for Claude Code

This document provides complete context for implementing the Personal Career Agent feature in EverAfter using Claude Code on your laptop terminal.

## Project Overview

**Feature**: Personal Career Agent for EverAfter
**Status**: Code generation complete, ready for local implementation
**Platform**: FastAPI backend + Gradio UI + Railway deployment
**Integration**: EverAfter GitHub repository (wisewater1/EverAfter)

---

## Quick Start (5 Minutes)

```bash
# 1. Clone/navigate to your EverAfter repo
cd ~/path/to/EverAfter

# 2. Create career agent directory structure
mkdir -p backend/app/features/career_agent

# 3. Copy all generated code files to appropriate locations (see Directory Structure below)

# 4. Update backend/app/main.py (see Integration Steps)

# 5. Install dependencies
pip install -r requirements.txt

# 6. Run migrations
alembic upgrade head

# 7. Start development server
uvicorn backend.app.main:app --reload
```

---

## Directory Structure

Create this structure in your EverAfter project:

```
backend/app/features/
├── career_agent/
│   ├── __init__.py (empty file)
│   ├── models.py (SQLAlchemy database models)
│   ├── schemas.py (Pydantic validation schemas)
│   ├── service.py (Business logic & OpenAI integration)
│   ├── routes.py (FastAPI endpoints)
│   └── tools.py (Tool definitions for agent)
├── ... (existing features)

ui/
├── career_agent_ui.py (Gradio interface - optional)

scripts/
├── setup_career_agent.sh (Setup script)

docs/
├── PRD.md (Product Requirements - already added)
├── APP_FLOW.md (Technical Architecture - already added)
```

---

## File-by-File Implementation

### 1. backend/app/features/career_agent/models.py

Database models for storing career agent data:
- CareerChat (conversation history)
- - CareerGoal (user goals and tracking)
  - - UserProfile (extended user career info)
   
    - **Key Tables**:
    - - `career_chats` - Stores conversation messages
      - - `career_goals` - User career objectives
        - - `user_profiles` - Extended career profile data
         
          - ### 2. backend/app/features/career_agent/schemas.py
         
          - Pydantic schemas for API request/response validation:
          - - ChatMessageRequest/Response
            - - GoalCreate/Update/Response
              - - ProfileCreate/Update/Response
               
                - ### 3. backend/app/features/career_agent/service.py
               
                - Core business logic and OpenAI integration:
                - - `CareerAgentService` class with methods for:
                  -   - Processing user messages
                      -   - Making OpenAI API calls
                          -   - Handling tool responses (Pushover notifications, goal tracking)
                              -   - Context management
                               
                                  - **Key Dependencies**:
                                  - - OpenAI API (requires OPENAI_API_KEY environment variable)
                                    - - Pushover API (optional, requires PUSHOVER_USER_KEY and PUSHOVER_API_TOKEN)
                                      - - SQLAlchemy ORM
                                       
                                        - ### 4. backend/app/features/career_agent/routes.py
                                       
                                        - FastAPI endpoints:
                                        - - `POST /api/career/chat` - Send message to career agent
                                          - - `GET /api/career/goals` - List user's career goals
                                            - - `POST /api/career/goals` - Create new career goal
                                              - - `PUT /api/career/goals/{goal_id}` - Update goal
                                                - - `DELETE /api/career/goals/{goal_id}` - Delete goal
                                                  - - `GET /api/career/profile` - Get user career profile
                                                   
                                                    - ### 5. backend/app/features/career_agent/tools.py
                                                   
                                                    - Tool definitions for the AI agent to use:
                                                    - - `track_goal` - Save/update career goals
                                                      - - `send_notification` - Send Pushover notifications
                                                        - - `get_user_context` - Retrieve user career context
                                                         
                                                          - ### 6. ui/career_agent_ui.py
                                                         
                                                          - Gradio interface for chatting with career agent:
                                                          - - Chat input/output interface
                                                            - - Goal display and management
                                                              - - Optional: Deploy to HuggingFace Spaces
                                                                - 
                                                                ---

                                                                ## Integration Steps

                                                                ### Step 1: Update backend/app/main.py

                                                                Add these imports at the top:

                                                                ```python
                                                                from backend.app.features.career_agent.routes import router as career_router
                                                                ```

                                                                Add this line in your app initialization (after other router includes):

                                                                ```python
                                                                app.include_router(career_router, prefix="/api/career", tags=["career"])
                                                                ```

                                                                ### Step 2: Update requirements.txt

                                                                Add these dependencies:

                                                                ```
                                                                openai>=1.3.0
                                                                python-dotenv>=1.0.0
                                                                gradio>=4.0.0  # If using Gradio UI
                                                                pushover-py>=0.1.0  # If using Pushover notifications
                                                                ```

                                                                ### Step 3: Create .env file

                                                                Create `backend/.env` with:

                                                                ```
                                                                # OpenAI Configuration
                                                                OPENAI_API_KEY=your_openai_api_key

                                                                # Pushover Configuration (Optional)
                                                                PUSHOVER_USER_KEY=your_pushover_user_key
                                                                PUSHOVER_API_TOKEN=your_pushover_api_token

                                                                # Database Configuration
                                                                DATABASE_URL=postgresql://user:password@localhost/everafter

                                                                # Server Configuration
                                                                API_URL=http://localhost:8000
                                                                ```

                                                                ### Step 4: Database Migrations

                                                                Create an Alembic migration:

                                                                ```bash
                                                                alembic revision --autogenerate -m "Add career agent models"
                                                                alembic upgrade head
                                                                ```

                                                                Or manually create migration file in `backend/alembic/versions/` with the SQL from models.py.

                                                                ### Step 5: Environment Variables in Railway

                                                                If deploying to Railway:

                                                                1. Go to your Railway project settings
                                                                2. 2. Add environment variables:
                                                                   3.    - `OPENAI_API_KEY`
                                                                         -    - `PUSHOVER_USER_KEY` (optional)
                                                                              -    - `PUSHOVER_API_TOKEN` (optional)
                                                                                   -    - Database credentials (already configured)
                                                                                    
                                                                                        - ---

                                                                                        ## Code File Details

                                                                                        ### models.py - Database Models

                                                                                        ```python
                                                                                        from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
                                                                                        from sqlalchemy.orm import relationship
                                                                                        from datetime import datetime

                                                                                        # CareerChat Model
                                                                                        # - Stores conversation messages between user and AI
                                                                                        # - Fields: id, user_id, role (user/assistant), content, timestamp
                                                                                        # - Relationships: Links to User and Goal tracking

                                                                                        # CareerGoal Model
                                                                                        # - Tracks user's career objectives
                                                                                        # - Fields: id, user_id, goal_text, status, priority, deadline, created_at, updated_at
                                                                                        # - Used for context in AI responses and progress tracking

                                                                                        # UserProfile Model
                                                                                        # - Extended career-specific user data
                                                                                        # - Fields: id, user_id, current_role, industry, experience_level, aspirations
                                                                                        # - Provides personalized context for career advice
                                                                                        ```

                                                                                        ### schemas.py - API Schemas

                                                                                        ```python
                                                                                        from pydantic import BaseModel
                                                                                        from typing import Optional, List
                                                                                        from datetime import datetime

                                                                                        # ChatMessageRequest - Input for chat endpoint
                                                                                        # - message: str (user's message)
                                                                                        # - include_context: bool (whether to include user profile and goals)

                                                                                        # ChatMessageResponse - Output from chat endpoint
                                                                                        # - role: str ("assistant")
                                                                                        # - content: str (AI response)
                                                                                        # - tool_calls: List (any tools used)

                                                                                        # GoalCreate - Input for creating new goal
                                                                                        # - goal_text: str
                                                                                        # - priority: int (1-5)
                                                                                        # - deadline: Optional[datetime]

                                                                                        # GoalResponse - Full goal data
                                                                                        # - id: int
                                                                                        # - user_id: int
                                                                                        # - goal_text: str
                                                                                        # - status: str (active/completed/abandoned)
                                                                                        # - Created_at/updated_at: datetime
                                                                                        ```

                                                                                        ### service.py - Core Logic

                                                                                        ```python
                                                                                        import openai
                                                                                        from typing import List, Dict
                                                                                        from backend.app.features.career_agent.models import CareerChat, CareerGoal
                                                                                        from backend.app.features.career_agent.tools import get_tools

                                                                                        class CareerAgentService:
                                                                                            def __init__(self, db_session):
                                                                                                self.db = db_session
                                                                                                self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                                                                                                self.model = "gpt-4-turbo-preview"
                                                                                                self.tools = get_tools()

                                                                                            async def process_message(self, user_id: int, message: str) -> str:
                                                                                                # 1. Retrieve user context (profile, goals, chat history)
                                                                                                # 2. Build system prompt with user career context
                                                                                                # 3. Call OpenAI API with tools
                                                                                                # 4. Process tool responses (save goals, send notifications)
                                                                                                # 5. Store chat message in database
                                                                                                # 6. Return response to user

                                                                                            async def handle_tool_call(self, tool_name: str, tool_input: dict):
                                                                                                # Route to appropriate tool handler
                                                                                                # - track_goal: Save/update goal in database
                                                                                                # - send_notification: Send Pushover notification
                                                                                                # - get_user_context: Retrieve user data
                                                                                        ```

                                                                                        ### routes.py - FastAPI Endpoints

                                                                                        ```python
                                                                                        from fastapi import APIRouter, Depends
                                                                                        from backend.app.features.career_agent.schemas import ChatMessageRequest, GoalCreate
                                                                                        from backend.app.features.career_agent.service import CareerAgentService

                                                                                        router = APIRouter()

                                                                                        @router.post("/chat")
                                                                                        async def chat(request: ChatMessageRequest, user_id: int = Depends(get_current_user)):
                                                                                            # Process message and return AI response
                                                                                            service = CareerAgentService(db_session)
                                                                                            response = await service.process_message(user_id, request.message)
                                                                                            return {"role": "assistant", "content": response}

                                                                                        @router.get("/goals")
                                                                                        async def get_goals(user_id: int = Depends(get_current_user)):
                                                                                            # Return user's career goals

                                                                                        @router.post("/goals")
                                                                                        async def create_goal(goal: GoalCreate, user_id: int = Depends(get_current_user)):
                                                                                            # Create new career goal

                                                                                        @router.get("/profile")
                                                                                        async def get_profile(user_id: int = Depends(get_current_user)):
                                                                                            # Return user's career profile
                                                                                        ```

                                                                                        ---

                                                                                        ## Testing the Implementation

                                                                                        ### Local Testing

                                                                                        ```bash
                                                                                        # 1. Start the development server
                                                                                        cd backend
                                                                                        uvicorn app.main:app --reload --port 8000

                                                                                        # 2. Test the API using curl or Postman
                                                                                        curl -X POST http://localhost:8000/api/career/chat \
                                                                                          -H "Content-Type: application/json" \
                                                                                          -H "Authorization: Bearer YOUR_TOKEN" \
                                                                                          -d '{"message": "What are some career growth opportunities in tech?"}'

                                                                                        # 3. Check the database for stored messages
                                                                                        sqlite3 everafter.db "SELECT * FROM career_chats;"
                                                                                        ```

                                                                                        ### Gradio UI Testing

                                                                                        ```bash
                                                                                        # Run Gradio UI locally
                                                                                        python ui/career_agent_ui.py

                                                                                        # Access at http://localhost:7860
                                                                                        ```

                                                                                        ---

                                                                                        ## Deployment to Railway

                                                                                        ### Prerequisites
                                                                                        - Railway account (railway.app)
                                                                                        - - GitHub repository connected to Railway
                                                                                          - - Environment variables configured (see above)
                                                                                           
                                                                                            - ### Deployment Steps
                                                                                           
                                                                                            - ```bash
                                                                                              # 1. Commit changes to GitHub
                                                                                              git add .
                                                                                              git commit -m "Add Personal Career Agent feature"
                                                                                              git push origin main

                                                                                              # 2. Railway automatically deploys on push
                                                                                              # Monitor at https://railway.app/dashboard

                                                                                              # 3. Verify deployment
                                                                                              curl https://your-everafter-deployment.railway.app/api/career/chat

                                                                                              # 4. Check logs in Railway dashboard for errors
                                                                                              ```

                                                                                              ### Post-Deployment

                                                                                              - Verify API endpoints are accessible
                                                                                              - - Test authentication and authorization
                                                                                                - - Monitor OpenAI API usage and costs
                                                                                                  - - Set up error alerting
                                                                                                   
                                                                                                    - ---
                                                                                                    
                                                                                                    ## Troubleshooting
                                                                                                    
                                                                                                    ### Issue: Import errors when starting server
                                                                                                    
                                                                                                    **Solution**: Ensure all files are in correct directory:
                                                                                                    - `backend/app/features/career_agent/__init__.py` exists
                                                                                                    - - All imports use correct relative paths: `from backend.app.features.career_agent.models import ...`
                                                                                                     
                                                                                                      - ### Issue: OpenAI API errors
                                                                                                     
                                                                                                      - **Solution**:
                                                                                                      - - Verify OPENAI_API_KEY is set correctly
                                                                                                        - - Check API key has access to gpt-4-turbo-preview model
                                                                                                        - Review OpenAI dashboard for quota/rate limits
                                                                                                        
                                                                                                        ### Issue: Database migration errors
                                                                                                        
                                                                                                        **Solution**:
                                                                                                        - Ensure SQLAlchemy models don't conflict with existing code
                                                                                                        - - Check database URL is correct
                                                                                                          - - Run `alembic current` to see current migration state
                                                                                                           
                                                                                                            - ### Issue: Pushover notifications not sending
                                                                                                           
                                                                                                            - **Solution**:
                                                                                                            - - Verify PUSHOVER_USER_KEY and PUSHOVER_API_TOKEN are set
                                                                                                              - - Check network connectivity
                                                                                                                - - Review Pushover API documentation for rate limits
                                                                                                                 
                                                                                                                  - ---
                                                                                                                  
                                                                                                                  ## Environment Variables Reference
                                                                                                                  
                                                                                                                  | Variable | Required | Description | Example |
                                                                                                                  |----------|----------|-------------|---------|
                                                                                                                  | OPENAI_API_KEY | Yes | OpenAI API key | sk-... |
                                                                                                                  | PUSHOVER_USER_KEY | No | Pushover user ID | u... |
                                                                                                                  | PUSHOVER_API_TOKEN | No | Pushover app token | z... |
                                                                                                                  | DATABASE_URL | Yes | PostgreSQL connection | postgresql://user:pass@host/db |
                                                                                                                  | API_URL | Yes | Base API URL | http://localhost:8000 |
                                                                                                                  
                                                                                                                  ---
                                                                                                                  
                                                                                                                  ## Next Steps After Implementation
                                                                                                                  
                                                                                                                  1. **Test all endpoints** with sample requests
                                                                                                                  2. 2. **Set up automated tests** for the career agent service
                                                                                                                     3. 3. **Configure logging** for API calls and errors
                                                                                                                        4. 4. **Deploy to staging** before production
                                                                                                                        5. **Monitor OpenAI costs** and optimize prompts if needed
                                                                                                                        6. **Gather user feedback** on career advice quality
                                                                                                                        7. **(Optional) Deploy Gradio UI** to HuggingFace Spaces
                                                                                                                        8. 8. **Set up monitoring/alerting** for production errors
                                                                                                                        
                                                                                                                        ---
                                                                                                                        
                                                                                                                        ## Architecture Summary
                                                                                                                        
                                                                                                                        ```
                                                                                                                        User Request
                                                                                                                            ↓
                                                                                                                        FastAPI Endpoint (/api/career/chat)
                                                                                                                            ↓
                                                                                                                            CareerAgentService.process_message()
                                                                                                                                ↓
                                                                                                                                Build Context (user profile, goals, chat history)
                                                                                                                            ↓
                                                                                                                        OpenAI API Call (with tools)
                                                                                                                            ↓
                                                                                                                        Tool Execution (if needed)
                                                                                                                            ├→ track_goal: Save to CareerGoal table
                                                                                                                            ├→ send_notification: Send Pushover alert
                                                                                                                                └→ get_context: Query user data
                                                                                                                                    ↓
                                                                                                                        Store Chat Message in CareerChat table
                                                                                                                            ↓
                                                                                                                            Return Response to User
                                                                                                                            ```

                                                                                                                        ---

                                                                                                                        ## Support & Documentation
                                                                                                                        
                                                                                                                        - **Product Requirements**: See `docs/PRD.md`
                                                                                                                        - **Technical Architecture**: See `docs/APP_FLOW.md`
                                                                                                                        - **OpenAI Documentation**: https://platform.openai.com/docs
                                                                                                                        - **FastAPI Documentation**: https://fastapi.tiangolo.com
                                                                                                                        - **Gradio Documentation**: https://www.gradio.app

                                                                                                                        ---

                                                                                                                        ## Checklist for Completion

                                                                                                                        - [ ] Clone/navigate to EverAfter repository
                                                                                                                        - [ ] Create directory structure (backend/app/features/career_agent/)
                                                                                                                        - [ ] Create all 5 code files (models.py, schemas.py, service.py, routes.py, tools.py)
                                                                                                                        - [ ] Update backend/app/main.py with router import
                                                                                                                        - [ ] Create .env file with credentials
                                                                                                                        - [ ] Update requirements.txt with new dependencies
                                                                                                                        - [ ] Run database migrations (alembic)
                                                                                                                        - [ ] Test API endpoints locally
                                                                                                                        - [ ] Commit and push to GitHub
                                                                                                                        - [ ] Verify deployment on Railway
                                                                                                                        - [ ] Test production API
                                                                                                                        - [ ] (Optional) Deploy Gradio UI to HuggingFace Spaces

                                                                                                                        ---

                                                                                                                        **Generated**: January 2, 2026
                                                                                                                        **For**: EverAfter Personal Career Agent Feature Implementation
                                                                                                                        **Status**: Ready for Claude Code implementation

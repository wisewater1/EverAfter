# EverAfter Autonomous AI Backend

Python FastAPI backend service for EverAfter's Autonomous AI system that powers custom engrams and family member AI representations.

## Features

- **Engram Management**: Create and manage custom engrams and family member representations
- **Personality Analysis**: Automated personality extraction from daily question responses
- **AI Chat Interface**: Converse with activated engram AIs that reflect captured personalities
- **Task Management**: Assign and execute tasks for autonomous AI agents
- **Vector Embeddings**: Semantic search and context-aware responses
- **Authentication**: JWT-based authentication compatible with Supabase

## Architecture

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── core/
│   │   └── config.py          # Configuration and settings
│   ├── db/
│   │   └── session.py         # Database session management
│   ├── auth/
│   │   ├── jwt.py             # JWT utilities
│   │   ├── middleware.py      # Authentication middleware
│   │   └── dependencies.py    # FastAPI dependencies
│   ├── models/
│   │   └── engram.py          # SQLAlchemy models
│   ├── schemas/
│   │   └── engram.py          # Pydantic schemas
│   ├── api/
│   │   ├── engrams.py         # Engram endpoints
│   │   ├── chat.py            # Chat endpoints
│   │   └── tasks.py           # Task endpoints
│   ├── engrams/
│   │   ├── nlp.py             # NLP and embeddings
│   │   └── personality.py     # Personality analysis
│   └── ai/
│       ├── llm_client.py      # LLM integration
│       └── prompt_builder.py  # Dynamic prompt construction
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Requirements

- Python 3.11+
- PostgreSQL (via Supabase)
- Redis (optional, for task queue)
- OpenAI API key (optional, uses fallback if not provided)

## Installation

### 1. Clone and Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
JWT_SECRET_KEY=your_secret_key_here
OPENAI_API_KEY=[YOUR-OPENAI-KEY]  # Optional
```

### 3. Run the Application

**Development:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Using Docker

```bash
docker build -t everafter-ai-backend .
docker run -p 8000:8000 --env-file .env everafter-ai-backend
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /` - API information

### Engrams
- `POST /api/v1/engrams/create` - Create a new engram
- `GET /api/v1/engrams/{engram_id}` - Get engram by ID
- `GET /api/v1/engrams/user/{user_id}` - List user's engrams
- `PUT /api/v1/engrams/{engram_id}` - Update engram
- `DELETE /api/v1/engrams/{engram_id}` - Delete engram
- `POST /api/v1/engrams/{engram_id}/responses` - Add daily response
- `POST /api/v1/engrams/{engram_id}/analyze` - Analyze personality
- `POST /api/v1/engrams/{engram_id}/activate-ai` - Activate AI (requires 80%+ readiness)

### Chat
- `POST /api/v1/chat/{engram_id}/message` - Send message to engram AI
- `GET /api/v1/chat/{engram_id}/conversations` - List conversations
- `GET /api/v1/chat/conversation/{conversation_id}` - Get conversation
- `DELETE /api/v1/chat/conversation/{conversation_id}` - Delete conversation

### Tasks
- `POST /api/v1/tasks/{engram_id}/create` - Create task for engram
- `GET /api/v1/tasks/{engram_id}` - List engram's tasks
- `PUT /api/v1/tasks/{task_id}` - Update task
- `DELETE /api/v1/tasks/{task_id}` - Delete task
- `POST /api/v1/tasks/{task_id}/execute` - Execute task manually

## Authentication

All endpoints (except `/health` and `/`) require JWT authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8000/api/v1/engrams/user/USER_ID
```

## API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Running Tests

```bash
pytest
```

### Code Structure

- **Models**: SQLAlchemy ORM models for database tables
- **Schemas**: Pydantic models for request/response validation
- **API Routes**: FastAPI routers for endpoint logic
- **Services**: Business logic (NLP, personality analysis, AI chat)
- **Middleware**: Authentication and request processing

## How It Works

### 1. Personality Building
- Users answer daily questions about engrams
- Responses are stored in `engram_daily_responses`
- Personality analyzer extracts traits automatically
- Traits are categorized and scored in `engram_personality_filters`

### 2. AI Readiness Calculation
- 50% from total responses (need 50+ for full score)
- 30% from category coverage (need 10+ categories)
- 20% from personality filters (need 20+ with >60% confidence)
- AI can be activated when readiness >= 80%

### 3. AI Chat
- System prompt built from personality traits and memories
- Relevant context retrieved using keyword matching
- LLM generates responses reflecting the engram's personality
- Conversation history maintained per engram

### 4. Task Execution
- Tasks can be scheduled or executed on-demand
- Execution logs track all task runs
- Future: Autonomous execution based on schedule

## Deployment

### Environment Variables
Ensure all required environment variables are set in production.

### Database Migrations
The backend uses existing Supabase database schema. Ensure migrations are applied:
- `engrams`
- `engram_daily_responses`
- `engram_personality_filters`
- `engram_progress`
- `ai_conversations`
- `ai_messages`
- `engram_ai_tasks`

### Security
- Use strong JWT secrets in production
- Enable HTTPS only
- Restrict CORS origins
- Keep Supabase service role key secure

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check Supabase connection pooling settings
- Ensure firewall allows port 5432

### Authentication Errors
- Verify JWT_SECRET_KEY matches between services
- Check token expiration settings
- Validate Supabase JWT format

### Performance
- Enable database connection pooling
- Use Redis for caching (future enhancement)
- Monitor query performance with SQLAlchemy echo

## License

Proprietary - EverAfter

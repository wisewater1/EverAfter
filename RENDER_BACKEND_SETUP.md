## Render Free Backend Setup

This repo now includes [render.yaml](/C:/Users/wisea/EverAfter/EverAfter/render.yaml) for a Render Free FastAPI service.

### What this deploys

- Service name: `everafter-api`
- Runtime: Python
- Root directory: `backend`
- Health check: `/health`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Render steps

1. In Render, create a new Blueprint or Web Service from the `wisewater1/EverAfter` repo.
2. Let Render read `render.yaml`.
3. Fill in the required secret environment variables:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET_KEY`
   - `OPENAI_API_KEY` if you want OpenAI fallback enabled
4. Deploy the service.

### ML extras

The Render API boot path now uses `backend/requirements.txt`, which excludes the heavy local ML stack so the service can build and boot more reliably.

Optional local/offline ML dependencies live in `backend/requirements-ml.txt`:

- `torch`
- `transformers`
- `sentence-transformers`

Those are no longer required for the public API to start. Features that depend on them now degrade instead of preventing the backend from booting.

### After Render gives you a URL

Set this in Netlify:

- `VITE_API_BASE_URL=https://your-render-service.onrender.com`

Then redeploy Netlify so the frontend points at the Render API instead of local-only APIs.

### Why this is needed

Local development works because Vite proxies `/api` and `/api/v1` to local ports. Netlify does not run that proxy, so the backend must exist on a public host.

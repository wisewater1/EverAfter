/*
  # AI Agent Memory System with Semantic Search
  
  ## Overview
  Creates a comprehensive memory system for the AI agent using pgvector for semantic search.
  This enables the agent to remember past conversations, user preferences, health insights,
  and task results for personalized assistance.
  
  ## New Tables
  
  ### `agent_memories`
  Stores AI agent memories with vector embeddings for semantic search
  - `id` (uuid, primary key) - Unique memory identifier
  - `user_id` (uuid, foreign key) - Owner of the memory
  - `content` (text) - The actual memory content/text
  - `embedding` (vector(1536)) - OpenAI text-embedding-3-small vector
  - `memory_type` (text) - Type: conversation, health_insight, task_result, user_preference, context
  - `importance_score` (numeric) - 0.0 to 1.0 importance rating
  - `metadata` (jsonb) - Additional context (source, entities, tags, related_ids)
  - `created_at` (timestamptz) - When memory was created
  - `accessed_at` (timestamptz) - Last time memory was retrieved
  - `access_count` (integer) - Number of times accessed
  
  ## Functions
  
  ### `search_agent_memories()`
  Semantic search function to find relevant memories using vector similarity
  
  ### `update_memory_access()`
  Helper to track memory access patterns
  
  ## Security
  RLS enabled with policies ensuring users can only access their own memories
  
  ## Indexes
  - User ID index for fast user-specific queries
  - HNSW index for vector similarity search
  - Memory type index for filtering by type
  - Created_at index for temporal queries
*/

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create agent_memories table
CREATE TABLE IF NOT EXISTS agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  memory_type text NOT NULL CHECK (memory_type IN ('conversation', 'health_insight', 'task_result', 'user_preference', 'context')),
  importance_score numeric(3,2) DEFAULT 0.50 CHECK (importance_score >= 0 AND importance_score <= 1),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  accessed_at timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own agent memories"
  ON agent_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent memories"
  ON agent_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agent memories"
  ON agent_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agent memories"
  ON agent_memories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created_at ON agent_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(importance_score DESC);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding 
  ON agent_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function: Search agent memories by semantic similarity
CREATE OR REPLACE FUNCTION search_agent_memories(
  query_embedding vector(1536),
  target_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  memory_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  memory_type text,
  importance_score numeric,
  metadata jsonb,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance_score,
    m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  FROM agent_memories m
  WHERE m.user_id = target_user_id
    AND (memory_type_filter IS NULL OR m.memory_type = memory_type_filter)
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    m.embedding <=> query_embedding,
    m.importance_score DESC
  LIMIT match_count;
END;
$$;

-- Function: Update memory access tracking
CREATE OR REPLACE FUNCTION update_agent_memory_access(memory_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agent_memories
  SET 
    accessed_at = now(),
    access_count = access_count + 1
  WHERE id = memory_id
    AND user_id = auth.uid();
END;
$$;

-- Function: Get memory statistics for a user
CREATE OR REPLACE FUNCTION get_agent_memory_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_memories', COUNT(*),
    'by_type', (
      SELECT jsonb_object_agg(memory_type, cnt)
      FROM (
        SELECT memory_type, COUNT(*) as cnt
        FROM agent_memories
        WHERE user_id = target_user_id
        GROUP BY memory_type
      ) t
    ),
    'avg_importance', ROUND(AVG(importance_score)::numeric, 2),
    'total_accesses', SUM(access_count)
  )
  INTO result
  FROM agent_memories
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

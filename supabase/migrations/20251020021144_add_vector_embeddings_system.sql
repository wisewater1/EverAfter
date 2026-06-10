/*
  # Vector Embeddings System for Custom Engrams and Family Members
  
  ## Overview
  This migration sets up a vector database system using pgvector to enable semantic search
  and intelligent AI responses for Custom Engrams and Family Member AI personalities.
  
  ## New Tables
  
  ### 1. `engram_memory_embeddings`
  Stores vector embeddings for all training responses and memories
  - `id` (uuid, primary key)
  - `engram_id` (uuid, foreign key to archetypal_ais)
  - `content` (text) - Original text content
  - `embedding` (vector(1536)) - OpenAI embedding vector
  - `metadata` (jsonb) - Category, question, importance score, etc.
  - `created_at` (timestamptz)
  
  ### 2. `family_member_embeddings`
  Stores vector embeddings for family member profiles and memories
  - `id` (uuid, primary key)
  - `family_member_id` (uuid, foreign key to family_members)
  - `content` (text) - Memory or profile information
  - `embedding` (vector(1536)) - OpenAI embedding vector
  - `metadata` (jsonb) - Type, date, tags, etc.
  - `created_at` (timestamptz)
  
  ### 3. `conversation_context_embeddings`
  Stores embeddings of conversation history for context-aware responses
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, foreign key to ai_conversations)
  - `message_id` (uuid, foreign key to ai_messages)
  - `content` (text) - Message content
  - `embedding` (vector(1536)) - Message embedding
  - `created_at` (timestamptz)
  
  ## Functions
  
  ### `match_engram_memories()`
  Semantic search function to find relevant memories for a given query
  
  ### `match_family_member_memories()`
  Semantic search for family member information
  
  ## Security
  All tables have RLS enabled with proper policies for user access control.
  
  ## Indexes
  Creates HNSW indexes for fast vector similarity search.
*/

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create engram_memory_embeddings table
CREATE TABLE IF NOT EXISTS engram_memory_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engram_id uuid NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE engram_memory_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engram embeddings"
  ON engram_memory_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = engram_memory_embeddings.engram_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own engram embeddings"
  ON engram_memory_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = engram_memory_embeddings.engram_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own engram embeddings"
  ON engram_memory_embeddings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = engram_memory_embeddings.engram_id
      AND archetypal_ais.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = engram_memory_embeddings.engram_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own engram embeddings"
  ON engram_memory_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = engram_memory_embeddings.engram_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

-- Create family_member_embeddings table
CREATE TABLE IF NOT EXISTS family_member_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_member_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family member embeddings"
  ON family_member_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own family member embeddings"
  ON family_member_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own family member embeddings"
  ON family_member_embeddings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own family member embeddings"
  ON family_member_embeddings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = auth.uid()
    )
  );

-- Create conversation_context_embeddings table
CREATE TABLE IF NOT EXISTS conversation_context_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_context_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation embeddings"
  ON conversation_context_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = conversation_context_embeddings.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversation embeddings"
  ON conversation_context_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = conversation_context_embeddings.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Create indexes for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_engram_memory_embeddings_engram_id 
  ON engram_memory_embeddings(engram_id);

CREATE INDEX IF NOT EXISTS idx_engram_memory_embeddings_embedding 
  ON engram_memory_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_family_member_embeddings_member_id 
  ON family_member_embeddings(family_member_id);

CREATE INDEX IF NOT EXISTS idx_family_member_embeddings_embedding 
  ON family_member_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_conversation_context_embeddings_conversation_id 
  ON conversation_context_embeddings(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_context_embeddings_embedding 
  ON conversation_context_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Create function for semantic search of engram memories
CREATE OR REPLACE FUNCTION match_engram_memories(
  query_embedding vector(1536),
  target_engram_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    engram_memory_embeddings.id,
    engram_memory_embeddings.content,
    engram_memory_embeddings.metadata,
    1 - (engram_memory_embeddings.embedding <=> query_embedding) as similarity
  FROM engram_memory_embeddings
  WHERE engram_memory_embeddings.engram_id = target_engram_id
    AND 1 - (engram_memory_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY engram_memory_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for semantic search of family member memories
CREATE OR REPLACE FUNCTION match_family_member_memories(
  query_embedding vector(1536),
  target_member_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    family_member_embeddings.id,
    family_member_embeddings.content,
    family_member_embeddings.metadata,
    1 - (family_member_embeddings.embedding <=> query_embedding) as similarity
  FROM family_member_embeddings
  WHERE family_member_embeddings.family_member_id = target_member_id
    AND 1 - (family_member_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY family_member_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for conversation context search
CREATE OR REPLACE FUNCTION match_conversation_context(
  query_embedding vector(1536),
  target_conversation_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  message_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    conversation_context_embeddings.id,
    conversation_context_embeddings.message_id,
    conversation_context_embeddings.content,
    1 - (conversation_context_embeddings.embedding <=> query_embedding) as similarity
  FROM conversation_context_embeddings
  WHERE conversation_context_embeddings.conversation_id = target_conversation_id
    AND 1 - (conversation_context_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY conversation_context_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

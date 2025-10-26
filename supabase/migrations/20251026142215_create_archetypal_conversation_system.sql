/*
  # Create Archetypal AI Conversation System

  1. New Tables
    - `archetypal_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `archetypal_ai_id` (uuid, foreign key to archetypal_ais)
      - `user_message` (text) - User's input message
      - `ai_response` (text) - AI's generated response
      - `context_memories` (text[]) - Array of relevant memory IDs used for context
      - `conversation_metadata` (jsonb) - Additional data like sentiment, topics, etc.
      - `created_at` (timestamptz)
    
    - `ai_personality_evolution`
      - `id` (uuid, primary key)
      - `archetypal_ai_id` (uuid, foreign key)
      - `personality_snapshot` (jsonb) - Captured personality state
      - `total_memories_at_snapshot` (integer)
      - `created_at` (timestamptz)

  2. Modifications
    - Add `foundational_questions` (jsonb) to archetypal_ais
    - Add `interaction_count` (integer) to archetypal_ais
    - Add `last_interaction_at` (timestamptz) to archetypal_ais
    - Add `personality_evolution_log` (jsonb[]) to archetypal_ais

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Add new columns to archetypal_ais table
ALTER TABLE archetypal_ais 
ADD COLUMN IF NOT EXISTS foundational_questions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz,
ADD COLUMN IF NOT EXISTS personality_evolution_log jsonb[] DEFAULT ARRAY[]::jsonb[];

-- Create archetypal_conversations table
CREATE TABLE IF NOT EXISTS archetypal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  archetypal_ai_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE NOT NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  context_memories text[] DEFAULT ARRAY[]::text[],
  conversation_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create ai_personality_evolution table
CREATE TABLE IF NOT EXISTS ai_personality_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetypal_ai_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE NOT NULL,
  personality_snapshot jsonb NOT NULL,
  total_memories_at_snapshot integer NOT NULL DEFAULT 0,
  key_insights text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE archetypal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_personality_evolution ENABLE ROW LEVEL SECURITY;

-- Policies for archetypal_conversations
CREATE POLICY "Users can view own AI conversations"
  ON archetypal_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI conversations"
  ON archetypal_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI conversations"
  ON archetypal_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for ai_personality_evolution
CREATE POLICY "Users can view their AI personality evolution"
  ON ai_personality_evolution
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_personality_evolution.archetypal_ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create personality snapshots"
  ON ai_personality_evolution
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_personality_evolution.archetypal_ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_archetypal_conversations_user_id 
  ON archetypal_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_archetypal_conversations_ai_id 
  ON archetypal_conversations(archetypal_ai_id);

CREATE INDEX IF NOT EXISTS idx_archetypal_conversations_created_at 
  ON archetypal_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_personality_evolution_ai_id 
  ON ai_personality_evolution(archetypal_ai_id);

-- Function to update interaction count
CREATE OR REPLACE FUNCTION update_ai_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE archetypal_ais
  SET 
    interaction_count = interaction_count + 1,
    last_interaction_at = NEW.created_at
  WHERE id = NEW.archetypal_ai_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update interaction count
DROP TRIGGER IF EXISTS trigger_update_ai_interaction_count ON archetypal_conversations;
CREATE TRIGGER trigger_update_ai_interaction_count
  AFTER INSERT ON archetypal_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_interaction_count();

-- Function to capture personality snapshot
CREATE OR REPLACE FUNCTION capture_personality_snapshot(
  p_archetypal_ai_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_snapshot jsonb;
  v_memory_count integer;
BEGIN
  SELECT 
    jsonb_build_object(
      'name', aa.name,
      'description', aa.description,
      'personality_traits', aa.personality_traits,
      'core_values', aa.core_values,
      'communication_style', aa.communication_style,
      'total_memories', aa.total_memories,
      'readiness_score', aa.readiness_score,
      'interaction_count', aa.interaction_count,
      'captured_at', now()
    ),
    aa.total_memories
  INTO v_snapshot, v_memory_count
  FROM archetypal_ais aa
  WHERE aa.id = p_archetypal_ai_id;
  
  INSERT INTO ai_personality_evolution (
    archetypal_ai_id,
    personality_snapshot,
    total_memories_at_snapshot
  ) VALUES (
    p_archetypal_ai_id,
    v_snapshot,
    v_memory_count
  );
  
  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

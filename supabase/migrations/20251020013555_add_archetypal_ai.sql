/*
  # Archetypal AI System

  ## Overview
  This migration adds support for users to create their own personal Archetypal AI that learns
  from their daily question responses and can be interacted with like ChatGPT.

  ## New Tables

  ### 1. `archetypal_ais`
  User's personal AI based on their memories and personality
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to profiles)
  - `name` (text) - Custom name for the AI (e.g., "GrandmaBot", "My Digital Self")
  - `description` (text) - Description of the AI's purpose
  - `personality_traits` (jsonb) - Extracted personality traits from memories
  - `total_memories` (integer) - Count of memories used to train this AI
  - `training_status` (text) - untrained, training, ready
  - `avatar_url` (text, nullable) - Custom avatar image
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `ai_conversations`
  Chat conversations with the Archetypal AI
  - `id` (uuid, primary key)
  - `ai_id` (uuid, foreign key to archetypal_ais)
  - `user_id` (uuid, foreign key to profiles) - Person chatting with the AI
  - `title` (text) - Conversation title
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `ai_messages`
  Individual messages in conversations
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, foreign key to ai_conversations)
  - `role` (text) - 'user' or 'assistant'
  - `content` (text) - Message content
  - `created_at` (timestamptz)

  ### 4. `ai_tasks`
  Tasks assigned to the Archetypal AI
  - `id` (uuid, primary key)
  - `ai_id` (uuid, foreign key to archetypal_ais)
  - `task_name` (text) - Name of the task
  - `description` (text) - What the task entails
  - `frequency` (text) - daily, weekly, monthly, on_demand
  - `is_active` (boolean) - Whether task is currently active
  - `last_executed` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ## Security
  All tables have RLS enabled with policies ensuring users can only access their own AI data
  and authorized family members can interact with the AI.
*/

-- Create archetypal_ais table
CREATE TABLE IF NOT EXISTS archetypal_ais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT 'My personal AI created from my memories and experiences',
  personality_traits jsonb DEFAULT '{}'::jsonb,
  total_memories integer DEFAULT 0,
  training_status text DEFAULT 'untrained' CHECK (training_status IN ('untrained', 'training', 'ready')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE archetypal_ais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI"
  ON archetypal_ais FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI"
  ON archetypal_ais FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI"
  ON archetypal_ais FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI"
  ON archetypal_ais FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id uuid NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Family members can view conversations if they have access
CREATE POLICY "Family members can view AI conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      JOIN archetypal_ais ai ON ai.user_id = fm.user_id
      WHERE ai.id = ai_conversations.ai_id
      AND fm.member_user_id = auth.uid()
      AND fm.status = 'Active'
      AND fm.access_level IN ('Interact', 'Modify')
    )
  );

-- Create ai_messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Family members can view messages
CREATE POLICY "Family members can view AI messages"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      JOIN archetypal_ais ai ON ai.id = ac.ai_id
      JOIN family_members fm ON fm.user_id = ai.user_id
      WHERE ac.id = ai_messages.conversation_id
      AND fm.member_user_id = auth.uid()
      AND fm.status = 'Active'
      AND fm.access_level IN ('Interact', 'Modify')
    )
  );

-- Create ai_tasks table
CREATE TABLE IF NOT EXISTS ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_id uuid NOT NULL REFERENCES archetypal_ais(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  description text NOT NULL,
  frequency text DEFAULT 'on_demand' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'on_demand')),
  is_active boolean DEFAULT true,
  last_executed timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI tasks"
  ON ai_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create AI tasks"
  ON ai_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own AI tasks"
  ON ai_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own AI tasks"
  ON ai_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_archetypal_ais_user_id ON archetypal_ais(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_ai_id ON ai_conversations(ai_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_ai_id ON ai_tasks(ai_id);

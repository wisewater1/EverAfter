/*
  # Optimize RLS Policies - Part 3: Embedding Tables

  Optimizes RLS policies for embedding-related tables
  Covers: engram_memory_embeddings, family_member_embeddings, conversation_context_embeddings
*/

-- ENGRAM_MEMORY_EMBEDDINGS TABLE
DROP POLICY IF EXISTS "Users can view own engram embeddings" ON engram_memory_embeddings;
DROP POLICY IF EXISTS "Users can insert own engram embeddings" ON engram_memory_embeddings;
DROP POLICY IF EXISTS "Users can update own engram embeddings" ON engram_memory_embeddings;
DROP POLICY IF EXISTS "Users can delete own engram embeddings" ON engram_memory_embeddings;

CREATE POLICY "Users can view own engram embeddings" ON engram_memory_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_memory_embeddings.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own engram embeddings" ON engram_memory_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_memory_embeddings.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own engram embeddings" ON engram_memory_embeddings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_memory_embeddings.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_memory_embeddings.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own engram embeddings" ON engram_memory_embeddings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM engrams
      WHERE engrams.id = engram_memory_embeddings.engram_id
      AND engrams.user_id = (select auth.uid())
    )
  );

-- FAMILY_MEMBER_EMBEDDINGS TABLE
DROP POLICY IF EXISTS "Users can view own family member embeddings" ON family_member_embeddings;
DROP POLICY IF EXISTS "Users can insert own family member embeddings" ON family_member_embeddings;
DROP POLICY IF EXISTS "Users can update own family member embeddings" ON family_member_embeddings;
DROP POLICY IF EXISTS "Users can delete own family member embeddings" ON family_member_embeddings;

CREATE POLICY "Users can view own family member embeddings" ON family_member_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own family member embeddings" ON family_member_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own family member embeddings" ON family_member_embeddings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own family member embeddings" ON family_member_embeddings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = family_member_embeddings.family_member_id
      AND family_members.user_id = (select auth.uid())
    )
  );

-- CONVERSATION_CONTEXT_EMBEDDINGS TABLE
DROP POLICY IF EXISTS "Users can view own conversation embeddings" ON conversation_context_embeddings;
DROP POLICY IF EXISTS "Users can insert own conversation embeddings" ON conversation_context_embeddings;

CREATE POLICY "Users can view own conversation embeddings" ON conversation_context_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_messages
      JOIN ai_conversations ON ai_conversations.id = ai_messages.conversation_id
      WHERE ai_messages.id = conversation_context_embeddings.message_id
      AND ai_conversations.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own conversation embeddings" ON conversation_context_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_messages
      JOIN ai_conversations ON ai_conversations.id = ai_messages.conversation_id
      WHERE ai_messages.id = conversation_context_embeddings.message_id
      AND ai_conversations.user_id = (select auth.uid())
    )
  );
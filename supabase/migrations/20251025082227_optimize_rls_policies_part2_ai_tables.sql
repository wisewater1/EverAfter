/*
  # Optimize RLS Policies - Part 2: AI Tables

  Optimizes RLS policies for AI-related tables
  Covers: archetypal_ais, ai_conversations, ai_messages, ai_tasks
*/

-- ARCHETYPAL_AIS TABLE
DROP POLICY IF EXISTS "Users can view own AI" ON archetypal_ais;
DROP POLICY IF EXISTS "Users can create own AI" ON archetypal_ais;
DROP POLICY IF EXISTS "Users can update own AI" ON archetypal_ais;
DROP POLICY IF EXISTS "Users can delete own AI" ON archetypal_ais;

CREATE POLICY "Users can view own AI" ON archetypal_ais
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own AI" ON archetypal_ais
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own AI" ON archetypal_ais
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own AI" ON archetypal_ais
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- AI_CONVERSATIONS TABLE
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Family members can view AI conversations" ON ai_conversations;

CREATE POLICY "Users can view own conversations" ON ai_conversations
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = ai_conversations.user_id
      AND family_members.member_user_id = (select auth.uid())
      AND family_members.access_level IN ('full', 'read')
    )
  );

CREATE POLICY "Users can create conversations" ON ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own conversations" ON ai_conversations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- AI_MESSAGES TABLE
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Family members can view AI messages" ON ai_messages;

CREATE POLICY "Users can view messages in own conversations" ON ai_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND (
        ai_conversations.user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM family_members
          WHERE family_members.user_id = ai_conversations.user_id
          AND family_members.member_user_id = (select auth.uid())
          AND family_members.access_level IN ('full', 'read')
        )
      )
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON ai_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = (select auth.uid())
    )
  );

-- AI_TASKS TABLE
DROP POLICY IF EXISTS "Users can view own AI tasks" ON ai_tasks;
DROP POLICY IF EXISTS "Users can create AI tasks" ON ai_tasks;
DROP POLICY IF EXISTS "Users can update own AI tasks" ON ai_tasks;
DROP POLICY IF EXISTS "Users can delete own AI tasks" ON ai_tasks;

CREATE POLICY "Users can view own AI tasks" ON ai_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create AI tasks" ON ai_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own AI tasks" ON ai_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own AI tasks" ON ai_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = ai_tasks.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );
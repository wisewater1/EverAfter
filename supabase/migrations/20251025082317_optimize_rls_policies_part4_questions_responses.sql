/*
  # Optimize RLS Policies - Part 4: Questions and Responses

  Optimizes RLS policies for question and response tables
  Covers: daily_question_responses, user_daily_progress, agent_tasks, agent_task_logs, 
          personality_traits, trait_task_associations, family_personality_questions
*/

-- DAILY_QUESTION_RESPONSES TABLE
DROP POLICY IF EXISTS "Users can view own daily responses" ON daily_question_responses;
DROP POLICY IF EXISTS "Users can create own daily responses" ON daily_question_responses;
DROP POLICY IF EXISTS "Users can update own daily responses" ON daily_question_responses;
DROP POLICY IF EXISTS "Users can delete own daily responses" ON daily_question_responses;
DROP POLICY IF EXISTS "Family members can view daily responses" ON daily_question_responses;

CREATE POLICY "Users can view own daily responses" ON daily_question_responses
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = daily_question_responses.user_id
      AND family_members.member_user_id = (select auth.uid())
      AND family_members.access_level IN ('full', 'read')
    )
  );

CREATE POLICY "Users can create own daily responses" ON daily_question_responses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own daily responses" ON daily_question_responses
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own daily responses" ON daily_question_responses
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- USER_DAILY_PROGRESS TABLE
DROP POLICY IF EXISTS "Users can view own progress" ON user_daily_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_daily_progress;
DROP POLICY IF EXISTS "System can insert progress" ON user_daily_progress;

CREATE POLICY "Users can view own progress" ON user_daily_progress
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own progress" ON user_daily_progress
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "System can insert progress" ON user_daily_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- AGENT_TASKS TABLE
DROP POLICY IF EXISTS "Users can view own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can create own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can update own agent tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can delete own agent tasks" ON agent_tasks;

CREATE POLICY "Users can view own agent tasks" ON agent_tasks
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own agent tasks" ON agent_tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own agent tasks" ON agent_tasks
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own agent tasks" ON agent_tasks
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- AGENT_TASK_LOGS TABLE
DROP POLICY IF EXISTS "Users can view logs for own tasks" ON agent_task_logs;
DROP POLICY IF EXISTS "System can create task logs" ON agent_task_logs;

CREATE POLICY "Users can view logs for own tasks" ON agent_task_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agent_tasks
      WHERE agent_tasks.id = agent_task_logs.task_id
      AND agent_tasks.user_id = (select auth.uid())
    )
  );

CREATE POLICY "System can create task logs" ON agent_task_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_tasks
      WHERE agent_tasks.id = agent_task_logs.task_id
      AND agent_tasks.user_id = (select auth.uid())
    )
  );

-- PERSONALITY_TRAITS TABLE
DROP POLICY IF EXISTS "Users can view traits for their AIs" ON personality_traits;

CREATE POLICY "Users can view traits for their AIs" ON personality_traits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM archetypal_ais
      WHERE archetypal_ais.id = personality_traits.ai_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

-- TRAIT_TASK_ASSOCIATIONS TABLE
DROP POLICY IF EXISTS "Users can view associations for their traits" ON trait_task_associations;

CREATE POLICY "Users can view associations for their traits" ON trait_task_associations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personality_traits
      JOIN archetypal_ais ON archetypal_ais.id = personality_traits.ai_id
      WHERE personality_traits.id = trait_task_associations.trait_id
      AND archetypal_ais.user_id = (select auth.uid())
    )
  );

-- FAMILY_PERSONALITY_QUESTIONS TABLE
DROP POLICY IF EXISTS "Users can view their own questions" ON family_personality_questions;
DROP POLICY IF EXISTS "Users can create questions" ON family_personality_questions;
DROP POLICY IF EXISTS "Users can update their questions" ON family_personality_questions;
DROP POLICY IF EXISTS "Users can delete their questions" ON family_personality_questions;

CREATE POLICY "Users can view their own questions" ON family_personality_questions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create questions" ON family_personality_questions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their questions" ON family_personality_questions
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their questions" ON family_personality_questions
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
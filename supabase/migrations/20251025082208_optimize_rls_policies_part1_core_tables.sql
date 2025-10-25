/*
  # Optimize RLS Policies - Part 1: Core Tables

  Optimizes RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  This prevents re-evaluation for each row and significantly improves query performance
  
  Covers: profiles, memories, family_members, daily_question_embeddings, saint_activities
*/

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- MEMORIES TABLE
DROP POLICY IF EXISTS "Users can view own memories" ON memories;
DROP POLICY IF EXISTS "Users can create own memories" ON memories;
DROP POLICY IF EXISTS "Users can update own memories" ON memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON memories;
DROP POLICY IF EXISTS "Family members can view authorized memories" ON memories;

CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.user_id = memories.user_id
      AND family_members.member_user_id = (select auth.uid())
      AND family_members.access_level IN ('full', 'read')
    )
  );

CREATE POLICY "Users can create own memories" ON memories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- FAMILY_MEMBERS TABLE
DROP POLICY IF EXISTS "Users can view own family members" ON family_members;
DROP POLICY IF EXISTS "Users can create own family members" ON family_members;
DROP POLICY IF EXISTS "Users can update own family members" ON family_members;
DROP POLICY IF EXISTS "Users can delete own family members" ON family_members;

CREATE POLICY "Users can view own family members" ON family_members
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own family members" ON family_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own family members" ON family_members
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own family members" ON family_members
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- DAILY_QUESTION_EMBEDDINGS TABLE
DROP POLICY IF EXISTS "Users can view own daily question embeddings" ON daily_question_embeddings;
DROP POLICY IF EXISTS "Users can insert own daily question embeddings" ON daily_question_embeddings;

CREATE POLICY "Users can view own daily question embeddings" ON daily_question_embeddings
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own daily question embeddings" ON daily_question_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- SAINT_ACTIVITIES TABLE
DROP POLICY IF EXISTS "Users can view own saint activities" ON saint_activities;
DROP POLICY IF EXISTS "Users can create own saint activities" ON saint_activities;

CREATE POLICY "Users can view own saint activities" ON saint_activities
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own saint activities" ON saint_activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
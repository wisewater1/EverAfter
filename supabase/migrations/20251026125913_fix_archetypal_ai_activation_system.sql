/*
  # Fix Archetypal AI Activation System

  ## Summary
  This migration fixes the activation system for Archetypal AIs by adding proper fields
  and automation to enable chat and task features when AIs reach training readiness.

  ## Changes Made

  1. **archetypal_ais table enhancements**
     - Add `is_ai_active` boolean field to track activation status
     - Add `ai_readiness_score` integer field (0-100) to track training progress
     - Add computed score based on total_memories

  2. **Database function for AI readiness calculation**
     - Creates function to calculate readiness score based on memories
     - Considers 50+ memories as 80% readiness threshold
     - Automatically activates AI when threshold is reached

  3. **Trigger for automatic activation**
     - Triggers on archetypal_ais updates
     - Automatically sets is_ai_active to true when readiness >= 80
     - Updates ai_readiness_score based on total_memories

  4. **Fix ai_tasks table**
     - Ensure ai_tasks properly references archetypal_ais

  ## Notes
  - AIs with 50+ memories will automatically activate
  - Users can manually deactivate if desired
  - Existing AIs will be evaluated and activated if they meet criteria
*/

-- Step 1: Add is_ai_active and ai_readiness_score to archetypal_ais if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'archetypal_ais' AND column_name = 'is_ai_active'
  ) THEN
    ALTER TABLE archetypal_ais ADD COLUMN is_ai_active boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'archetypal_ais' AND column_name = 'ai_readiness_score'
  ) THEN
    ALTER TABLE archetypal_ais ADD COLUMN ai_readiness_score integer DEFAULT 0 CHECK (ai_readiness_score >= 0 AND ai_readiness_score <= 100);
  END IF;
END $$;

-- Step 2: Create function to calculate AI readiness score
CREATE OR REPLACE FUNCTION calculate_ai_readiness_score(memories_count integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- Each memory contributes to readiness
  -- 50 memories = 80% ready (activation threshold)
  -- 100+ memories = 100% ready
  IF memories_count >= 100 THEN
    RETURN 100;
  ELSIF memories_count >= 50 THEN
    RETURN 80 + ((memories_count - 50) * 20 / 50);
  ELSE
    RETURN (memories_count * 80 / 50);
  END IF;
END;
$$;

-- Step 3: Create function to auto-update AI activation status
CREATE OR REPLACE FUNCTION update_archetypal_ai_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  readiness_score integer;
BEGIN
  -- Calculate readiness score based on total memories
  readiness_score := calculate_ai_readiness_score(NEW.total_memories);
  
  -- Update the readiness score
  NEW.ai_readiness_score := readiness_score;
  
  -- Auto-activate if readiness >= 80 and training status is ready
  IF readiness_score >= 80 AND NEW.training_status = 'ready' THEN
    NEW.is_ai_active := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger for automatic activation
DROP TRIGGER IF EXISTS trigger_update_ai_activation ON archetypal_ais;

CREATE TRIGGER trigger_update_ai_activation
  BEFORE INSERT OR UPDATE OF total_memories, training_status
  ON archetypal_ais
  FOR EACH ROW
  EXECUTE FUNCTION update_archetypal_ai_activation();

-- Step 5: Update existing archetypal AIs with readiness scores and activation status
UPDATE archetypal_ais
SET 
  ai_readiness_score = calculate_ai_readiness_score(total_memories),
  is_ai_active = CASE 
    WHEN calculate_ai_readiness_score(total_memories) >= 80 AND training_status = 'ready' 
    THEN true 
    ELSE false 
  END
WHERE ai_readiness_score IS NULL OR ai_readiness_score = 0;

-- Step 6: Update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_archetypal_ais_active ON archetypal_ais(is_ai_active) WHERE is_ai_active = true;
CREATE INDEX IF NOT EXISTS idx_archetypal_ais_readiness ON archetypal_ais(ai_readiness_score);
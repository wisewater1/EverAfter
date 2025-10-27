/*
  # Add Archetype Field to Archetypal AIs

  ## Changes
  This migration enhances the archetypal_ais table to support AI personality archetypes,
  improving the AI creation experience with predefined templates.

  ### Schema Changes
  1. **archetypal_ais table**
     - Add `archetype` (text) - The personality archetype (philosopher, advisor, companion, creative, mentor, custom)
     - Add constraint to validate archetype values
     - Set default to 'custom' for backward compatibility

  ## Security
  - No RLS policy changes needed
  - Existing policies continue to work

  ## Notes
  - Existing AIs will default to 'custom' archetype
  - Field is optional and can be used for filtering and analytics
*/

-- Add archetype column to archetypal_ais table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'archetypal_ais'
    AND column_name = 'archetype'
  ) THEN
    ALTER TABLE archetypal_ais
    ADD COLUMN archetype text DEFAULT 'custom'
    CHECK (archetype IN ('philosopher', 'advisor', 'companion', 'creative', 'mentor', 'custom'));
  END IF;
END $$;

-- Create index for archetype filtering (improves query performance)
CREATE INDEX IF NOT EXISTS idx_archetypal_ais_archetype
ON archetypal_ais(archetype);

-- Update existing AIs to have 'custom' archetype if null
UPDATE archetypal_ais
SET archetype = 'custom'
WHERE archetype IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN archetypal_ais.archetype IS 'Personality archetype template used during AI creation (philosopher, advisor, companion, creative, mentor, custom)';

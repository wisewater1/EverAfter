/*
  # Add created_at column to family_members table

  1. Changes
    - Add `created_at` column to `family_members` table with default value
    - Backfill existing records to use `invited_at` as `created_at`

  2. Notes
    - This ensures compatibility with the FamilyMembers component which orders by created_at
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE family_members ADD COLUMN created_at timestamptz DEFAULT now();
    
    -- Backfill existing records to use invited_at as created_at
    UPDATE family_members SET created_at = invited_at WHERE created_at IS NULL;
  END IF;
END $$;
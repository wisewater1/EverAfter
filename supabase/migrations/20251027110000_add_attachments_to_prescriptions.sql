/*
  # Add File Attachments to Prescriptions

  ## Changes
  - Add `attachment_file_ids` column to prescriptions table for storing prescription images and documents
  - Create index for better query performance

  ## Security
  - Maintains existing RLS policies
  - Files are stored in user_files table with proper access control
*/

-- Add attachment_file_ids column to prescriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prescriptions' AND column_name = 'attachment_file_ids'
  ) THEN
    ALTER TABLE prescriptions
    ADD COLUMN attachment_file_ids uuid[];
  END IF;
END $$;

-- Create index for better performance when querying by attachments
CREATE INDEX IF NOT EXISTS idx_prescriptions_attachment_file_ids
  ON prescriptions USING GIN(attachment_file_ids);

-- Add comment for documentation
COMMENT ON COLUMN prescriptions.attachment_file_ids IS 'Array of file IDs (from user_files table) attached to this prescription - e.g., prescription images, doctor notes';

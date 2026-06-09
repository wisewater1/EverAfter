/*
  # Enhance Appointments with File Storage and Virtual Features

  ## Changes
  - Add `attachment_file_ids` column for file attachments (referrals, insurance cards, etc.)
  - Add `reminder_enabled` boolean for reminder notifications
  - Add `is_virtual` boolean to mark telemedicine appointments
  - Add `virtual_meeting_link` for video call URLs
  - Create indexes for better query performance

  ## Security
  - Maintains existing RLS policies
  - Files are stored in user_files table with proper access control
*/

-- Add new columns to appointments table
DO $$
BEGIN
  -- Add attachment_file_ids column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'attachment_file_ids'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN attachment_file_ids uuid[];
  END IF;

  -- Add reminder_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'reminder_enabled'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN reminder_enabled BOOLEAN DEFAULT true;
  END IF;

  -- Add is_virtual column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'is_virtual'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN is_virtual BOOLEAN DEFAULT false;
  END IF;

  -- Add virtual_meeting_link column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'virtual_meeting_link'
  ) THEN
    ALTER TABLE appointments
    ADD COLUMN virtual_meeting_link TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_attachment_file_ids
  ON appointments USING GIN(attachment_file_ids);

CREATE INDEX IF NOT EXISTS idx_appointments_is_virtual
  ON appointments(is_virtual)
  WHERE is_virtual = true;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_enabled
  ON appointments(reminder_enabled)
  WHERE reminder_enabled = true;

-- Add comments for documentation
COMMENT ON COLUMN appointments.attachment_file_ids IS 'Array of file IDs (from user_files table) - e.g., referrals, insurance cards, medical documents';
COMMENT ON COLUMN appointments.reminder_enabled IS 'Whether reminder notifications are enabled for this appointment';
COMMENT ON COLUMN appointments.is_virtual IS 'Whether this is a virtual/telemedicine appointment';
COMMENT ON COLUMN appointments.virtual_meeting_link IS 'URL for virtual meeting (Zoom, Teams, etc.)';

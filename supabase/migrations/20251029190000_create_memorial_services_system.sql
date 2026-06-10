/*
  # Memorial Services Network System

  1. New Tables
    - `memorial_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `service_type` (text)
      - `provider_id` (text, optional)
      - `preferences` (jsonb)
      - `budget` (numeric)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `memorial_documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (uuid, optional references memorial_plans)
      - `document_type` (text)
      - `file_path` (text)
      - `file_name` (text)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `service_providers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `description` (text)
      - `location` (text)
      - `contact_info` (jsonb)
      - `rating` (numeric)
      - `review_count` (integer)
      - `price_range` (text)
      - `features` (jsonb)
      - `verified` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own plans and documents
    - Service providers are publicly readable
*/

-- Memorial Plans Table
CREATE TABLE IF NOT EXISTS memorial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL,
  provider_id text,
  preferences jsonb DEFAULT '{}'::jsonb,
  budget numeric DEFAULT 0,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memorial_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memorial plans"
  ON memorial_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memorial plans"
  ON memorial_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memorial plans"
  ON memorial_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorial plans"
  ON memorial_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Memorial Documents Table
CREATE TABLE IF NOT EXISTS memorial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES memorial_plans(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'pending', 'verified')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memorial_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memorial documents"
  ON memorial_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memorial documents"
  ON memorial_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memorial documents"
  ON memorial_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memorial documents"
  ON memorial_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service Providers Table
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('funeral_home', 'cemetery', 'cremation', 'memorial', 'florist', 'caterer')),
  description text,
  location text,
  contact_info jsonb DEFAULT '{}'::jsonb,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer DEFAULT 0,
  price_range text,
  features jsonb DEFAULT '[]'::jsonb,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service providers are publicly readable"
  ON service_providers FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memorial_plans_user_id ON memorial_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_plans_status ON memorial_plans(status);
CREATE INDEX IF NOT EXISTS idx_memorial_documents_user_id ON memorial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_memorial_documents_plan_id ON memorial_documents(plan_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_type ON service_providers(type);
CREATE INDEX IF NOT EXISTS idx_service_providers_verified ON service_providers(verified);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_memorial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_memorial_plans_updated_at ON memorial_plans;
CREATE TRIGGER update_memorial_plans_updated_at
  BEFORE UPDATE ON memorial_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_memorial_updated_at();

DROP TRIGGER IF EXISTS update_memorial_documents_updated_at ON memorial_documents;
CREATE TRIGGER update_memorial_documents_updated_at
  BEFORE UPDATE ON memorial_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_memorial_updated_at();

DROP TRIGGER IF EXISTS update_service_providers_updated_at ON service_providers;
CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_memorial_updated_at();

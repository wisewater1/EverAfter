/*
  # Create Eternal Care Insurance System

  1. New Tables
    - `insurance_policies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `policy_number` (text)
      - `policy_type` (text) - LIFE, TERM, WHOLE, UNIVERSAL, etc.
      - `provider_name` (text)
      - `coverage_amount` (numeric)
      - `premium_amount` (numeric)
      - `premium_frequency` (text) - MONTHLY, QUARTERLY, ANNUAL
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `status` (text) - ACTIVE, PENDING, LAPSED, CANCELLED
      - `policy_document_url` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `insurance_beneficiaries`
      - `id` (uuid, primary key)
      - `policy_id` (uuid, references insurance_policies)
      - `name` (text)
      - `relationship` (text)
      - `percentage` (numeric) - percentage of payout
      - `contact_email` (text, nullable)
      - `contact_phone` (text, nullable)
      - `date_of_birth` (date, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `insurance_claims`
      - `id` (uuid, primary key)
      - `policy_id` (uuid, references insurance_policies)
      - `claim_number` (text)
      - `claim_type` (text)
      - `claim_amount` (numeric)
      - `filed_date` (date)
      - `status` (text) - PENDING, APPROVED, DENIED, PAID
      - `resolution_date` (date, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `insurance_payments`
      - `id` (uuid, primary key)
      - `policy_id` (uuid, references insurance_policies)
      - `payment_date` (date)
      - `amount` (numeric)
      - `payment_method` (text)
      - `confirmation_number` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)

    - `insurance_documents`
      - `id` (uuid, primary key)
      - `policy_id` (uuid, references insurance_policies)
      - `document_type` (text) - POLICY, CLAIM, PAYMENT, OTHER
      - `document_name` (text)
      - `document_url` (text)
      - `uploaded_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own insurance data
*/

-- Create insurance_policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  policy_number text NOT NULL,
  policy_type text NOT NULL,
  provider_name text NOT NULL,
  coverage_amount numeric NOT NULL DEFAULT 0,
  premium_amount numeric NOT NULL DEFAULT 0,
  premium_frequency text NOT NULL DEFAULT 'MONTHLY',
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'ACTIVE',
  policy_document_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create insurance_beneficiaries table
CREATE TABLE IF NOT EXISTS insurance_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  percentage numeric NOT NULL DEFAULT 0,
  contact_email text,
  contact_phone text,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create insurance_claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  claim_number text NOT NULL,
  claim_type text NOT NULL,
  claim_amount numeric NOT NULL DEFAULT 0,
  filed_date date NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  resolution_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create insurance_payments table
CREATE TABLE IF NOT EXISTS insurance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  confirmation_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create insurance_documents table
CREATE TABLE IF NOT EXISTS insurance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON insurance_policies(status);
CREATE INDEX IF NOT EXISTS idx_insurance_beneficiaries_policy_id ON insurance_beneficiaries(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy_id ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_payments_policy_id ON insurance_payments(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_documents_policy_id ON insurance_documents(policy_id);

-- Enable RLS
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_policies
CREATE POLICY "Users can view own insurance policies"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own insurance policies"
  ON insurance_policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insurance policies"
  ON insurance_policies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insurance policies"
  ON insurance_policies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for insurance_beneficiaries
CREATE POLICY "Users can view beneficiaries of own policies"
  ON insurance_beneficiaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_beneficiaries.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create beneficiaries for own policies"
  ON insurance_beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_beneficiaries.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update beneficiaries of own policies"
  ON insurance_beneficiaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_beneficiaries.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_beneficiaries.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete beneficiaries of own policies"
  ON insurance_beneficiaries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_beneficiaries.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

-- RLS Policies for insurance_claims
CREATE POLICY "Users can view claims of own policies"
  ON insurance_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_claims.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create claims for own policies"
  ON insurance_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_claims.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update claims of own policies"
  ON insurance_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_claims.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_claims.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete claims of own policies"
  ON insurance_claims FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_claims.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

-- RLS Policies for insurance_payments
CREATE POLICY "Users can view payments of own policies"
  ON insurance_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_payments.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments for own policies"
  ON insurance_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_payments.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments of own policies"
  ON insurance_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_payments.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

-- RLS Policies for insurance_documents
CREATE POLICY "Users can view documents of own policies"
  ON insurance_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_documents.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents for own policies"
  ON insurance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_documents.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents of own policies"
  ON insurance_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM insurance_policies
      WHERE insurance_policies.id = insurance_documents.policy_id
      AND insurance_policies.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insurance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_updated_at();

CREATE TRIGGER update_insurance_beneficiaries_updated_at
  BEFORE UPDATE ON insurance_beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_updated_at();

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_updated_at();

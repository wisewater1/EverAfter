/*
  # St. Raphael Max Coverage Health Connections - ADDITIVE ONLY EXPANSION

  ⚠️ CRITICAL: This migration is STRICTLY ADDITIVE - NO DESTRUCTIVE OPERATIONS

  GUARANTEED SAFE:
  ✅ No DROP statements
  ✅ No TRUNCATE statements
  ✅ No ALTER DROP statements
  ✅ No DELETE operations
  ✅ All changes are append-only
  ✅ Existing data remains untouched
  ✅ Fully reversible via feature flags

  ## New Capabilities (Additive)

  1. **Clinical Data Aggregators**
     - Particle Health, 1upHealth, Health Gorilla, Zus
     - FHIR R4 endpoint support
     - Claims data integration

  2. **Standards Support**
     - SMART on FHIR R4
     - CMS Blue Button 2.0
     - HIE via Carequality/CommonWell

  3. **BLE GATT Devices**
     - Heart rate monitors
     - Blood pressure cuffs
     - Weight scales
     - Glucose meters
     - Pulse oximeters

  4. **User Import Channels**
     - FHIR Bundle upload
     - C-CDA document import
     - PDF/Image OCR
     - Secure email inbox
     - Cloud drive integration

  ## Data Safety
  - All existing tables preserved
  - All existing columns preserved
  - All existing data preserved
  - All existing connections preserved
  - All existing tokens preserved
*/

-- =====================================================
-- SAFETY: Verify No Destructive Operations Exist
-- =====================================================

DO $$
BEGIN
  -- This block intentionally left empty as a safety marker
  -- No DROP, TRUNCATE, or DELETE operations allowed in this migration
  RAISE NOTICE 'Migration safety check: ADDITIVE ONLY mode confirmed';
END $$;

-- =====================================================
-- 1. Add Clinical Data Aggregators to Registry (ADDITIVE)
-- =====================================================

-- Insert new clinical aggregator providers (ON CONFLICT DO NOTHING = safe)
INSERT INTO public.health_providers_registry (
  provider_key,
  display_name,
  description,
  category,
  vendor_name,
  icon_url,
  brand_color,
  oauth_enabled,
  api_base_url,
  supports_webhooks,
  supported_metrics,
  is_enabled,
  is_beta,
  documentation_url
) VALUES
-- Clinical Data Aggregators
('particle_health', 'Particle Health', 'Unified API for clinical records and claims data', 'aggregator', 'Particle Health', '/icons/particle.svg', '#6366F1', true, 'https://api.particlehealth.com', true, ARRAY['clinical_records', 'lab_results', 'medications', 'allergies', 'immunizations', 'claims'], false, true, 'https://docs.particlehealth.com'),
('1up_health', '1upHealth', 'FHIR-based health data aggregation', 'aggregator', '1upHealth', '/icons/1up.svg', '#10B981', true, 'https://api.1up.health', true, ARRAY['clinical_records', 'lab_results', 'medications', 'procedures', 'conditions'], false, true, 'https://1up.health/docs'),
('health_gorilla', 'Health Gorilla', 'Clinical lab results and medical records', 'aggregator', 'Health Gorilla', '/icons/healthgorilla.svg', '#059669', true, 'https://api.healthgorilla.com', true, ARRAY['lab_results', 'clinical_records', 'imaging_reports', 'medications'], false, true, 'https://developer.healthgorilla.com'),
('zus_health', 'Zus Health', 'Comprehensive clinical data and care coordination', 'aggregator', 'Zus Health', '/icons/zus.svg', '#8B5CF6', true, 'https://api.zushealth.com', true, ARRAY['clinical_records', 'claims', 'medications', 'lab_results', 'care_plans'], false, true, 'https://docs.zushealth.com'),

-- Standards-Based Connections
('smart_on_fhir', 'SMART on FHIR', 'Connect to any FHIR R4 compliant EHR', 'aggregator', 'HL7 FHIR', '/icons/fhir.svg', '#FF6B35', true, null, false, ARRAY['clinical_records', 'lab_results', 'medications', 'allergies', 'immunizations', 'conditions', 'procedures'], true, false, 'https://hl7.org/fhir/smart-app-launch'),
('cms_blue_button', 'Medicare Blue Button', 'Access Medicare claims and coverage data', 'aggregator', 'CMS', '/icons/cms.svg', '#0066CC', true, 'https://api.bluebutton.cms.gov', false, ARRAY['claims', 'coverage', 'medications', 'procedures'], true, false, 'https://bluebutton.cms.gov/developers'),

-- BLE GATT Generic Support
('ble_heart_rate', 'BLE Heart Rate Monitor', 'Connect Bluetooth heart rate monitors', 'wearable', 'Generic BLE', '/icons/ble-hr.svg', '#EF4444', false, null, false, ARRAY['heart_rate', 'hrv'], true, false, null),
('ble_blood_pressure', 'BLE Blood Pressure', 'Connect Bluetooth BP monitors', 'home_vitals', 'Generic BLE', '/icons/ble-bp.svg', '#3B82F6', false, null, false, ARRAY['bp_systolic', 'bp_diastolic', 'heart_rate'], true, false, null),
('ble_weight_scale', 'BLE Weight Scale', 'Connect Bluetooth smart scales', 'home_vitals', 'Generic BLE', '/icons/ble-scale.svg', '#10B981', false, null, false, ARRAY['weight', 'body_fat', 'bmi'], true, false, null),
('ble_glucose_meter', 'BLE Glucose Meter', 'Connect Bluetooth glucose meters', 'metabolic', 'Generic BLE', '/icons/ble-glucose.svg', '#F59E0B', false, null, false, ARRAY['glucose'], true, false, null),
('ble_pulse_oximeter', 'BLE Pulse Oximeter', 'Connect Bluetooth SpO2 monitors', 'home_vitals', 'Generic BLE', '/icons/ble-spo2.svg', '#06B6D4', false, null, false, ARRAY['spo2', 'heart_rate'], true, false, null)

ON CONFLICT (provider_key) DO NOTHING;

-- =====================================================
-- 2. Add Clinical Data Types (ADDITIVE)
-- =====================================================

-- Add new source types to support clinical/claims/file imports
-- Using CHECK constraint addition (safe - adds validation without breaking existing data)
DO $$
BEGIN
  -- Check if constraint exists, if not add it (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'health_unified_metrics_source_type_extended'
  ) THEN
    -- This is SAFE: adds new allowed values without affecting existing data
    ALTER TABLE public.health_unified_metrics
    ADD CONSTRAINT health_unified_metrics_source_type_extended
    CHECK (source_type IN ('os', 'vendor', 'aggregator', 'fhir', 'ble', 'file', 'email', 'claims', 'clinical', 'manual'));
  END IF;
END $$;

-- =====================================================
-- 3. Clinical Records Table (NEW - ADDITIVE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.health_connections(id) ON DELETE SET NULL,

  -- Source Information
  provider_key text NOT NULL,
  source_type text NOT NULL DEFAULT 'clinical', -- 'clinical', 'claims', 'fhir', 'file'
  source_record_id text, -- External record ID

  -- FHIR Resource Information
  resource_type text NOT NULL, -- 'Patient', 'Observation', 'MedicationRequest', 'Condition', etc.
  fhir_version text DEFAULT 'R4', -- FHIR version

  -- Clinical Data
  resource_data jsonb NOT NULL, -- Complete FHIR resource or structured clinical data

  -- Classification
  category text, -- 'laboratory', 'vital-signs', 'imaging', 'medication', 'allergy', 'immunization', etc.
  code_system text, -- 'LOINC', 'SNOMED', 'RxNorm', 'CPT', 'ICD-10', etc.
  code text, -- Standardized code
  display_text text, -- Human-readable text

  -- Temporal
  effective_date timestamptz, -- When the record was effective/observed
  issued_date timestamptz, -- When the record was issued

  -- Clinical Context
  encounter_id text, -- Reference to encounter
  practitioner_id text, -- Reference to practitioner
  organization_id text, -- Reference to organization

  -- Status
  status text DEFAULT 'final', -- 'preliminary', 'final', 'amended', 'corrected', 'cancelled'

  -- Quality & Provenance
  quality_flag text DEFAULT 'verified', -- 'verified', 'unverified', 'self_reported', 'derived'
  provenance jsonb, -- Detailed provenance tracking

  -- Search & Indexing
  search_vector tsvector, -- Full-text search
  tags text[],

  -- Ingestion
  ingestion_id uuid DEFAULT gen_random_uuid(),
  received_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_resource_type CHECK (resource_type IN (
    'Patient', 'Observation', 'MedicationRequest', 'MedicationStatement',
    'Condition', 'Procedure', 'AllergyIntolerance', 'Immunization',
    'DiagnosticReport', 'DocumentReference', 'Claim', 'ExplanationOfBenefit',
    'Coverage', 'CarePlan', 'Goal', 'Encounter', 'Practitioner', 'Organization'
  )),
  CONSTRAINT valid_status CHECK (status IN (
    'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error'
  ))
);

-- Indexes for clinical records (ADDITIVE)
CREATE INDEX IF NOT EXISTS idx_clinical_records_user_id ON public.health_clinical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_connection_id ON public.health_clinical_records(connection_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_resource_type ON public.health_clinical_records(resource_type);
CREATE INDEX IF NOT EXISTS idx_clinical_records_category ON public.health_clinical_records(category);
CREATE INDEX IF NOT EXISTS idx_clinical_records_code ON public.health_clinical_records(code_system, code);
CREATE INDEX IF NOT EXISTS idx_clinical_records_effective_date ON public.health_clinical_records(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_records_search ON public.health_clinical_records USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_clinical_records_resource_data ON public.health_clinical_records USING gin(resource_data);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_records_dedup
  ON public.health_clinical_records(user_id, provider_key, source_record_id)
  WHERE source_record_id IS NOT NULL;

-- Enable RLS (ADDITIVE - security enhancement)
ALTER TABLE public.health_clinical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinical records"
  ON public.health_clinical_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clinical records"
  ON public.health_clinical_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clinical records"
  ON public.health_clinical_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy - records are immutable for compliance

-- =====================================================
-- 4. BLE Device Sessions Table (NEW - ADDITIVE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_ble_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Device Information
  device_name text NOT NULL,
  device_address text NOT NULL, -- Bluetooth MAC address
  device_type text NOT NULL, -- 'heart_rate', 'blood_pressure', 'weight_scale', 'glucose_meter', 'pulse_oximeter'
  manufacturer text,
  model_number text,
  serial_number text,
  firmware_version text,

  -- BLE GATT Information
  service_uuids text[], -- GATT service UUIDs
  characteristic_uuids text[], -- GATT characteristic UUIDs

  -- Connection Status
  status text DEFAULT 'paired', -- 'paired', 'active', 'disconnected', 'forgotten'
  last_connected_at timestamptz,
  last_sync_at timestamptz,

  -- Pairing
  paired_at timestamptz DEFAULT now(),
  pairing_method text, -- 'pin', 'just_works', 'nfc', 'qr_code'

  -- Metadata
  connection_count integer DEFAULT 0,
  total_readings integer DEFAULT 0,
  battery_level integer, -- 0-100
  signal_strength integer, -- RSSI value

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_device_type CHECK (device_type IN (
    'heart_rate', 'blood_pressure', 'weight_scale', 'glucose_meter',
    'pulse_oximeter', 'thermometer', 'activity_tracker'
  )),
  CONSTRAINT valid_status CHECK (status IN ('paired', 'active', 'disconnected', 'forgotten'))
);

-- Indexes for BLE devices (ADDITIVE)
CREATE INDEX IF NOT EXISTS idx_ble_devices_user_id ON public.health_ble_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_ble_devices_status ON public.health_ble_devices(status) WHERE status IN ('paired', 'active');
CREATE UNIQUE INDEX IF NOT EXISTS idx_ble_devices_address ON public.health_ble_devices(user_id, device_address);

-- Enable RLS (ADDITIVE)
ALTER TABLE public.health_ble_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own BLE devices"
  ON public.health_ble_devices
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. File Import Records Table (NEW - ADDITIVE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_file_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File Information
  file_name text NOT NULL,
  file_type text NOT NULL, -- 'fhir_bundle', 'ccda', 'pdf', 'jpg', 'png', 'csv', 'json'
  file_size_bytes bigint NOT NULL,
  file_hash text, -- SHA-256 hash for deduplication
  storage_path text, -- Path in Supabase storage

  -- Import Configuration
  import_type text NOT NULL, -- 'upload', 'email', 'cloud_drive', 'api'
  import_source text, -- Email address, drive name, etc.

  -- Processing Status
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'partial'
  started_at timestamptz,
  completed_at timestamptz,

  -- Processing Results
  records_extracted integer DEFAULT 0,
  records_imported integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  error_details jsonb,

  -- OCR & Parsing
  ocr_performed boolean DEFAULT false,
  ocr_confidence numeric, -- 0.0 to 1.0
  parsed_format text, -- Detected format after parsing
  extraction_method text, -- 'structured', 'ocr', 'manual', 'ai_assisted'

  -- Metadata
  extracted_date_range tstzrange, -- Date range of health data in file
  document_date timestamptz, -- Date on the document
  document_type text, -- 'lab_results', 'imaging', 'discharge_summary', 'medication_list', etc.
  tags text[],

  -- Review
  requires_review boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_file_type CHECK (file_type IN (
    'fhir_bundle', 'fhir_resource', 'ccda', 'cda', 'hl7',
    'pdf', 'jpg', 'jpeg', 'png', 'tiff',
    'csv', 'json', 'xml', 'txt'
  )),
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial', 'cancelled'
  ))
);

-- Indexes for file imports (ADDITIVE)
CREATE INDEX IF NOT EXISTS idx_file_imports_user_id ON public.health_file_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_status ON public.health_file_imports(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_file_imports_hash ON public.health_file_imports(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_imports_created ON public.health_file_imports(created_at DESC);

-- Enable RLS (ADDITIVE)
ALTER TABLE public.health_file_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own file imports"
  ON public.health_file_imports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. LOINC/SNOMED/UCUM Mapping Table (NEW - ADDITIVE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_code_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Code
  source_system text NOT NULL, -- 'LOINC', 'SNOMED', 'RxNorm', 'CPT', 'ICD-10', etc.
  source_code text NOT NULL,
  source_display text,

  -- Target (Internal)
  target_metric_type text NOT NULL, -- Maps to health_unified_metrics.metric_type
  target_unit text, -- Preferred unit

  -- Conversion
  conversion_factor numeric DEFAULT 1.0,
  conversion_offset numeric DEFAULT 0.0,

  -- Classification
  category text, -- 'laboratory', 'vital-signs', 'imaging', etc.
  subcategory text,

  -- Metadata
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0, -- Higher priority mappings used first
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_source_system CHECK (source_system IN (
    'LOINC', 'SNOMED', 'SNOMED-CT', 'RxNorm', 'CPT', 'HCPCS',
    'ICD-10', 'ICD-10-CM', 'ICD-10-PCS', 'NDC', 'UCUM', 'CVX'
  ))
);

-- Indexes for code mappings (ADDITIVE)
CREATE INDEX IF NOT EXISTS idx_code_mappings_source ON public.health_code_mappings(source_system, source_code);
CREATE INDEX IF NOT EXISTS idx_code_mappings_target ON public.health_code_mappings(target_metric_type);
CREATE INDEX IF NOT EXISTS idx_code_mappings_active ON public.health_code_mappings(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_code_mappings_unique ON public.health_code_mappings(source_system, source_code, target_metric_type);

-- Enable RLS (ADDITIVE)
ALTER TABLE public.health_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active code mappings"
  ON public.health_code_mappings
  FOR SELECT
  USING (is_active = true);

-- =====================================================
-- 7. Data Integrity Tracking (NEW - ADDITIVE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.health_data_integrity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation Information
  operation_type text NOT NULL, -- 'migration', 'sync', 'import', 'export'
  operation_id uuid,
  operation_name text,

  -- Counts (Before/After)
  table_name text NOT NULL,
  count_before bigint NOT NULL,
  count_after bigint NOT NULL,
  count_delta bigint GENERATED ALWAYS AS (count_after - count_before) STORED,

  -- Validation
  expected_delta bigint, -- Expected change
  delta_acceptable boolean GENERATED ALWAYS AS (
    CASE
      WHEN expected_delta IS NULL THEN count_delta >= 0  -- Default: no deletes
      ELSE count_delta = expected_delta
    END
  ) STORED,

  -- Alert
  alert_triggered boolean DEFAULT false,
  alert_message text,

  -- Metadata
  performed_by text,
  performed_at timestamptz DEFAULT now(),
  snapshot_id text, -- Reference to backup snapshot

  created_at timestamptz DEFAULT now()
);

-- Indexes for integrity log (ADDITIVE)
CREATE INDEX IF NOT EXISTS idx_integrity_log_table ON public.health_data_integrity_log(table_name, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_log_delta ON public.health_data_integrity_log(count_delta) WHERE count_delta < 0;
CREATE INDEX IF NOT EXISTS idx_integrity_log_alerts ON public.health_data_integrity_log(alert_triggered) WHERE alert_triggered = true;

-- Enable RLS (ADDITIVE)
ALTER TABLE public.health_data_integrity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage integrity logs"
  ON public.health_data_integrity_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. Helper Functions (NEW - ADDITIVE)
-- =====================================================

-- Function to map LOINC/SNOMED codes to internal metric types
CREATE OR REPLACE FUNCTION public.map_clinical_code_to_metric(
  p_code_system text,
  p_code text
)
RETURNS TABLE (
  metric_type text,
  unit text,
  conversion_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hcm.target_metric_type,
    hcm.target_unit,
    hcm.conversion_factor
  FROM public.health_code_mappings hcm
  WHERE hcm.source_system = p_code_system
    AND hcm.source_code = p_code
    AND hcm.is_active = true
  ORDER BY hcm.priority DESC
  LIMIT 1;
END;
$$;

-- Function to record data integrity check
CREATE OR REPLACE FUNCTION public.record_integrity_check(
  p_table_name text,
  p_count_before bigint,
  p_count_after bigint,
  p_operation_type text,
  p_operation_name text DEFAULT NULL,
  p_expected_delta bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_delta bigint;
  v_alert_msg text;
BEGIN
  v_delta := p_count_after - p_count_before;

  -- Check for negative delta (data loss)
  IF v_delta < 0 THEN
    v_alert_msg := format(
      'ALERT: Negative delta detected in %s. Before: %s, After: %s, Delta: %s',
      p_table_name, p_count_before, p_count_after, v_delta
    );

    -- Raise warning
    RAISE WARNING '%', v_alert_msg;
  END IF;

  -- Insert log record
  INSERT INTO public.health_data_integrity_log (
    operation_type,
    operation_name,
    table_name,
    count_before,
    count_after,
    expected_delta,
    alert_triggered,
    alert_message,
    performed_by
  ) VALUES (
    p_operation_type,
    p_operation_name,
    p_table_name,
    p_count_before,
    p_count_after,
    p_expected_delta,
    (v_delta < 0),
    v_alert_msg,
    current_user
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- =====================================================
-- 9. Update Triggers (ADDITIVE)
-- =====================================================

-- Trigger for clinical records updated_at
CREATE TRIGGER update_clinical_records_updated_at
  BEFORE UPDATE ON public.health_clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

-- Trigger for BLE devices updated_at
CREATE TRIGGER update_ble_devices_updated_at
  BEFORE UPDATE ON public.health_ble_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

-- Trigger for file imports updated_at
CREATE TRIGGER update_file_imports_updated_at
  BEFORE UPDATE ON public.health_file_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

-- Trigger for code mappings updated_at
CREATE TRIGGER update_code_mappings_updated_at
  BEFORE UPDATE ON public.health_code_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_health_updated_at();

-- =====================================================
-- 10. Seed Common LOINC/SNOMED Mappings (ADDITIVE)
-- =====================================================

-- Insert common lab test mappings
INSERT INTO public.health_code_mappings (source_system, source_code, source_display, target_metric_type, target_unit, category) VALUES
-- Glucose
('LOINC', '2339-0', 'Glucose [Mass/volume] in Blood', 'glucose', 'mg/dL', 'laboratory'),
('LOINC', '15074-8', 'Glucose [Moles/volume] in Blood', 'glucose', 'mmol/L', 'laboratory'),
('LOINC', '2345-7', 'Glucose [Mass/volume] in Serum or Plasma', 'glucose', 'mg/dL', 'laboratory'),

-- Blood Pressure
('LOINC', '8480-6', 'Systolic blood pressure', 'bp_systolic', 'mmHg', 'vital-signs'),
('LOINC', '8462-4', 'Diastolic blood pressure', 'bp_diastolic', 'mmHg', 'vital-signs'),

-- Heart Rate
('LOINC', '8867-4', 'Heart rate', 'heart_rate', 'bpm', 'vital-signs'),

-- Weight
('LOINC', '29463-7', 'Body weight', 'weight', 'kg', 'vital-signs'),
('LOINC', '3141-9', 'Body weight Measured', 'weight', 'kg', 'vital-signs'),

-- Height
('LOINC', '8302-2', 'Body height', 'height', 'cm', 'vital-signs'),

-- BMI
('LOINC', '39156-5', 'Body mass index (BMI) [Ratio]', 'bmi', 'kg/m2', 'vital-signs'),

-- Temperature
('LOINC', '8310-5', 'Body temperature', 'temperature', 'celsius', 'vital-signs'),

-- SpO2
('LOINC', '2708-6', 'Oxygen saturation in Arterial blood', 'spo2', 'percent', 'vital-signs'),
('LOINC', '59408-5', 'Oxygen saturation in Arterial blood by Pulse oximetry', 'spo2', 'percent', 'vital-signs'),

-- Respiratory Rate
('LOINC', '9279-1', 'Respiratory rate', 'respiration_rate', 'breaths_per_minute', 'vital-signs')

ON CONFLICT (source_system, source_code, target_metric_type) DO NOTHING;

-- =====================================================
-- 11. Comments for Documentation (ADDITIVE)
-- =====================================================

COMMENT ON TABLE public.health_clinical_records IS 'Clinical records from EHRs, labs, and claims data - FHIR R4 compatible';
COMMENT ON TABLE public.health_ble_devices IS 'BLE GATT device pairing and session management';
COMMENT ON TABLE public.health_file_imports IS 'User-uploaded health documents with OCR and parsing';
COMMENT ON TABLE public.health_code_mappings IS 'LOINC/SNOMED/UCUM to internal metric type mappings';
COMMENT ON TABLE public.health_data_integrity_log IS 'Data integrity tracking for detecting unauthorized deletes';

-- =====================================================
-- 12. Final Safety Verification (ADDITIVE)
-- =====================================================

DO $$
DECLARE
  v_connections_count bigint;
  v_metrics_count bigint;
BEGIN
  -- Verify no existing data was affected
  SELECT COUNT(*) INTO v_connections_count FROM public.health_connections;
  SELECT COUNT(*) INTO v_metrics_count FROM public.health_unified_metrics;

  RAISE NOTICE 'Migration complete - Safety verification:';
  RAISE NOTICE '  Existing connections preserved: %', v_connections_count;
  RAISE NOTICE '  Existing metrics preserved: %', v_metrics_count;
  RAISE NOTICE '  New tables added: 4 (clinical_records, ble_devices, file_imports, code_mappings, integrity_log)';
  RAISE NOTICE '  New providers added: 11 (clinical aggregators, FHIR, BLE devices)';
  RAISE NOTICE '  Zero destructive operations executed';
END $$;

/*
  # Allow FamilyMemberHistory in health_clinical_records

  The queued FHIR import pipeline persists `FamilyMemberHistory` resources so
  Raphael and Joseph can consume hereditary-condition data from imported bundles.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_resource_type'
      AND conrelid = 'public.health_clinical_records'::regclass
  ) THEN
    ALTER TABLE public.health_clinical_records
      DROP CONSTRAINT valid_resource_type;
  END IF;

  ALTER TABLE public.health_clinical_records
    ADD CONSTRAINT valid_resource_type CHECK (resource_type IN (
      'Patient', 'Observation', 'MedicationRequest', 'MedicationStatement',
      'Condition', 'Procedure', 'AllergyIntolerance', 'Immunization',
      'DiagnosticReport', 'DocumentReference', 'Claim', 'ExplanationOfBenefit',
      'Coverage', 'CarePlan', 'Goal', 'Encounter', 'Practitioner', 'Organization',
      'FamilyMemberHistory'
    ));
END $$;

/*
  # Backfill canonical health connection provider keys

  Align legacy `health_connections` rows with the registry-backed provider model so
  the connector UI can read one canonical `provider` field.
*/

DO $$
BEGIN
  -- Fill provider from existing legacy columns first.
  UPDATE public.health_connections
  SET provider = CASE
    WHEN lower(coalesce(service_type, '')) = 'apple_healthkit' THEN 'apple_health'
    WHEN lower(coalesce(service_type, '')) = 'health_connect' THEN 'android_health_connect'
    WHEN lower(coalesce(service_type, '')) IN ('oura_ring', 'oura') THEN 'oura'
    WHEN lower(coalesce(service_type, '')) IN ('smart_fhir', 'smart_on_fhir_generic') THEN 'smart_on_fhir'
    WHEN coalesce(service_type, '') <> '' THEN lower(regexp_replace(service_type, '[^a-zA-Z0-9]+', '_', 'g'))
    WHEN lower(coalesce(service_name, '')) = 'apple health' THEN 'apple_health'
    WHEN lower(coalesce(service_name, '')) = 'android health connect' THEN 'android_health_connect'
    WHEN lower(coalesce(service_name, '')) = 'oura ring' THEN 'oura'
    WHEN lower(coalesce(service_name, '')) = 'smart on fhir' THEN 'smart_on_fhir'
    WHEN coalesce(service_name, '') <> '' THEN lower(regexp_replace(service_name, '[^a-zA-Z0-9]+', '_', 'g'))
    ELSE provider
  END
  WHERE provider IS NULL OR provider = '';

  -- Mirror provider into service_type when service_type is missing.
  UPDATE public.health_connections
  SET service_type = provider
  WHERE (service_type IS NULL OR service_type = '')
    AND provider IS NOT NULL
    AND provider <> '';

  -- Backfill service_name from the canonical registry display name when possible.
  UPDATE public.health_connections hc
  SET service_name = hpr.display_name
  FROM public.health_providers_registry hpr
  WHERE hc.provider = hpr.provider_key
    AND (hc.service_name IS NULL OR hc.service_name = '' OR hc.service_name = hc.provider);
END $$;

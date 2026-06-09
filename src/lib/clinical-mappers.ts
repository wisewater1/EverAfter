/**
 * Clinical Data Mappers - FHIR R4 to Unified Model
 *
 * Maps FHIR resources and clinical data to unified health metrics
 * SAFETY: All operations are read-only transformations, no data deletion
 */

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
  };
  [key: string]: any;
}

export interface ClinicalRecord {
  resource_type: string;
  resource_data: any;
  category?: string;
  code_system?: string;
  code?: string;
  display_text?: string;
  effective_date?: string;
  status?: string;
  source_record_id?: string;
}

export interface UnifiedMetric {
  metric_type: string;
  value: number;
  unit: string;
  start_time: string;
  end_time?: string;
  quality_flag?: string;
  data_source?: string;
  activity_context?: string;
  source_record_id?: string;
}

/**
 * FHIR Observation Mapper
 * Maps FHIR Observation resources to unified metrics
 */
export class FHIRObservationMapper {
  static map(observation: FHIRResource): UnifiedMetric[] {
    const metrics: UnifiedMetric[] = [];

    if (observation.resourceType !== 'Observation') {
      return metrics;
    }

    try {
      // Extract code and coding
      const code = observation.code?.coding?.[0];
      const codeSystem = code?.system || '';
      const codeValue = code?.code || '';

      // Extract value
      let value: number | null = null;
      let unit: string | null = null;
      let metricType: string | null = null;

    // Handle different value types
      if (observation.valueQuantity) {
        value = observation.valueQuantity.value;
        unit = observation.valueQuantity.unit || observation.valueQuantity.code;
      } else if (observation.component) {
        // Handle multi-component observations (e.g., blood pressure)
        return this.mapComponents(observation);
      }

      if (value === null) {
        return metrics;
      }

      // Map LOINC codes to metric types
      metricType = this.mapLoincToMetricType(codeValue);

      if (!metricType) {
        // Skip unknown observations
        return metrics;
      }

      // Get effective time
      const effectiveTime =
        observation.effectiveDateTime ||
        observation.effectiveInstant ||
        observation.issued ||
        new Date().toISOString();

      metrics.push({
        metric_type: metricType,
        value: value,
        unit: unit || '',
        start_time: effectiveTime,
        quality_flag: this.mapStatus(observation.status),
        data_source: 'clinical',
        source_record_id: observation.id,
      });
    } catch (error) {
      console.error('Error mapping FHIR Observation:', error);
    }

    return metrics;
  }

  /**
   * Map multi-component observations (e.g., blood pressure)
   */
  private static mapComponents(observation: FHIRResource): UnifiedMetric[] {
    const metrics: UnifiedMetric[] = [];
    const effectiveTime =
      observation.effectiveDateTime ||
      observation.effectiveInstant ||
      new Date().toISOString();

    for (const component of observation.component || []) {
      const code = component.code?.coding?.[0]?.code;
      const value = component.valueQuantity?.value;
      const unit = component.valueQuantity?.unit;

      if (value && code) {
        const metricType = this.mapLoincToMetricType(code);
        if (metricType) {
          metrics.push({
            metric_type: metricType,
            value: value,
            unit: unit || '',
            start_time: effectiveTime,
            quality_flag: this.mapStatus(observation.status),
            data_source: 'clinical',
            source_record_id: observation.id,
          });
        }
      }
    }

    return metrics;
  }

  /**
   * Map LOINC codes to internal metric types
   */
  private static mapLoincToMetricType(loincCode: string): string | null {
    const mappings: Record<string, string> = {
      // Vital Signs
      '8480-6': 'bp_systolic',
      '8462-4': 'bp_diastolic',
      '8867-4': 'heart_rate',
      '29463-7': 'weight',
      '3141-9': 'weight',
      '8302-2': 'height',
      '39156-5': 'bmi',
      '8310-5': 'temperature',
      '2708-6': 'spo2',
      '59408-5': 'spo2',
      '9279-1': 'respiration_rate',

      // Glucose
      '2339-0': 'glucose',
      '15074-8': 'glucose',
      '2345-7': 'glucose',
      '41653-7': 'glucose',

      // Lipids
      '2093-3': 'cholesterol_total',
      '2085-9': 'cholesterol_hdl',
      '2089-1': 'cholesterol_ldl',
      '2571-8': 'triglycerides',

      // Hemoglobin A1c
      '4548-4': 'hba1c',
      '17856-6': 'hba1c',
    };

    return mappings[loincCode] || null;
  }

  /**
   * Map FHIR observation status to quality flag
   */
  private static mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      final: 'normal',
      amended: 'normal',
      corrected: 'normal',
      preliminary: 'low_quality',
      registered: 'low_quality',
      cancelled: 'device_calibrating',
      'entered-in-error': 'device_calibrating',
    };

    return statusMap[status] || 'normal';
  }
}

/**
 * FHIR MedicationRequest/Statement Mapper
 */
export class FHIRMedicationMapper {
  static toClinicalRecord(medication: FHIRResource): ClinicalRecord {
    const isRequest = medication.resourceType === 'MedicationRequest';
    const isStatement = medication.resourceType === 'MedicationStatement';

    if (!isRequest && !isStatement) {
      throw new Error('Invalid resource type for medication');
    }

    // Extract medication code
    const medCode =
      medication.medicationCodeableConcept?.coding?.[0] ||
      medication.medicationReference;

    return {
      resource_type: medication.resourceType,
      resource_data: medication,
      category: 'medication',
      code_system: medCode?.system || 'RxNorm',
      code: medCode?.code,
      display_text: medCode?.display || medication.medicationCodeableConcept?.text,
      effective_date: medication.authoredOn || medication.effectiveDateTime,
      status: medication.status,
      source_record_id: medication.id,
    };
  }
}

/**
 * FHIR Condition Mapper
 */
export class FHIRConditionMapper {
  static toClinicalRecord(condition: FHIRResource): ClinicalRecord {
    if (condition.resourceType !== 'Condition') {
      throw new Error('Invalid resource type for condition');
    }

    const code = condition.code?.coding?.[0];

    return {
      resource_type: 'Condition',
      resource_data: condition,
      category: 'condition',
      code_system: code?.system || 'ICD-10',
      code: code?.code,
      display_text: code?.display || condition.code?.text,
      effective_date: condition.onsetDateTime || condition.recordedDate,
      status: condition.clinicalStatus?.coding?.[0]?.code,
      source_record_id: condition.id,
    };
  }
}

/**
 * FHIR AllergyIntolerance Mapper
 */
export class FHIRAllergyMapper {
  static toClinicalRecord(allergy: FHIRResource): ClinicalRecord {
    if (allergy.resourceType !== 'AllergyIntolerance') {
      throw new Error('Invalid resource type for allergy');
    }

    const code = allergy.code?.coding?.[0];

    return {
      resource_type: 'AllergyIntolerance',
      resource_data: allergy,
      category: 'allergy',
      code_system: code?.system || 'SNOMED',
      code: code?.code,
      display_text: code?.display || allergy.code?.text,
      effective_date: allergy.recordedDate || allergy.onsetDateTime,
      status: allergy.clinicalStatus?.coding?.[0]?.code,
      source_record_id: allergy.id,
    };
  }
}

/**
 * FHIR Immunization Mapper
 */
export class FHIRImmunizationMapper {
  static toClinicalRecord(immunization: FHIRResource): ClinicalRecord {
    if (immunization.resourceType !== 'Immunization') {
      throw new Error('Invalid resource type for immunization');
    }

    const code = immunization.vaccineCode?.coding?.[0];

    return {
      resource_type: 'Immunization',
      resource_data: immunization,
      category: 'immunization',
      code_system: code?.system || 'CVX',
      code: code?.code,
      display_text: code?.display || immunization.vaccineCode?.text,
      effective_date: immunization.occurrenceDateTime || immunization.recorded,
      status: immunization.status,
      source_record_id: immunization.id,
    };
  }
}

/**
 * FHIR DiagnosticReport Mapper
 */
export class FHIRDiagnosticReportMapper {
  static toClinicalRecord(report: FHIRResource): ClinicalRecord {
    if (report.resourceType !== 'DiagnosticReport') {
      throw new Error('Invalid resource type for diagnostic report');
    }

    const code = report.code?.coding?.[0];

    return {
      resource_type: 'DiagnosticReport',
      resource_data: report,
      category: report.category?.[0]?.coding?.[0]?.code || 'laboratory',
      code_system: code?.system || 'LOINC',
      code: code?.code,
      display_text: code?.display || report.code?.text,
      effective_date: report.effectiveDateTime || report.issued,
      status: report.status,
      source_record_id: report.id,
    };
  }
}

/**
 * FHIR Claim/ExplanationOfBenefit Mapper
 */
export class FHIRClaimMapper {
  static toClinicalRecord(claim: FHIRResource): ClinicalRecord {
    const isEOB = claim.resourceType === 'ExplanationOfBenefit';
    const isClaim = claim.resourceType === 'Claim';

    if (!isEOB && !isClaim) {
      throw new Error('Invalid resource type for claim');
    }

    return {
      resource_type: claim.resourceType,
      resource_data: claim,
      category: 'claims',
      code_system: 'CPT',
      code: claim.procedure?.[0]?.procedureCodeableConcept?.coding?.[0]?.code,
      display_text: claim.procedure?.[0]?.procedureCodeableConcept?.text,
      effective_date: claim.billablePeriod?.start || claim.created,
      status: claim.status,
      source_record_id: claim.id,
    };
  }
}

/**
 * Main Clinical Data Mapper
 * Routes FHIR resources to appropriate mappers
 */
export class ClinicalDataMapper {
  /**
   * Map FHIR resource to clinical record
   */
  static toClinicalRecord(resource: FHIRResource): ClinicalRecord | null {
    try {
      switch (resource.resourceType) {
        case 'MedicationRequest':
        case 'MedicationStatement':
          return FHIRMedicationMapper.toClinicalRecord(resource);

        case 'Condition':
          return FHIRConditionMapper.toClinicalRecord(resource);

        case 'AllergyIntolerance':
          return FHIRAllergyMapper.toClinicalRecord(resource);

        case 'Immunization':
          return FHIRImmunizationMapper.toClinicalRecord(resource);

        case 'DiagnosticReport':
          return FHIRDiagnosticReportMapper.toClinicalRecord(resource);

        case 'Claim':
        case 'ExplanationOfBenefit':
          return FHIRClaimMapper.toClinicalRecord(resource);

        default:
          console.warn(`Unsupported FHIR resource type: ${resource.resourceType}`);
          return null;
      }
    } catch (error) {
      console.error('Error mapping clinical record:', error);
      return null;
    }
  }

  /**
   * Map FHIR resource to unified metrics
   * (Currently only Observations produce metrics)
   */
  static toUnifiedMetrics(resource: FHIRResource): UnifiedMetric[] {
    try {
      if (resource.resourceType === 'Observation') {
        return FHIRObservationMapper.map(resource);
      }

      return [];
    } catch (error) {
      console.error('Error mapping to unified metrics:', error);
      return [];
    }
  }

  /**
   * Process FHIR Bundle
   * Extracts all resources from a bundle and maps them
   */
  static processFHIRBundle(bundle: any): {
    clinicalRecords: ClinicalRecord[];
    metrics: UnifiedMetric[];
  } {
    const clinicalRecords: ClinicalRecord[] = [];
    const metrics: UnifiedMetric[] = [];

    if (bundle.resourceType !== 'Bundle') {
      throw new Error('Invalid FHIR Bundle');
    }

    for (const entry of bundle.entry || []) {
      const resource = entry.resource;

      if (!resource) continue;

      // Try to map to clinical record
      const clinicalRecord = this.toClinicalRecord(resource);
      if (clinicalRecord) {
        clinicalRecords.push(clinicalRecord);
      }

      // Try to extract metrics
      const resourceMetrics = this.toUnifiedMetrics(resource);
      metrics.push(...resourceMetrics);
    }

    return { clinicalRecords, metrics };
  }
}

/**
 * Particle Health Mapper
 * Maps Particle Health API responses to clinical records
 */
export class ParticleHealthMapper {
  static map(data: any): ClinicalRecord[] {
    const records: ClinicalRecord[] = [];

    // Particle returns FHIR bundles
    if (data.resourceType === 'Bundle') {
      const result = ClinicalDataMapper.processFHIRBundle(data);
      records.push(...result.clinicalRecords);
    }

    return records;
  }
}

/**
 * 1upHealth Mapper
 */
export class OneUpHealthMapper {
  static map(data: any): ClinicalRecord[] {
    const records: ClinicalRecord[] = [];

    // 1upHealth also returns FHIR resources
    if (data.entry) {
      for (const entry of data.entry) {
        const record = ClinicalDataMapper.toClinicalRecord(entry.resource);
        if (record) {
          records.push(record);
        }
      }
    }

    return records;
  }
}

/**
 * CMS Blue Button 2.0 Mapper
 */
export class CMSBlueButtonMapper {
  static map(data: any): ClinicalRecord[] {
    const records: ClinicalRecord[] = [];

    // CMS Blue Button returns FHIR R4 ExplanationOfBenefit resources
    if (data.resourceType === 'Bundle') {
      const result = ClinicalDataMapper.processFHIRBundle(data);
      records.push(...result.clinicalRecords);
    }

    return records;
  }
}

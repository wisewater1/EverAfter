/**
 * OpenFDA Medication Service
 * 
 * Free API, no key required. Rate limited to 240 requests/minute.
 * https://open.fda.gov/apis/
 * 
 * Provides:
 * - Drug label search by name
 * - Drug interaction warnings
 * - Adverse event reports
 * - Recall information
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DrugInfo {
    brand_name: string;
    generic_name: string;
    manufacturer: string;
    route: string;
    dosage_form: string;
    purpose: string;
    warnings: string;
    interactions: string;
    adverse_reactions: string;
    active_ingredients: string[];
    indications: string;
    dosage: string;
    openfda: Record<string, any>;
}

export interface DrugEvent {
    receivedate: string;
    serious: boolean;
    reactions: string[];
    patient_age?: number;
    patient_sex?: string;
    outcome: string;
    drug_name: string;
}

export interface DrugRecall {
    recall_number: string;
    reason_for_recall: string;
    status: string;
    product_description: string;
    recall_initiation_date: string;
    classification: string;
    voluntary_mandated: string;
}

export interface DrugInteraction {
    drug1: string;
    drug2: string;
    severity: 'mild' | 'moderate' | 'severe' | 'unknown';
    description: string;
}

const BASE_URL = 'https://api.fda.gov';

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Search for drug labels by name
 */
export async function searchDrugs(query: string, limit = 5): Promise<DrugInfo[]> {
    const encoded = encodeURIComponent(`"${query}"`);
    const url = `${BASE_URL}/drug/label.json?search=(openfda.brand_name:${encoded}+openfda.generic_name:${encoded})&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`OpenFDA API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results) return [];

        return data.results.map((result: any) => ({
            brand_name: result.openfda?.brand_name?.[0] || 'Unknown',
            generic_name: result.openfda?.generic_name?.[0] || 'Unknown',
            manufacturer: result.openfda?.manufacturer_name?.[0] || 'Unknown',
            route: result.openfda?.route?.[0] || 'Unknown',
            dosage_form: result.openfda?.dosage_form?.[0] || 'Unknown',
            purpose: truncate(result.purpose?.[0] || result.indications_and_usage?.[0] || 'Not specified'),
            warnings: truncate(result.warnings?.[0] || 'No warnings available'),
            interactions: truncate(result.drug_interactions?.[0] || 'No interaction data available'),
            adverse_reactions: truncate(result.adverse_reactions?.[0] || 'No adverse reaction data'),
            active_ingredients: result.openfda?.substance_name || [],
            indications: truncate(result.indications_and_usage?.[0] || 'Not specified'),
            dosage: truncate(result.dosage_and_administration?.[0] || 'See prescribing information'),
            openfda: result.openfda || {},
        }));
    } catch (error) {
        console.error('OpenFDA drug search error:', error);
        return [];
    }
}

/**
 * Get adverse event reports for a specific drug
 */
export async function getDrugEvents(drugName: string, limit = 10): Promise<DrugEvent[]> {
    const encoded = encodeURIComponent(`"${drugName}"`);
    const url = `${BASE_URL}/drug/event.json?search=patient.drug.medicinalproduct:${encoded}&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`OpenFDA API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results) return [];

        return data.results.map((result: any) => ({
            receivedate: result.receivedate || '',
            serious: result.serious === '1',
            reactions: (result.patient?.reaction || []).map((r: any) => r.reactionmeddrapt).filter(Boolean),
            patient_age: result.patient?.patientonsetage ? Number(result.patient.patientonsetage) : undefined,
            patient_sex: result.patient?.patientsex === '1' ? 'Male' : result.patient?.patientsex === '2' ? 'Female' : undefined,
            outcome: result.patient?.patientdeath ? 'Death' : result.serious === '1' ? 'Serious' : 'Non-serious',
            drug_name: drugName,
        }));
    } catch (error) {
        console.error('OpenFDA events error:', error);
        return [];
    }
}

/**
 * Get drug recall information
 */
export async function getDrugRecalls(drugName: string, limit = 5): Promise<DrugRecall[]> {
    const encoded = encodeURIComponent(`"${drugName}"`);
    const url = `${BASE_URL}/drug/enforcement.json?search=product_description:${encoded}&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`OpenFDA API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results) return [];

        return data.results.map((result: any) => ({
            recall_number: result.recall_number || '',
            reason_for_recall: result.reason_for_recall || '',
            status: result.status || '',
            product_description: truncate(result.product_description || ''),
            recall_initiation_date: result.recall_initiation_date || '',
            classification: result.classification || '',
            voluntary_mandated: result.voluntary_mandated || '',
        }));
    } catch (error) {
        console.error('OpenFDA recalls error:', error);
        return [];
    }
}

/**
 * Check for known interactions between two drugs
 * Uses label data to cross-reference interaction warnings
 */
export async function checkDrugInteractions(drug1: string, drug2: string): Promise<DrugInteraction[]> {
    const interactions: DrugInteraction[] = [];

    // Search drug1's label for mentions of drug2
    const drug1Info = await searchDrugs(drug1, 1);
    if (drug1Info.length > 0) {
        const interactionText = drug1Info[0].interactions.toLowerCase();
        if (interactionText.includes(drug2.toLowerCase())) {
            interactions.push({
                drug1,
                drug2,
                severity: interactionText.includes('contraindicated') ? 'severe' :
                    interactionText.includes('caution') ? 'moderate' : 'mild',
                description: drug1Info[0].interactions,
            });
        }
    }

    // Search drug2's label for mentions of drug1
    const drug2Info = await searchDrugs(drug2, 1);
    if (drug2Info.length > 0) {
        const interactionText = drug2Info[0].interactions.toLowerCase();
        if (interactionText.includes(drug1.toLowerCase())) {
            // Only add if not already found
            if (interactions.length === 0) {
                interactions.push({
                    drug1: drug2,
                    drug2: drug1,
                    severity: interactionText.includes('contraindicated') ? 'severe' :
                        interactionText.includes('caution') ? 'moderate' : 'mild',
                    description: drug2Info[0].interactions,
                });
            }
        }
    }

    return interactions;
}

/**
 * Get top adverse reactions for a drug (aggregated)
 */
export async function getTopAdverseReactions(drugName: string, limit = 10): Promise<Array<{ reaction: string; count: number }>> {
    const encoded = encodeURIComponent(`"${drugName}"`);
    const url = `${BASE_URL}/drug/event.json?search=patient.drug.medicinalproduct:${encoded}&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`OpenFDA API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.results) return [];

        return data.results.map((r: any) => ({
            reaction: r.term || '',
            count: r.count || 0,
        }));
    } catch (error) {
        console.error('OpenFDA adverse reactions error:', error);
        return [];
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, maxLength = 500): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

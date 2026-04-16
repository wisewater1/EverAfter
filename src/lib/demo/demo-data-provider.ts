/**
 * EverAfter Demo Data Provider
 * =============================
 * Intercepts API calls in demo mode and returns realistic mock data
 * so all saints function without a live Supabase backend.
 *
 * INSTALLATION:
 *   1. Copy this file to src/lib/demo/demo-data-provider.ts
 *   2. Import and call initDemoInterceptor() in your app entry point
 *      (e.g., in AuthContext.tsx after startDemoMode() is called)
 *
 * HOW IT WORKS:
 *   - Wraps the global fetch() to intercept API calls matching /api/v1/*
 *   - Returns mock Response objects with realistic demo data
 *   - The saint bridge events are emitted normally (in-memory, no backend needed)
 *   - All other fetch calls pass through to the real network
 */

import { isDemoAuthEnabled } from '../demo-auth';

// ============================================================
// MOCK DATA: Runtime Readiness (unlocks ALL saints)
// ============================================================
const MOCK_READINESS = {
  status: 'healthy',
  capabilities: [
    { id: 'auth.session', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'frontend.supabase', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'raphael.hub', status: 'healthy', blocking: false, reason: null, deps: ['health_prediction', 'engram'] },
    { id: 'raphael.trajectory', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'joseph.core_family', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'joseph.genealogy', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'michael.security', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'gabriel.finance', status: 'healthy', blocking: false, reason: null, deps: [] },
    { id: 'anthony.audit', status: 'healthy', blocking: false, reason: null, deps: [] },
  ],
  capability_map: {} as Record<string, unknown>,
  routes: [
    { path: '/raphael', capability_id: 'raphael.hub', blocking: false },
    { path: '/health-dashboard', capability_id: 'raphael.hub', blocking: false },
    { path: '/security-dashboard', capability_id: 'michael.security', blocking: false },
    { path: '/finance-dashboard', capability_id: 'gabriel.finance', blocking: false },
    { path: '/family-dashboard', capability_id: 'joseph.core_family', blocking: false },
    { path: '/trinity', capability_id: null, blocking: false },
  ],
};

// Build capability_map from array
MOCK_READINESS.capabilities.forEach(cap => {
  MOCK_READINESS.capability_map[cap.id] = cap;
});

// ============================================================
// MOCK DATA: St. Raphael Health
// ============================================================
const MOCK_HEALTH_SUMMARY = {
  vitals: {
    heart_rate: { value: 72, unit: 'bpm', status: 'normal', trend: 'stable' },
    hrv: { value: 45, unit: 'ms', status: 'good', trend: 'improving' },
    blood_pressure: { systolic: 118, diastolic: 76, status: 'optimal' },
    steps: { value: 8432, goal: 10000, status: 'on_track' },
    sleep: { hours: 7.2, quality: 'good', deep_pct: 22, rem_pct: 25 },
    glucose: { value: 95, unit: 'mg/dL', status: 'normal', fasting: true },
    spo2: { value: 98, unit: '%', status: 'normal' },
    respiratory_rate: { value: 16, unit: 'breaths/min', status: 'normal' },
    body_temp: { value: 98.4, unit: 'F', status: 'normal' },
  },
  insights: [
    {
      id: 'ins-001',
      severity: 'info',
      title: 'Heart Rate Variability Improving',
      description: 'Your HRV has increased 12% over the past 2 weeks, indicating better autonomic nervous system recovery.',
      saint: 'raphael',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ins-002',
      severity: 'attention',
      title: 'Sleep Duration Below Target',
      description: 'You averaged 6.8 hours this week vs your 8-hour goal. Consider adjusting your evening routine.',
      saint: 'raphael',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ins-003',
      severity: 'info',
      title: 'Step Goal Progress Strong',
      description: "You're at 84% of your daily step goal by 3 PM — on pace to exceed target.",
      saint: 'raphael',
      created_at: new Date().toISOString(),
    },
  ],
  risk_assessment: {
    overall: 'low',
    score: 15,
    factors: [
      { name: 'Cardiovascular', risk: 'low', score: 12 },
      { name: 'Metabolic', risk: 'low', score: 18 },
      { name: 'Sleep Health', risk: 'moderate', score: 35 },
      { name: 'Stress', risk: 'low', score: 22 },
    ],
  },
  status_aura: 'stable',
  last_updated: new Date().toISOString(),
};

const MOCK_HEALTH_PREDICTIONS = {
  prediction: {
    risk_level: 'low',
    confidence: 0.87,
    trajectory: 'improving',
    message: 'Based on 30-day biometric trends, your health trajectory is positive. Cardiovascular markers are strong.',
    time_horizon: '24h',
    data_points: 847,
  },
  trajectory_data: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    risk_score: Math.max(5, 20 - Math.sin(i / 4) * 10 + Math.random() * 5),
    confidence: 0.8 + Math.random() * 0.15,
  })),
};

const MOCK_FAMILY_RISK = {
  family_members: [
    { id: 'fm-1', name: 'Joshua', relationship: 'self', risk_level: 'low', risk_score: 15, conditions: [] },
    { id: 'fm-2', name: 'Sarah', relationship: 'spouse', risk_level: 'low', risk_score: 12, conditions: [] },
    { id: 'fm-3', name: 'Emma', relationship: 'daughter', risk_level: 'low', risk_score: 8, conditions: [] },
    { id: 'fm-4', name: 'James', relationship: 'son', risk_level: 'low', risk_score: 6, conditions: [] },
  ],
  family_risk_score: 10,
  hereditary_flags: [],
};

// ============================================================
// MOCK DATA: St. Michael Security
// ============================================================
const MOCK_SECURITY_INTEGRITY = {
  overallScore: 72,
  dataIntegrity: { score: 85, status: 'verified', lastCheck: new Date().toISOString() },
  privacyStatus: {
    leakPrevention: 'watch',
    healthDataIsolation: 'secure',
    unauthorizedAccess: { count: 2, status: 'detected' },
  },
  lastScan: new Date(Date.now() - 3600000).toISOString(),
  alerts: [
    {
      id: 'alert-1',
      type: 'ADVERSARIAL_PROBE',
      severity: 'high',
      title: 'Adversarial Pattern Detected',
      description: 'Unusual access patterns detected on Saint Bridge communication channel.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      resolved: false,
    },
    {
      id: 'alert-2',
      type: 'PII_LEAK',
      severity: 'medium',
      title: 'Health Data Access Anomaly',
      description: 'Raphael health data was accessed from an unrecognized session context.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      resolved: true,
    },
  ],
  threats: [
    { id: 't-1', category: 'injection', severity: 'low', status: 'mitigated', detail: 'XSS attempt in engram input field' },
    { id: 't-2', category: 'auth', severity: 'medium', status: 'active', detail: 'Brute force attempt on API endpoint' },
    { id: 't-3', category: 'data', severity: 'low', status: 'resolved', detail: 'Unencrypted PII in transit detected and patched' },
  ],
  cves: [
    { id: 'CVE-2024-1234', severity: 'medium', package: 'vite', version: '5.0.0', fixed_in: '5.0.1', status: 'patched' },
    { id: 'CVE-2024-5678', severity: 'low', package: 'postcss', version: '8.4.31', fixed_in: '8.4.32', status: 'patched' },
  ],
};

const MOCK_CAI_AUDIT = {
  integrityScore: 72,
  adversarialFlags: [
    { type: 'prompt_injection', severity: 'high', detected_at: new Date().toISOString(), detail: 'Saint Bridge probe attempt' },
  ],
  phiLeaksDetected: 0,
  status: 'warning',
  recommendations: [
    'Enable rate limiting on Saint Bridge event bus',
    'Add input sanitization to engram text fields',
    'Review health data access logs from last 24 hours',
  ],
};

// ============================================================
// MOCK DATA: St. Gabriel Finance
// ============================================================
const MOCK_FINANCE_DATA = {
  budget: {
    monthly_income: 8500,
    total_expenses: 6200,
    savings_rate: 0.27,
    envelopes: [
      { id: 'env-1', name: 'Housing', allocated: 2200, spent: 2200, color: '#3b82f6' },
      { id: 'env-2', name: 'Food & Dining', allocated: 800, spent: 620, color: '#10b981' },
      { id: 'env-3', name: 'Transportation', allocated: 400, spent: 380, color: '#f59e0b' },
      { id: 'env-4', name: 'Healthcare', allocated: 300, spent: 150, color: '#ef4444' },
      { id: 'env-5', name: 'Family & Education', allocated: 600, spent: 450, color: '#8b5cf6' },
      { id: 'env-6', name: 'Savings & Investment', allocated: 2000, spent: 2000, color: '#06b6d4' },
      { id: 'env-7', name: 'Entertainment', allocated: 200, spent: 180, color: '#ec4899' },
    ],
  },
  net_worth: {
    total: 245000,
    assets: 320000,
    liabilities: 75000,
    trend: 'increasing',
    monthly_change: 3200,
  },
  transactions: Array.from({ length: 10 }, (_, i) => ({
    id: `txn-${i}`,
    date: new Date(Date.now() - i * 86400000).toISOString(),
    description: ['Grocery Store', 'Gas Station', 'Electric Bill', 'Restaurant', 'Amazon', 'Pharmacy', 'Daycare', 'Insurance', 'Gym', 'Coffee Shop'][i],
    amount: -[85.42, 45.00, 120.00, 62.50, 34.99, 15.00, 250.00, 180.00, 50.00, 5.75][i],
    category: ['Food', 'Transport', 'Housing', 'Food', 'Shopping', 'Healthcare', 'Family', 'Insurance', 'Health', 'Food'][i],
    envelope_id: ['env-2', 'env-3', 'env-1', 'env-2', 'env-7', 'env-4', 'env-5', 'env-1', 'env-4', 'env-2'][i],
  })),
  emergency_fund: { months: 43, target_months: 6, amount: 38700 },
};

// ============================================================
// MOCK DATA: Trinity Cross-Saint
// ============================================================
const MOCK_TRINITY_DATA = {
  family_vitality: {
    score: 70,
    dimensions: {
      family_continuity: { score: 86, weight: 0.32 },
      recovery_resilience: { score: 41, weight: 0.38 },
      financial_readiness: { score: 90, weight: 0.30 },
    },
    condition_density: 1.1,
    savings_rate: 0.21,
    emergency_fund_months: 43,
    overspent_categories: 1,
  },
  smart_nudges: [
    {
      id: 'nudge-1',
      type: 'family_accountability',
      title: 'Family accountability check-in',
      description: 'Use Trinity to confirm one shared goal with 8 living family members this week.',
      frequency: 'THIS WEEK',
      status: 'active',
      saints_involved: ['joseph', 'raphael'],
    },
    {
      id: 'nudge-2',
      type: 'health_optimization',
      title: 'Seasonal allergy preparation',
      description: 'Spring pollen counts rising — Raphael recommends starting antihistamines this week.',
      frequency: 'SEASONAL',
      status: 'active',
      saints_involved: ['raphael'],
    },
  ],
  cross_saint_goals: [
    {
      id: 'goal-1',
      title: 'Family Emergency Fund',
      saints: ['gabriel', 'joseph'],
      progress: 72,
      status: 'on_track',
      target_date: '2026-12-31',
    },
    {
      id: 'goal-2',
      title: 'Health Baseline for All Members',
      saints: ['raphael', 'joseph'],
      progress: 45,
      status: 'attention',
      target_date: '2026-06-30',
    },
  ],
};

// ============================================================
// MOCK DATA: Saint AI Chat Responses
// ============================================================
const SAINT_CHAT_RESPONSES: Record<string, string[]> = {
  raphael: [
    'Based on your recent vitals, your cardiovascular health looks strong. Heart rate variability is trending upward, which indicates good recovery and stress management.',
    'I notice your sleep duration has been below target this week. I recommend setting a consistent bedtime alarm — even a 30-minute improvement can significantly impact your recovery metrics.',
    "Your glucose levels are stable and within optimal range. Keep maintaining your current dietary patterns. I'll flag any changes in your metabolic trajectory.",
  ],
  michael: [
    "Security scan complete. I've detected 2 anomalous patterns on the Saint Bridge — both appear to be automated probes. I've strengthened the integrity filters and notified Anthony for audit review.",
    'Your data isolation protocols are functioning correctly. Health records remain encrypted at rest and in transit. No unauthorized access attempts in the past 12 hours.',
    'I recommend enabling two-factor authentication on all connected health provider accounts. This will strengthen the overall integrity score from 72% to an estimated 89%.',
  ],
  gabriel: [
    "Your savings rate of 27% is excellent — well above the recommended 20%. At this pace, your emergency fund will reach 6 months of coverage by September.",
    "I noticed a $120 electricity bill that's 15% higher than your 3-month average. This could be seasonal, but I'll track it and alert you if the trend continues.",
    "Looking at your family's financial readiness score of 90/100, the main area for improvement is diversifying your investment portfolio. Would you like me to model some scenarios?",
  ],
  anthony: [
    "Audit log reviewed. Michael's scan findings have been verified — 2 findings confirmed, 1 false positive identified. Integrity ledger updated with entry ID #1Q4S7S.",
    "I've completed the compliance check across all saint data stores. HIPAA alignment is at 94% — the remaining 6% relates to audit trail retention policies that need configuration.",
  ],
  trinity: [
    "Cross-saint analysis complete. Your family's overall vitality score is 70, driven by strong financial readiness (90) but moderate recovery resilience (41). I recommend focusing on the health baseline goal.",
    'Emergency alert chain is configured. If Raphael detects a critical health event, Michael verifies data integrity, Gabriel checks insurance coverage, and Joseph notifies designated family contacts — all within 60 seconds.',
  ],
};

// ============================================================
// FETCH INTERCEPTOR
// ============================================================
const originalFetch = window.fetch;
let interceptorActive = false;

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function matchEndpoint(url: string): Response | null {
  const path = new URL(url, window.location.origin).pathname;

  // Runtime readiness — this is the KEY endpoint that unlocks everything
  if (path.includes('/runtime/readiness')) {
    return mockResponse(MOCK_READINESS);
  }

  // St. Raphael Health endpoints
  if (path.includes('/health/summary')) return mockResponse(MOCK_HEALTH_SUMMARY);
  if (path.includes('/health-predictions/predict') || path.includes('/causal-twin/predictions')) {
    return mockResponse(MOCK_HEALTH_PREDICTIONS);
  }
  if (path.includes('/predict-family') || path.includes('/family-map') || path.includes('/ancestry')) {
    return mockResponse(MOCK_FAMILY_RISK);
  }

  // St. Michael Security endpoints
  if (path.includes('/security/integrity') || path.includes('/security/scan')) {
    return mockResponse(MOCK_SECURITY_INTEGRITY);
  }
  if (path.includes('/audit') && path.includes('/cai')) return mockResponse(MOCK_CAI_AUDIT);
  if (path.includes('/audit/history')) return mockResponse({ audits: [MOCK_CAI_AUDIT] });
  if (path.includes('/monitoring/status')) {
    return mockResponse({
      saints: {
        michael: { status: 'online', security: 'green' },
        raphael: { status: 'online', security: 'green' },
        joseph: { status: 'online', security: 'green' },
        gabriel: { status: 'online', security: 'green' },
        anthony: { status: 'online', security: 'green' },
      },
    });
  }

  // St. Gabriel Finance endpoints
  if (path.includes('/finance/budget') || path.includes('/budget/envelopes')) {
    return mockResponse(MOCK_FINANCE_DATA.budget);
  }
  if (path.includes('/finance/net-worth') || path.includes('/net-worth')) {
    return mockResponse(MOCK_FINANCE_DATA.net_worth);
  }
  if (path.includes('/finance/transactions') || path.includes('/transactions')) {
    return mockResponse({ transactions: MOCK_FINANCE_DATA.transactions });
  }
  if (path.includes('/finance') || path.includes('/gabriel')) {
    return mockResponse(MOCK_FINANCE_DATA);
  }

  // Trinity endpoints
  if (path.includes('/trinity/vitality') || path.includes('/family-vitality')) {
    return mockResponse(MOCK_TRINITY_DATA.family_vitality);
  }
  if (path.includes('/trinity/nudges') || path.includes('/nudges')) {
    return mockResponse({ nudges: MOCK_TRINITY_DATA.smart_nudges });
  }
  if (path.includes('/trinity/goals') || path.includes('/cross-saint-goals')) {
    return mockResponse({ goals: MOCK_TRINITY_DATA.cross_saint_goals });
  }
  if (path.includes('/trinity')) return mockResponse(MOCK_TRINITY_DATA);

  // Saint AI Chat endpoints
  if (path.includes('/chat') || path.includes('/ai/') || path.includes('/council')) {
    const saint = ['raphael', 'michael', 'gabriel', 'anthony', 'trinity']
      .find(s => path.toLowerCase().includes(s)) || 'trinity';
    const responses = SAINT_CHAT_RESPONSES[saint] || SAINT_CHAT_RESPONSES.trinity;
    const response = responses[Math.floor(Math.random() * responses.length)];
    return mockResponse({
      message: response,
      saint,
      timestamp: new Date().toISOString(),
      confidence: 0.85 + Math.random() * 0.1,
    });
  }

  // Engram / personality endpoints
  if (path.includes('/engram') || path.includes('/personality')) {
    return mockResponse({
      profile: { ocean: { O: 72, C: 85, E: 60, A: 78, N: 35 } },
      engrams: [],
    });
  }

  // Joseph family endpoints
  if (path.includes('/family') || path.includes('/joseph') || path.includes('/genealogy')) {
    return mockResponse({
      members: MOCK_FAMILY_RISK.family_members,
      family_id: 'demo-family-001',
    });
  }

  // Onboarding
  if (path.includes('/onboarding')) {
    return mockResponse({ complete: true, progress: 100, current_step: null, skipped: false });
  }

  // Catch-all for any /api/v1/ endpoint — return empty success
  if (path.includes('/api/v1/')) {
    return mockResponse({ status: 'ok', demo: true });
  }

  return null; // Not an API call — pass through
}

/**
 * Initialize the demo mode fetch interceptor.
 * Call this when demo mode is activated.
 */
export function initDemoInterceptor(): void {
  if (interceptorActive) return;
  if (!isDemoAuthEnabled()) return;

  interceptorActive = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept API calls
    if (url.includes('/api/') || url.includes('supabase')) {
      const mockResp = matchEndpoint(url);
      if (mockResp) {
        // Small delay to simulate network latency
        await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
        return mockResp;
      }
    }

    // Pass through to real fetch for non-API calls (CDN, assets, etc.)
    return originalFetch.call(window, input, init);
  };

  console.log('[EverAfter Demo] Data interceptor active — all saints running on mock data');
}

/**
 * Remove the interceptor and restore original fetch.
 */
export function removeDemoInterceptor(): void {
  if (!interceptorActive) return;
  window.fetch = originalFetch;
  interceptorActive = false;
  console.log('[EverAfter Demo] Data interceptor removed');
}

/**
 * Get chat response for a specific saint (for direct integration).
 */
export function getDemoChatResponse(saint: string, _userMessage?: string): string {
  const responses = SAINT_CHAT_RESPONSES[saint] || SAINT_CHAT_RESPONSES.trinity;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Get all mock data (for testing/debugging).
 */
export function getAllDemoData() {
  return {
    readiness: MOCK_READINESS,
    health: MOCK_HEALTH_SUMMARY,
    predictions: MOCK_HEALTH_PREDICTIONS,
    familyRisk: MOCK_FAMILY_RISK,
    security: MOCK_SECURITY_INTEGRITY,
    caiAudit: MOCK_CAI_AUDIT,
    finance: MOCK_FINANCE_DATA,
    trinity: MOCK_TRINITY_DATA,
  };
}

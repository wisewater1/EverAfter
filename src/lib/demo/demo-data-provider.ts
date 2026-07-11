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
import { DEMO_QUIZ_QUESTIONS, buildDemoProfile } from './demoPersonalityQuiz';
import axios from 'axios';

// Shared time helpers for every seed below (declared first: several seed
// blocks throughout this module reference them at module-init time).
const DEMO_NOW = Date.now();
const isoDaysAgo = (d: number) => new Date(DEMO_NOW - d * 86400000).toISOString();

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
  capability_map: {} as Record<string, any>,
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
      description: "You're at 84% of your daily step goal by 3 PM, on pace to exceed target.",
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
  // Flat fields the StRaphaelHealthHub reads directly via raphaelSummaryHasData /
  // mapRaphaelSummaryToVitals (without these the hub renders its empty state).
  metrics: 9,
  resting_heart_rate: 72,
  hrv_avg: 45,
  activity_score: 84,
  sleep_score: 78,
  readiness_score: 82,
  last_sync_at: new Date().toISOString(),
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

// ── St. Michael monitoring/audit shapes (consumed by src/lib/michael/security.ts) ──
// These match the FLAT MonitoringStatusResponse / Vulnerability / SecurityScanResult /
// ledger / compliance interfaces the dashboard reads: NOT a nested { saints } object,
// which is why demo St. Michael used to render empty.
const MICHAEL_FINDINGS = [
  { id: 'mf-1', type: 'adversarial_probe', severity: 'high', message: 'Adversarial pattern on Saint Bridge', details: 'Automated probe signature matched on the event bus; integrity filters strengthened.', source: 'Saint Bridge', timestamp: new Date(Date.now() - 1800000).toISOString(), resolved: false },
  { id: 'mf-2', type: 'pii_leak', severity: 'medium', message: 'Health data read from an unrecognized session', details: 'A St. Raphael record was accessed from an unfamiliar session context; flagged for review.', source: 'St. Raphael API', timestamp: new Date(Date.now() - 7200000).toISOString(), resolved: true },
  { id: 'mf-3', type: 'auth', severity: 'low', message: 'Brute-force attempt on API endpoint', details: 'Rate limiter tripped after repeated failed auth attempts from a single IP.', source: 'Auth Service', timestamp: new Date(Date.now() - 14400000).toISOString(), resolved: true },
];

const MOCK_MONITORING_STATUS = {
  michael: { status: 'active', role: 'Security Guardian', integrity: '94%', message: 'Autonomous guardian online, 3 findings under management.', metrics: { findings: 3, scans_24h: 12 }, recent_findings: MICHAEL_FINDINGS },
  raphael: { status: 'active', role: 'Health Steward', integrity: '97%', recent_findings: [] },
  gabriel: { status: 'active', role: 'Finance Steward', integrity: '98%', recent_findings: [] },
  anthony: { status: 'active', role: 'Integrity Auditor', integrity: '100%', recent_findings: [] },
  joseph: { status: 'active', role: 'Family Keeper', integrity: '99%', recent_findings: [] },
  timestamp: new Date().toISOString(),
};

const MOCK_MICHAEL_VULNERABILITIES = [
  { id: 'v1', cveId: 'CVE-2024-31091', title: 'Authentication Bypass in Legacy Module', severity: 'critical', cvssScore: 9.8, affectedComponent: 'Auth Service v2.1', status: 'patched', publishedDate: '2024-03-15', description: 'Allows unauthenticated users to bypass MFA.' },
  { id: 'v2', cveId: 'CVE-2024-28447', title: 'XSS in Dashboard Rendering', severity: 'medium', cvssScore: 6.1, affectedComponent: 'Frontend UI', status: 'mitigated', publishedDate: '2024-02-20', description: 'Reflected XSS via query parameter injection.' },
  { id: 'v3', cveId: 'CVE-2024-22119', title: 'SQL Injection in Legacy Vault', severity: 'high', cvssScore: 8.6, affectedComponent: 'Legacy Vault API', status: 'patched', publishedDate: '2024-01-10', description: 'Parameterized query bypass in search endpoint.' },
  { id: 'v4', cveId: 'CVE-2024-35890', title: 'Insecure Deserialization', severity: 'high', cvssScore: 7.5, affectedComponent: 'Engram Pipeline', status: 'open', publishedDate: '2024-04-01', description: 'Untrusted data deserialization in engram processor.' },
  { id: 'v5', cveId: 'CVE-2024-40012', title: 'Weak Encryption in Transport', severity: 'low', cvssScore: 3.7, affectedComponent: 'Saint Bridge', status: 'accepted', publishedDate: '2024-05-12', description: 'Deprecated TLS cipher suite still supported.' },
];

const MOCK_MICHAEL_SCAN = {
  timestamp: new Date().toISOString(),
  status: 'warning',
  findings_count: MICHAEL_FINDINGS.length,
  findings: MICHAEL_FINDINGS.map((f) => ({ id: f.id, type: f.type, severity: f.severity, message: f.message, timestamp: f.timestamp, resolved: f.resolved, details: f.details })),
  vulnerabilities: MOCK_MICHAEL_VULNERABILITIES,
  system_integrity: 94,
  integrity_score: 94,
  scan_scope: 'full_application',
  audit_handoff: { recipient: 'st_anthony', status: 'completed', scan_log_id: 'demo-scan-log-1', ledger_entry_id: 'demo-ledger-1Q4S7S', tab: 'ledger' },
};

const MOCK_AUDIT_LEDGER = {
  success: true,
  data: [
    { id: 'demo-ledger-1Q4S7S', action: 'security/michael_full_scan_completed', userId: '00000000-0000-4000-8000-000000000001', provider: 'st_michael', sha256: 'a3f2b8c1e7d4f9a2', prevHash: '0000000000000000', signature: 'demo-sig-michael', signerId: 'st_michael', ts: new Date(Date.now() - 600000).toISOString(), metadata: { findings_count: 3, vulnerabilities_count: 5, system_integrity: 94, status: 'warning' } },
    { id: 'demo-ledger-anthony-1', action: 'audit/integrity_check_archived', userId: '00000000-0000-4000-8000-000000000001', provider: 'st_anthony', sha256: 'b1c2d3e4f5a6b7c8', prevHash: 'a3f2b8c1e7d4f9a2', signature: 'demo-sig-anthony', signerId: 'st_anthony', ts: new Date(Date.now() - 300000).toISOString(), metadata: { received_from: 'michael', status: 'archived_for_audit' } },
  ],
};

const MOCK_COMPLIANCE_READINESS = {
  success: true,
  readiness_score: 92,
  controls: [
    { id: 'c1', controlId: 'HIPAA 164.312(a)(1)', description: 'Access Control, Unique User Identification', isPassing: true, lastCheckedAt: new Date().toISOString() },
    { id: 'c2', controlId: 'HIPAA 164.312(a)(2)(iv)', description: 'Encryption and Decryption', isPassing: true, lastCheckedAt: new Date().toISOString() },
    { id: 'c3', controlId: 'HIPAA 164.312(b)', description: 'Audit Controls', isPassing: true, lastCheckedAt: new Date().toISOString() },
    { id: 'c4', controlId: 'PCI-DSS 6.5', description: 'Secure Coding Guidelines', isPassing: false, lastCheckedAt: new Date().toISOString() },
    { id: 'c5', controlId: 'GDPR Art. 25', description: 'Data Protection by Design', isPassing: true, lastCheckedAt: new Date().toISOString() },
    { id: 'c6', controlId: 'NIST SI-4', description: 'System Monitoring', isPassing: true, lastCheckedAt: new Date().toISOString() },
  ],
};

const MOCK_HIPAA_REPORT = {
  generated_at: new Date().toISOString(),
  user_id: '00000000-0000-4000-8000-000000000001',
  compliance_score: 96,
  status: 'compliant',
  total_phi_events: 142,
  flagged_events: 2,
  denied_events: 1,
  safeguards: [
    { rule: '164.308 Administrative', officer: 'St. Anthony', status: 'pass', description: 'Security management and workforce controls in place.' },
    { rule: '164.310 Physical', officer: 'St. Michael', status: 'pass', description: 'Facility and device access controls verified.' },
    { rule: '164.312 Technical', officer: 'St. Michael', status: 'pass', description: 'Encryption, audit, and integrity controls active.' },
  ],
  recent_events: [],
  certifying_saints: { michael: 'verified', anthony: 'audited' },
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

// Live finance shapes (src/lib/gabriel/finance.ts): getBudget expects a BARE
// BudgetEnvelope[] and getTransactions a BARE Transaction[]. The legacy
// object shapes above are kept for older consumers; these are the ones the
// Gabriel dashboard actually renders.
const DEMO_BUDGET_ENVELOPES = [
  { id: 'be-1', category_id: 'cat-housing', category_name: 'Housing', group: 'Essentials', month: new Date().toISOString().slice(0, 7), assigned: 2200, activity: -2200, available: 0 },
  { id: 'be-2', category_id: 'cat-groceries', category_name: 'Groceries', group: 'Essentials', month: new Date().toISOString().slice(0, 7), assigned: 800, activity: -620, available: 180 },
  { id: 'be-3', category_id: 'cat-transport', category_name: 'Transportation', group: 'Essentials', month: new Date().toISOString().slice(0, 7), assigned: 400, activity: -380, available: 20 },
  { id: 'be-4', category_id: 'cat-health', category_name: 'Healthcare', group: 'Wellbeing', month: new Date().toISOString().slice(0, 7), assigned: 300, activity: -150, available: 150 },
  { id: 'be-5', category_id: 'cat-family', category_name: 'Family & Education', group: 'Family', month: new Date().toISOString().slice(0, 7), assigned: 600, activity: -450, available: 150 },
  { id: 'be-6', category_id: 'cat-savings', category_name: 'Savings & Investing', group: 'Future', month: new Date().toISOString().slice(0, 7), assigned: 2000, activity: -2000, available: 0 },
  { id: 'be-7', category_id: 'cat-fun', category_name: 'Entertainment', group: 'Lifestyle', month: new Date().toISOString().slice(0, 7), assigned: 200, activity: -180, available: 20 },
];
const DEMO_TRANSACTION_ROWS = [
  { id: 'tx-1', date: isoDaysAgo(0).slice(0, 10), payee: 'Rowan Street Market', amount: -85.42, category_id: 'cat-groceries', description: 'Weekly groceries', is_cleared: true, category: { name: 'Groceries', group: 'Essentials' }, source: 'bank', account_name: 'Everyday Checking', account_mask: '4821', institution_name: 'First Meridian Bank', pending: false },
  { id: 'tx-2', date: isoDaysAgo(1).slice(0, 10), payee: 'City Gas & Power', amount: -120.0, category_id: 'cat-housing', description: 'Utilities', is_cleared: true, category: { name: 'Housing', group: 'Essentials' }, source: 'bank', account_name: 'Everyday Checking', account_mask: '4821', institution_name: 'First Meridian Bank', pending: false },
  { id: 'tx-3', date: isoDaysAgo(2).slice(0, 10), payee: 'Corner Pharmacy', amount: -15.0, category_id: 'cat-health', description: 'Prescription refill', is_cleared: true, category: { name: 'Healthcare', group: 'Wellbeing' }, source: 'bank', account_name: 'Everyday Checking', account_mask: '4821', institution_name: 'First Meridian Bank', pending: false },
  { id: 'tx-4', date: isoDaysAgo(3).slice(0, 10), payee: 'Payroll — Meridian Health', amount: 4250.0, category_id: null, description: 'Semi-monthly salary', is_cleared: true, category: null, source: 'bank', account_name: 'Everyday Checking', account_mask: '4821', institution_name: 'First Meridian Bank', pending: false },
  { id: 'tx-5', date: isoDaysAgo(4).slice(0, 10), payee: 'Little Sprouts Daycare', amount: -250.0, category_id: 'cat-family', description: 'Weekly daycare', is_cleared: true, category: { name: 'Family & Education', group: 'Family' }, source: 'manual', account_name: null, account_mask: null, institution_name: null, pending: false },
  { id: 'tx-6', date: isoDaysAgo(5).slice(0, 10), payee: 'Trailhead Fuel', amount: -45.0, category_id: 'cat-transport', description: 'Gas', is_cleared: false, category: { name: 'Transportation', group: 'Essentials' }, source: 'manual', account_name: null, account_mask: null, institution_name: null, pending: true },
];
const DEMO_BANK_STATUS = {
  provider: 'plaid',
  configured: true,
  connected: true,
  sync_recommended: false,
  connections: [
    {
      id: 'bank-demo-1',
      provider: 'plaid',
      institution_name: 'First Meridian Bank',
      institution_id: 'ins_demo',
      last_synced_at: new Date(DEMO_NOW - 40 * 60000).toISOString(),
      imported_transactions: 4,
      accounts: [
        { id: 'acct-demo-1', name: 'Everyday Checking', official_name: 'First Meridian Everyday Checking', mask: '4821', type: 'depository', subtype: 'checking', current_balance: 8340.22, available_balance: 8102.09, iso_currency_code: 'USD' },
        { id: 'acct-demo-2', name: 'Family Savings', official_name: 'First Meridian Family Savings', mask: '7710', type: 'depository', subtype: 'savings', current_balance: 38700.0, available_balance: 38700.0, iso_currency_code: 'USD' },
      ],
    },
  ],
};

// ============================================================
// MOCK DATA: St. Joseph family-home board (tasks / shopping / calendar /
// bulletin). Shapes mirror src/types/database.types.ts exactly — the
// api-client unwraps {tasks}/{task}/{items}/{item}/{events}/{messages}.
// ============================================================
const DEMO_FAMILY_TASKS = [
  { id: 'ft-1', action: 'Schedule Grandma Margaret’s remembrance gathering', description: 'Confirm the back porch for Sunday and invite Alice + Lily.', title: 'Remembrance gathering', type: 'standard', status: 'in_progress', category: 'family', assignedTo: 'Susan', assignee: 'Susan', dueDate: new Date(DEMO_NOW + 5 * 86400000).toISOString(), createdAt: isoDaysAgo(3) },
  { id: 'ft-2', action: 'Digitize the 1968 wedding album', description: 'Scan the last 12 pages and tag people in each photo.', title: 'Wedding album scans', type: 'standard', status: 'pending', category: 'legacy', assignedTo: 'Alice', assignee: 'Alice', dueDate: new Date(DEMO_NOW + 12 * 86400000).toISOString(), createdAt: isoDaysAgo(6) },
  { id: 'ft-3', action: 'Book James’s annual physical', description: 'Dr. Okafor’s office opens booking on Monday.', title: 'Annual physical', type: 'standard', status: 'completed', category: 'health', assignedTo: 'James', assignee: 'James', dueDate: null, createdAt: isoDaysAgo(14) },
];
const DEMO_SHOPPING_ITEMS = [
  { id: 'si-1', name: 'Archival photo sleeves (100ct)', quantity: '2 packs', addedBy: 'Alice', status: 'needed', type: 'standard', priceEst: 24, createdAt: isoDaysAgo(2) },
  { id: 'si-2', name: 'Blood-pressure cuff batteries', quantity: 'AA ×4', addedBy: 'Raphael', status: 'needed', type: 'iot_trigger', triggerSource: 'Raphael', priceEst: 8, createdAt: isoDaysAgo(1) },
  { id: 'si-3', name: 'Sunday dinner groceries', quantity: '1 list', addedBy: 'Susan', status: 'bought', type: 'standard', priceEst: 85, createdAt: isoDaysAgo(4) },
];
const DEMO_FAMILY_CALENDAR = [
  { id: 'ce-1', title: 'Remembrance gathering for Margaret', startTime: new Date(DEMO_NOW + 12 * 86400000).toISOString(), endTime: new Date(DEMO_NOW + 12 * 86400000 + 45 * 60000).toISOString(), location: 'The back porch', attendees: ['James', 'Susan', 'Alice'], allDay: false, source: 'family', memberName: 'Susan', type: 'ceremony' },
  { id: 'ce-2', title: 'James — annual physical', startTime: new Date(DEMO_NOW + 3 * 86400000 + 15 * 3600000).toISOString(), endTime: new Date(DEMO_NOW + 3 * 86400000 + 16 * 3600000).toISOString(), location: 'Meridian Clinic', attendees: ['James'], allDay: false, source: 'health', memberName: 'James', type: 'appointment' },
  { id: 'ce-3', title: 'Lily’s recital', startTime: new Date(DEMO_NOW + 8 * 86400000 + 18 * 3600000).toISOString(), endTime: new Date(DEMO_NOW + 8 * 86400000 + 19 * 3600000).toISOString(), location: 'Jefferson School hall', attendees: ['Susan', 'Alice', 'Lily'], allDay: false, source: 'family', memberName: 'Lily', type: 'event' },
];
const DEMO_BULLETIN_MESSAGES = [
  { id: 'bm-1', text: 'Found Grandma’s cardamom bread recipe card — scanning it tonight!', author: 'Alice', createdAt: isoDaysAgo(1) },
  { id: 'bm-2', text: 'Porch is booked for Sunday. Bring the photo albums.', author: 'Susan', createdAt: isoDaysAgo(2) },
];

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
      description: 'Spring pollen counts rising, Raphael recommends starting antihistamines this week.',
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
    'I notice your sleep duration has been below target this week. I recommend setting a consistent bedtime alarm, even a 30-minute improvement can significantly impact your recovery metrics.',
    "Your glucose levels are stable and within optimal range. Keep maintaining your current dietary patterns. I'll flag any changes in your metabolic trajectory.",
  ],
  michael: [
    "Security scan complete. I've detected 2 anomalous patterns on the Saint Bridge, both appear to be automated probes. I've strengthened the integrity filters and notified Anthony for audit review.",
    'Your data isolation protocols are functioning correctly. Health records remain encrypted at rest and in transit. No unauthorized access attempts in the past 12 hours.',
    'I recommend enabling two-factor authentication on all connected health provider accounts. This will strengthen the overall integrity score from 72% to an estimated 89%.',
  ],
  gabriel: [
    "Your savings rate of 27% is excellent, well above the recommended 20%. At this pace, your emergency fund will reach 6 months of coverage by September.",
    "I noticed a $120 electricity bill that's 15% higher than your 3-month average. This could be seasonal, but I'll track it and alert you if the trend continues.",
    "Looking at your family's financial readiness score of 90/100, the main area for improvement is diversifying your investment portfolio. Would you like me to model some scenarios?",
  ],
  anthony: [
    "Audit log reviewed. Michael's scan findings have been verified, 2 findings confirmed, 1 false positive identified. Integrity ledger updated with entry ID #1Q4S7S.",
    "I've completed the compliance check across all saint data stores. HIPAA alignment is at 94%, the remaining 6% relates to audit trail retention policies that need configuration.",
  ],
  trinity: [
    "Cross-saint analysis complete. Your family's overall vitality score is 70, driven by strong financial readiness (90) but moderate recovery resilience (41). I recommend focusing on the health baseline goal.",
    'Emergency alert chain is configured. If Raphael detects a critical health event, Michael verifies data integrity, Gabriel checks insurance coverage, and Joseph notifies designated family contacts, all within 60 seconds.',
  ],
};

// ============================================================
// FETCH INTERCEPTOR
// ============================================================
const originalFetch = window.fetch;
let interceptorActive = false;
// Saved so axios's default adapter can be restored when demo mode ends.
let prevAxiosAdapter: unknown;

function mockResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================
// DEMO SEED DATA: keeps every screen full & alive on stage (no zeros)
// ============================================================

// ~30 days of realistic, smoothly-trending biometrics so the Delphi trajectory
// renders "live" (TrajectoryDashboard) and the coverage tiles fill in.
function buildDemoHealthMetrics() {
  const defs = [
    { type: 'heart_rate', unit: 'bpm', base: 66, amp: 5 },
    { type: 'blood_pressure_systolic', unit: 'mmHg', base: 117, amp: 5 },
    { type: 'blood_pressure_diastolic', unit: 'mmHg', base: 75, amp: 4 },
    { type: 'glucose', unit: 'mg/dL', base: 93, amp: 7 },
    { type: 'weight', unit: 'lbs', base: 164, amp: 1.5, fixed: 1 },
    { type: 'sleep_duration', unit: 'hours', base: 7.4, amp: 0.7, fixed: 1 },
    { type: 'steps', unit: 'steps', base: 8800, amp: 1800 },
    { type: 'oxygen_saturation', unit: '%', base: 98, amp: 1 },
  ];
  const points: Array<Record<string, unknown>> = [];
  for (let day = 29; day >= 0; day--) {
    for (const def of defs) {
      const wave = Math.sin(((29 - day) / 29) * Math.PI * 1.5) * def.amp;
      const v = def.base + wave * 0.5 + def.amp * 0.2 * Math.sin(day * 1.7);
      points.push({
        metric_type: def.type,
        value: (def as { fixed?: number }).fixed != null ? Number(v.toFixed((def as { fixed?: number }).fixed)) : Math.round(v),
        unit: def.unit,
        recorded_at: isoDaysAgo(day),
        source: 'demo',
      });
    }
  }
  return points;
}
const MOCK_HEALTH_METRICS = buildDemoHealthMetrics();

// Supabase-table seeds (FamilyEngrams reads these directly via supabase-js).
const DEMO_FAMILY_MEMBERS = [
  { id: 'dm-margaret', user_id: 'demo-user', name: 'Margaret Anderson', relationship: 'Grandmother', avatar_url: null, created_at: isoDaysAgo(120) },
  { id: 'dm-james', user_id: 'demo-user', name: 'James Anderson', relationship: 'Father', avatar_url: null, created_at: isoDaysAgo(96) },
  { id: 'dm-susan', user_id: 'demo-user', name: 'Susan Anderson', relationship: 'Mother', avatar_url: null, created_at: isoDaysAgo(96) },
  { id: 'dm-alice', user_id: 'demo-user', name: 'Alice Anderson', relationship: 'Sister', avatar_url: null, created_at: isoDaysAgo(58) },
  { id: 'dm-lily', user_id: 'demo-user', name: 'Lily Chen', relationship: 'Niece', avatar_url: null, created_at: isoDaysAgo(24) },
];
const DEMO_ENGRAM_ROWS = [
  { family_member_id: 'dm-margaret', personality_traits: ['Warm', 'Wise', 'Nurturing', 'Patient'], user_interactions: [{ created_at: isoDaysAgo(1) }, { created_at: isoDaysAgo(3) }, { created_at: isoDaysAgo(6) }, { created_at: isoDaysAgo(10) }] },
  { family_member_id: 'dm-james', personality_traits: ['Steady', 'Practical', 'Devoted'], user_interactions: [{ created_at: isoDaysAgo(2) }, { created_at: isoDaysAgo(7) }] },
  { family_member_id: 'dm-susan', personality_traits: ['Caring', 'Energetic', 'Organized'], user_interactions: [{ created_at: isoDaysAgo(1) }, { created_at: isoDaysAgo(4) }, { created_at: isoDaysAgo(9) }] },
];
const DEMO_FAMILY_MOMENTS = [
  ...Array.from({ length: 6 }, () => ({ family_member_id: 'dm-margaret' })),
  ...Array.from({ length: 4 }, () => ({ family_member_id: 'dm-james' })),
  ...Array.from({ length: 5 }, () => ({ family_member_id: 'dm-susan' })),
  ...Array.from({ length: 2 }, () => ({ family_member_id: 'dm-alice' })),
];

// Ceremonies (see src/lib/ceremonies/ceremonies.ts): one scheduled remembrance
// coming up and one completed gratitude gathering with a written reflection,
// so the Ceremonies screen, Seasonal Calendar, and Chronicle all have
// something real to show on stage. Demo mode itself reads ceremonies from
// localStorage rather than these REST seeds (see ceremonies.ts), but the rows
// are kept here too so any direct `/rest/v1/ceremonies` or
// `/rest/v1/family_tree_events` read in demo mode still resolves to the same
// story instead of an empty table.
const DEMO_CEREMONY_SCHEDULED_ID = 'dm-ceremony-remembrance';
const DEMO_CEREMONY_COMPLETED_ID = 'dm-ceremony-gratitude';

const DEMO_CEREMONIES = [
  {
    id: DEMO_CEREMONY_SCHEDULED_ID,
    user_id: 'demo-user',
    title: 'Remembering Margaret',
    description: 'A quiet gathering to hold Margaret in memory and share the stories that keep her close.',
    ceremony_type: 'remembrance',
    scheduled_at: new Date(DEMO_NOW + 12 * 86400000).toISOString(),
    duration_minutes: 45,
    location: 'The back porch, Sunday afternoon',
    honoree_member_id: 'dm-margaret',
    participant_member_ids: ['dm-james', 'dm-susan', 'dm-alice'],
    script: [
      { title: 'Gathering in Stillness', text: 'Invite everyone present to settle into a quiet moment together before beginning. This time is set apart to hold Margaret in memory.' },
      { title: 'A Shared Memory', text: 'Ask each person to share one memory of Margaret, however small.' },
      { title: 'A Reading', text: 'Read a passage or letter that speaks to who Margaret was.' },
      { title: 'A Moment of Quiet', text: 'Sit together in silence, holding Margaret in memory.' },
      { title: 'Closing Gratitude', text: 'Close by naming what you are grateful Margaret gave the family.' },
    ],
    status: 'scheduled',
    completed_at: null,
    reflection: null,
    created_at: isoDaysAgo(6),
    updated_at: isoDaysAgo(6),
  },
  {
    id: DEMO_CEREMONY_COMPLETED_ID,
    user_id: 'demo-user',
    title: 'A Season of Gratitude',
    description: 'An evening set aside to name what the family is grateful for this year.',
    ceremony_type: 'gratitude',
    scheduled_at: isoDaysAgo(21),
    duration_minutes: 30,
    location: 'The kitchen table',
    honoree_member_id: null,
    participant_member_ids: ['dm-james', 'dm-susan', 'dm-alice', 'dm-lily'],
    script: [
      { title: 'Naming the Blessings', text: 'Begin by inviting everyone to think quietly about the past season and what has felt like a gift.' },
      { title: 'An Appreciation Round', text: 'Let each person name someone present they are grateful for, and why.' },
      { title: 'A Blessing Spoken Aloud', text: 'Offer a short blessing over the family together.' },
      { title: 'Closing Thanks', text: 'End with a shared moment of thanks.' },
    ],
    status: 'completed',
    completed_at: isoDaysAgo(20),
    reflection: "James read Grandma Ruth's old blessing and Lily cried a little. It felt good to say these things out loud instead of just thinking them.",
    created_at: isoDaysAgo(24),
    updated_at: isoDaysAgo(20),
  },
];

const DEMO_FAMILY_TREE_EVENTS = [
  {
    id: 'dm-event-ceremony-gratitude',
    user_id: 'demo-user',
    member_id: null,
    legacy_event_id: `ceremony_${DEMO_CEREMONY_COMPLETED_ID}`,
    event_type: 'ceremony',
    event_date: isoDaysAgo(20).slice(0, 10),
    title: 'A Season of Gratitude',
    description: "James read Grandma Ruth's old blessing and Lily cried a little. It felt good to say these things out loud instead of just thinking them.",
    location: 'The kitchen table',
    created_at: isoDaysAgo(20),
    updated_at: isoDaysAgo(20),
  },
];

// Legacy Vault sample items so the demo vault opens with real content to
// explore rather than an empty shell.
const DEMO_VAULT_ITEMS = [
  {
    id: 'dv-message-alice',
    user_id: 'demo-user',
    type: 'MESSAGE',
    title: 'A note for Alice on her wedding day',
    slug: 'note-for-alice',
    status: 'SCHEDULED',
    payload: { message: 'Alice, whatever day this reaches you, know how proud we are. Carry us with you.' },
    encryption_key_id: null,
    unlock_at: new Date(DEMO_NOW + 200 * 86400000).toISOString(),
    unlock_rule: 'DATE',
    heartbeat_timeout_days: null,
    is_encrypted: false,
    metadata: {},
    created_at: isoDaysAgo(30),
    updated_at: isoDaysAgo(30),
    published_at: null,
    locked_at: null,
    delivered_at: null,
    family_member_id: null,
  },
  {
    id: 'dv-will-family',
    user_id: 'demo-user',
    type: 'WILL',
    title: 'Family letter of wishes',
    slug: 'letter-of-wishes',
    status: 'LOCKED',
    payload: { message: 'A plain-language companion to the formal will, sharing the reasoning behind each decision.' },
    encryption_key_id: null,
    unlock_at: null,
    unlock_rule: 'CUSTODIAN_APPROVAL',
    heartbeat_timeout_days: null,
    is_encrypted: false,
    metadata: {},
    created_at: isoDaysAgo(60),
    updated_at: isoDaysAgo(14),
    published_at: null,
    locked_at: isoDaysAgo(14),
    delivered_at: null,
    family_member_id: null,
  },
  {
    id: 'dv-capsule-grandkids',
    user_id: 'demo-user',
    type: 'CAPSULE',
    title: 'Time capsule for the grandchildren',
    slug: 'grandchildren-capsule',
    status: 'DRAFT',
    payload: { message: 'Photographs, voice recordings, and a few small stories to open when they turn eighteen.' },
    encryption_key_id: null,
    unlock_at: null,
    unlock_rule: 'HEARTBEAT_TIMEOUT',
    heartbeat_timeout_days: 180,
    is_encrypted: false,
    metadata: {},
    created_at: isoDaysAgo(10),
    updated_at: isoDaysAgo(3),
    published_at: null,
    locked_at: null,
    delivered_at: null,
    family_member_id: null,
  },
];

// Devices page seeds (DevicesDashboard reads these four tables directly).
const DEMO_DEVICE_CONNECTIONS = [
  { id: 'dc-fitbit', provider: 'fitbit', device_model: 'Charge 6', status: 'connected', battery_pct: 82, signal_strength: 4, last_sync_at: new Date(DEMO_NOW - 20 * 60000).toISOString(), last_webhook_at: new Date(DEMO_NOW - 8 * 60000).toISOString(), firmware: '1.188.24', created_at: isoDaysAgo(64) },
  { id: 'dc-dexcom', provider: 'dexcom_cgm', device_model: 'G7', status: 'connected', battery_pct: 61, signal_strength: 5, last_sync_at: new Date(DEMO_NOW - 5 * 60000).toISOString(), last_webhook_at: new Date(DEMO_NOW - 5 * 60000).toISOString(), firmware: '2.4.1', created_at: isoDaysAgo(31) },
  { id: 'dc-oura', provider: 'oura', device_model: 'Ring Gen3', status: 'degraded', battery_pct: 24, signal_strength: 2, last_sync_at: new Date(DEMO_NOW - 26 * 3600000).toISOString(), last_webhook_at: new Date(DEMO_NOW - 26 * 3600000).toISOString(), firmware: '3.2.0', created_at: isoDaysAgo(120) },
];
const DEMO_DEVICE_HEALTH = [
  { provider: 'fitbit', uptime_ratio_7d: 0.995, avg_latency_ms_24h: 420, data_freshness_s: 480, completeness_pct_24h: 98, gaps: [], last_eval_at: new Date(DEMO_NOW - 15 * 60000).toISOString() },
  { provider: 'dexcom_cgm', uptime_ratio_7d: 0.999, avg_latency_ms_24h: 210, data_freshness_s: 300, completeness_pct_24h: 99, gaps: [], last_eval_at: new Date(DEMO_NOW - 10 * 60000).toISOString() },
  { provider: 'oura', uptime_ratio_7d: 0.87, avg_latency_ms_24h: 1900, data_freshness_s: 93600, completeness_pct_24h: 71, gaps: [{ from: isoDaysAgo(2), to: isoDaysAgo(1) }], last_eval_at: new Date(DEMO_NOW - 60 * 60000).toISOString() },
];
const DEMO_DEVICE_ALERTS = [
  { id: 'da-1', provider: 'oura', severity: 'warn', code: 'SYNC_STALE', message: 'Oura Ring has not synced in over 24 hours. Open the Oura app to force a sync.', created_at: new Date(DEMO_NOW - 2 * 3600000).toISOString(), resolved_at: null },
  { id: 'da-2', provider: 'fitbit', severity: 'info', code: 'FIRMWARE_UPDATE', message: 'A Charge 6 firmware update is available (1.188.30).', created_at: isoDaysAgo(1), resolved_at: null },
];
const DEMO_WEBHOOK_LOGS = [
  { id: 'wl-1', provider: 'dexcom_cgm', received_at: new Date(DEMO_NOW - 5 * 60000).toISOString(), event_type: 'egv.created', http_status: 200, parse_ms: 12 },
  { id: 'wl-2', provider: 'fitbit', received_at: new Date(DEMO_NOW - 8 * 60000).toISOString(), event_type: 'activities', http_status: 200, parse_ms: 18 },
  { id: 'wl-3', provider: 'dexcom_cgm', received_at: new Date(DEMO_NOW - 35 * 60000).toISOString(), event_type: 'egv.created', http_status: 200, parse_ms: 11 },
  { id: 'wl-4', provider: 'fitbit', received_at: new Date(DEMO_NOW - 65 * 60000).toISOString(), event_type: 'sleep', http_status: 200, parse_ms: 22 },
  { id: 'wl-5', provider: 'oura', received_at: new Date(DEMO_NOW - 26 * 3600000).toISOString(), event_type: 'daily_readiness', http_status: 200, parse_ms: 16 },
];

// Daily-question training card seeds (archetypal_ais + the question pool).
const DEMO_ARCHETYPAL_AIS = [
  { id: 'ai-margaret', user_id: '00000000-0000-4000-8000-000000000001', name: 'Margaret Anderson', description: 'Grandmother — keeper of the family stories.', total_memories: 48, training_status: 'active', avatar_url: null, created_at: isoDaysAgo(120) },
  { id: 'ai-james', user_id: '00000000-0000-4000-8000-000000000001', name: 'James Anderson', description: 'Father — steady, practical, devoted.', total_memories: 36, training_status: 'active', avatar_url: null, created_at: isoDaysAgo(96) },
];
const DEMO_QUESTION_POOL = [
  { id: 'q-demo-1', question_text: 'What family tradition do you most hope the grandchildren keep alive?', category_id: 'qc-values', is_active: true, created_at: isoDaysAgo(200) },
];
const DEMO_QUESTION_CATEGORIES = [
  { id: 'qc-values', category_name: 'Values & Traditions', created_at: isoDaysAgo(200) },
];

// Community portal directory seeds.
const DEMO_USER_PROFILES = [
  { id: 'up-1', user_id: 'demo-neighbor-1', full_name: 'Ruth Delgado', display_name: 'Ruth D.', bio: 'Retired teacher archiving three generations of letters.', location: 'Santa Fe, NM', interests: ['Genealogy', 'Letter writing'], skills: ['Oral history'], profile_visibility: 'public', allow_messages: true, allow_connection_requests: true, created_at: isoDaysAgo(40) },
  { id: 'up-2', user_id: 'demo-neighbor-2', full_name: 'Samuel Okafor', display_name: 'Sam O.', bio: 'Recording my father’s proverbs before they fade.', location: 'Houston, TX', interests: ['Voice memoirs'], skills: ['Audio editing'], profile_visibility: 'public', allow_messages: true, allow_connection_requests: true, created_at: isoDaysAgo(33) },
  { id: 'up-3', user_id: 'demo-neighbor-3', full_name: 'Elena Petrov', display_name: 'Elena P.', bio: 'Building a memory vault for my daughters.', location: 'Portland, OR', interests: ['Photo restoration', 'Family recipes'], skills: ['Scrapbooking'], profile_visibility: 'public', allow_messages: false, allow_connection_requests: true, created_at: isoDaysAgo(21) },
  { id: 'up-4', user_id: 'demo-neighbor-4', full_name: 'Marcus Hale', display_name: 'Marcus H.', bio: 'First-generation historian of the Hale family line.', location: 'Chicago, IL', interests: ['Military records'], skills: ['Archival research'], profile_visibility: 'public', allow_messages: true, allow_connection_requests: true, created_at: isoDaysAgo(12) },
];

// Career agent seeds: a filled profile + goals so the dashboard tells a story.
const DEMO_CAREER_PROFILES = [
  { id: 'cp-demo', user_id: '00000000-0000-4000-8000-000000000001', current_role: 'Product Design Lead', industry: 'Healthcare technology', years_experience: 12, skills: ['Design systems', 'Research ops', 'Team mentoring'], career_interests: ['VP of Design track', 'Advisory roles'], linkedin_summary: 'Design leader focused on humane health products.', public_chat_enabled: false, public_chat_token: null, public_chat_greeting: null, created_at: isoDaysAgo(90), updated_at: isoDaysAgo(9) },
];
const DEMO_CAREER_GOALS = [
  { id: 'cg-1', goal_title: 'Reach VP of Design', goal_description: 'Own the design org roadmap and hiring plan.', goal_category: 'promotion', status: 'active', priority: 'high', target_date: new Date(DEMO_NOW + 300 * 86400000).toISOString().slice(0, 10), progress_percentage: 45, created_at: isoDaysAgo(80) },
  { id: 'cg-2', goal_title: 'Publish a design-leadership talk', goal_description: 'Submit to two conferences this year.', goal_category: 'visibility', status: 'active', priority: 'medium', target_date: new Date(DEMO_NOW + 120 * 86400000).toISOString().slice(0, 10), progress_percentage: 20, created_at: isoDaysAgo(60) },
  { id: 'cg-3', goal_title: 'Mentor two rising designers', goal_description: 'Quarterly growth plans with each mentee.', goal_category: 'mentorship', status: 'completed', priority: 'medium', target_date: null, progress_percentage: 100, created_at: isoDaysAgo(200) },
];

// Marketplace catalog seeds (browse-only in demo; purchases stay disabled).
const DEMO_MARKETPLACE_TEMPLATES = [
  { id: 'mt-1', name: 'grief-companion', title: 'Grief Companion', description: 'A gentle listener trained on bereavement-support practices for the first year of loss.', category: 'Wellbeing', creator_name: 'EverAfter Studio', creator_badge: 'verified', price_usd: 12, personality_traits: { expertise: ['Active listening', 'Memorial planning'], style: 'gentle', tone: 'warm' }, sample_conversations: [{ question: 'I keep forgetting she’s gone.', response: 'That forgetting is love’s reflex — tell me about the moment it caught you today.' }], avatar_url: null, rating: 4.8, total_purchases: 1240, is_featured: true, is_active: true, created_at: isoDaysAgo(160) },
  { id: 'mt-2', name: 'story-archivist', title: 'Story Archivist', description: 'Interviews elders with era-aware prompts and turns answers into keepsake chapters.', category: 'Legacy', creator_name: 'Halcyon Labs', creator_badge: 'pro', price_usd: 18, personality_traits: { expertise: ['Oral history', 'Era research'], style: 'curious', tone: 'encouraging' }, sample_conversations: [{ question: 'Where do we start?', response: 'Let’s start with the kitchen of your childhood — what did Sunday morning smell like?' }], avatar_url: null, rating: 4.6, total_purchases: 890, is_featured: true, is_active: true, created_at: isoDaysAgo(120) },
  { id: 'mt-3', name: 'recipe-keeper', title: 'Recipe Keeper', description: 'Captures family recipes with the stories behind them, measured in “grandma units.”', category: 'Family', creator_name: 'Table & Thyme', creator_badge: 'community', price_usd: 6, personality_traits: { expertise: ['Recipe transcription'], style: 'playful', tone: 'cozy' }, sample_conversations: [{ question: 'She never wrote amounts down.', response: 'Perfect — we’ll record it exactly as she said it: “flour until it feels right.”' }], avatar_url: null, rating: 4.9, total_purchases: 2150, is_featured: false, is_active: true, created_at: isoDaysAgo(90) },
  { id: 'mt-4', name: 'eulogy-writer', title: 'Eulogy Writing Guide', description: 'Walks a family from memories to a finished eulogy draft with dignity and care.', category: 'Memorial', creator_name: 'EverAfter Studio', creator_badge: 'verified', price_usd: 10, personality_traits: { expertise: ['Speech structure', 'Tone coaching'], style: 'steady', tone: 'dignified' }, sample_conversations: [{ question: 'I don’t know what to say about Dad.', response: 'Then let’s not start with words — what did his hands spend their life doing?' }], avatar_url: null, rating: 4.7, total_purchases: 640, is_featured: false, is_active: true, created_at: isoDaysAgo(60) },
];

// One finished sample report so the Raphael insights panel opens with content.
const DEMO_INSIGHT_REPORTS = [
  { id: 'ir-1', engram_id: 'eng-margaret', start_at: isoDaysAgo(7), end_at: isoDaysAgo(0), period: 'weekly', kpis: { resting_hr: 66, sleep_hours: 7.4, steps_avg: 8800 }, findings: [{ type: 'win', text: 'Resting heart rate improved 3 bpm week-over-week.' }, { type: 'watch', text: 'Sleep drifted 40 minutes later on weekend nights.' }], narrative: 'A steady week: recovery metrics improved while sleep timing drifted slightly on weekends.', created_at: isoDaysAgo(0) },
];

const DEMO_SUPABASE_TABLES: Record<string, Array<Record<string, unknown>>> = {
  family_members: DEMO_FAMILY_MEMBERS,
  engrams: DEMO_ENGRAM_ROWS,
  family_moments: DEMO_FAMILY_MOMENTS,
  ceremonies: DEMO_CEREMONIES,
  family_tree_events: DEMO_FAMILY_TREE_EVENTS,
  vault_items: DEMO_VAULT_ITEMS,
  connections: DEMO_DEVICE_CONNECTIONS,
  device_health: DEMO_DEVICE_HEALTH,
  alerts: DEMO_DEVICE_ALERTS,
  webhook_logs: DEMO_WEBHOOK_LOGS,
  archetypal_ais: DEMO_ARCHETYPAL_AIS,
  daily_question_pool: DEMO_QUESTION_POOL,
  question_categories: DEMO_QUESTION_CATEGORIES,
  user_profiles: DEMO_USER_PROFILES,
  career_profiles: DEMO_CAREER_PROFILES,
  career_goals: DEMO_CAREER_GOALS,
  marketplace_templates: DEMO_MARKETPLACE_TEMPLATES,
  insight_reports: DEMO_INSIGHT_REPORTS,
};

// Populated engram list for the Engram Training Center (bare array: callers .map/.filter).
const DEMO_ENGRAMS_LIST = [
  { id: 'eng-margaret', user_id: 'demo-user', name: 'Margaret Anderson', relationship: 'Grandmother', engram_type: 'family', archetype: 'The Matriarch', description: "Keeper of the family's stories, recipes, and quiet wisdom.", avatar_url: null, personality_summary: { ocean: { O: 74, C: 88, E: 62, A: 90, N: 28 } }, total_questions_answered: 48, ai_readiness_score: 92, is_ai_active: true, training_status: 'active', voice_enabled: true, voice_status: 'ready', created_at: isoDaysAgo(120), updated_at: isoDaysAgo(1) },
  { id: 'eng-james', user_id: 'demo-user', name: 'James Anderson', relationship: 'Father', engram_type: 'family', archetype: 'The Builder', description: 'Steady, practical, and endlessly devoted to the family.', avatar_url: null, personality_summary: { ocean: { O: 58, C: 86, E: 54, A: 80, N: 30 } }, total_questions_answered: 36, ai_readiness_score: 78, is_ai_active: true, training_status: 'active', voice_enabled: false, voice_status: 'pending', created_at: isoDaysAgo(96), updated_at: isoDaysAgo(2) },
  { id: 'eng-susan', user_id: 'demo-user', name: 'Susan Anderson', relationship: 'Mother', engram_type: 'family', archetype: 'The Caregiver', description: 'Warm, organized, and the heart of every gathering.', avatar_url: null, personality_summary: { ocean: { O: 70, C: 82, E: 72, A: 88, N: 32 } }, total_questions_answered: 41, ai_readiness_score: 85, is_ai_active: true, training_status: 'active', voice_enabled: true, voice_status: 'ready', created_at: isoDaysAgo(96), updated_at: isoDaysAgo(1) },
  { id: 'eng-alice', user_id: 'demo-user', name: 'Alice Anderson', relationship: 'Sister', engram_type: 'family', archetype: 'The Explorer', description: 'Curious, creative, and always chasing the next horizon.', avatar_url: null, personality_summary: { ocean: { O: 90, C: 64, E: 80, A: 72, N: 40 } }, total_questions_answered: 15, ai_readiness_score: 34, is_ai_active: false, training_status: 'training', voice_enabled: false, voice_status: 'none', created_at: isoDaysAgo(58), updated_at: isoDaysAgo(5) },
];

export function matchEndpoint(url: string, method: string = 'GET', body?: BodyInit | null): Response | null {
  const path = new URL(url, window.location.origin).pathname;

  // ── Supabase Edge Functions (/functions/v1/*) ─────────────────────────
  // supabase-js functions.invoke and the app's direct edge-function fetches
  // all use window.fetch, so they land here in demo. Anything not mocked
  // gets a fast 404 (never the real project), so callers show their own
  // error/empty states instead of hanging on live-network auth failures.
  if (path.includes('/functions/v1/')) {
    const fn = path.split('/functions/v1/')[1]?.split('/')[0] || '';
    if (fn === 'career-chat') {
      let input = '';
      try { input = String((typeof body === 'string' ? JSON.parse(body) : {}).input || ''); } catch { /* ignore */ }
      const reply = input.toLowerCase().includes('goal')
        ? 'Looking at your demo profile, your VP-of-Design goal is 45% along. The highest-leverage next step is making your team’s wins legible upward — shall we draft that update?'
        : 'This is the demo career coach speaking from sample data. Ask about your goals, your promotion track, or how to tell your work’s story — in a real account I read your live career profile.';
      return mockResponse({ reply, tools_used: [], tool_execution_log: [], visitor_token: 'demo-visitor' });
    }
    if (fn === 'insights-report') {
      const now = new Date();
      return mockResponse({
        report: {
          id: `ir-demo-${now.getTime()}`,
          start_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
          end_at: now.toISOString(),
          period: 'weekly',
          kpis: { resting_hr: 66, hrv_ms: 45, sleep_hours: 7.4, steps_avg: 8800 },
          findings: [
            { type: 'win', text: 'HRV rose 6% across the sample week — recovery is trending up.' },
            { type: 'watch', text: 'Bedtime drifted ~40 minutes later on weekend nights.' },
            { type: 'suggestion', text: 'A fixed wind-down alarm would likely reclaim the drifted sleep.' },
          ],
          narrative: 'Sample-week summary: cardiovascular recovery improved while sleep timing loosened slightly on weekends. One nudge — a consistent wind-down — addresses the only softening metric.',
          created_at: now.toISOString(),
        },
      });
    }
    if (fn === 'manage-agent-tasks') {
      return mockResponse({ success: true, data: { status: 'completed', note: 'Demo: task run simulated on sample data.' } });
    }
    if (fn === 'get-daily-question') {
      return mockResponse({
        question_text: DEMO_QUESTION_POOL[0].question_text,
        question_category: 'Values & Traditions',
        day_number: 12,
        already_answered_today: false,
      });
    }
    if (fn === 'submit-daily-response') {
      return mockResponse({ success: true });
    }
    if (fn === 'vault-integrity-check') {
      return mockResponse({ message: `All ${DEMO_VAULT_ITEMS.length} demo vault items verified (sample data — checksums simulated).` });
    }
    if (fn === 'vault-export') {
      let downloadUrl: string | undefined;
      try {
        const blob = new Blob(
          [JSON.stringify({ exported_at: new Date().toISOString(), demo: true, items: DEMO_VAULT_ITEMS }, null, 2)],
          { type: 'application/json' },
        );
        downloadUrl = URL.createObjectURL(blob);
      } catch { /* downloadUrl stays undefined; caller shows its fallback */ }
      return mockResponse({ downloadUrl, message: 'Demo vault export generated locally from sample data.' });
    }
    if (fn === 'stripe-checkout' || fn === 'health-oauth-initiate') {
      return mockResponse(
        { code: 'DEMO_MODE', message: 'Not available in the demo. Create a free account to use this.', error: { code: 'DEMO_MODE', message: 'Not available in the demo. Create a free account to use this.' } },
        400,
      );
    }
    return mockResponse({ code: 'DEMO_NOT_MOCKED', message: 'Demo: this function is not part of the demo.', error: { code: 'DEMO_NOT_MOCKED', message: 'Demo: this function is not part of the demo.' } }, 404);
  }

  // Personality quiz: MUST come before the generic `/personality` matcher
  // below, which would otherwise swallow these and return a stub with no
  // questions/scores (that's why demo quizzes loaded nothing and produced an
  // "analysis" disconnected from the answers). Here the profile is computed
  // from the actual submitted answers.
  if (path.includes('/personality-quiz/questions')) {
    return mockResponse({ questions: DEMO_QUIZ_QUESTIONS, total: DEMO_QUIZ_QUESTIONS.length });
  }
  if (path.includes('/personality-quiz/start')) {
    let memberId = '', memberName = '';
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : {};
      memberId = parsed.member_id || '';
      memberName = parsed.member_name || '';
    } catch { /* ignore */ }
    return mockResponse({
      session_id: `demo-quiz-${memberId || 'session'}`,
      member_id: memberId,
      member_name: memberName,
      total_questions: DEMO_QUIZ_QUESTIONS.length,
      questions: DEMO_QUIZ_QUESTIONS,
    });
  }
  if (path.includes('/personality-quiz/submit')) {
    let answers: Record<string, number> = {}, memberId = '', memberName = '';
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : {};
      answers = parsed.answers || {};
      memberId = parsed.member_id || '';
      memberName = parsed.member_name || '';
    } catch { /* ignore */ }
    return mockResponse(buildDemoProfile(answers, memberId, memberName));
  }
  if (path.includes('/personality-quiz/profile')) {
    return mockResponse({});
  }
  // Shareable friend-quiz invites (demo: tokens are local, questions are the
  // demo bank, submit scores the real answers).
  if (path.includes('/personality-quiz/invites') && method === 'POST') {
    let subjectName = 'a loved one', subjectMemberId: string | undefined;
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : {};
      subjectName = parsed.subject_name || subjectName;
      subjectMemberId = parsed.subject_member_id;
    } catch { /* ignore */ }
    const token = `demo-${subjectMemberId || 'quiz'}-${subjectName.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`;
    return mockResponse({ token, subject_name: subjectName, subject_member_id: subjectMemberId, status: 'pending', share_path: `/quiz/${token}` });
  }
  if (path.includes('/personality-quiz/invites')) {
    return mockResponse({ invites: [] });
  }
  const publicQuizMatch = path.match(/\/personality-quiz\/public\/([^/]+)/);
  if (publicQuizMatch) {
    const token = decodeURIComponent(publicQuizMatch[1]);
    if (path.endsWith('/submit')) {
      let answers: Record<string, number> = {};
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : {};
        answers = parsed.answers || {};
      } catch { /* ignore */ }
      const profile = buildDemoProfile(answers, token, 'a loved one');
      return mockResponse({ ok: true, subject_name: 'a loved one', archetype: profile.archetype });
    }
    return mockResponse({ subject_name: 'a loved one', status: 'pending', questions: DEMO_QUIZ_QUESTIONS, total: DEMO_QUIZ_QUESTIONS.length });
  }

  // System Monitor: full SystemMetrics shape with breathing history charts.
  if (path.includes('/monitoring/metrics')) {
    const now = Date.now();
    const points = (base: number, swing: number) =>
      Array.from({ length: 24 }, (_, i) => ({
        time: new Date(now - (23 - i) * 60_000).toISOString(),
        value: Math.round((base + Math.sin(i / 3) * swing + Math.random() * swing * 0.4) * 10) / 10,
      }));
    return mockResponse({
      uptime_seconds: 86_400 * 3 + 4_523,
      resources: { cpu_current: 23.4, memory_current: 41.7, disk_usage: 18.2 },
      throughput: { total_requests: 48_213, error_rate: 0.4, error_count: 193 },
      history: { cpu: points(22, 9), memory: points(40, 6) },
    });
  }

  // Time capsules: GET lists sample capsules; POST echoes a created one.
  if (/\/api\/v1\/time-capsules\/?($|\?)/.test(path)) {
    const now = Date.now();
    if (method === 'POST') {
      return mockResponse({
        id: `demo-capsule-${now}`,
        title: 'New Capsule (demo)',
        sender_saint_id: 'user',
        is_unlocked: false,
        unlock_date: new Date(now + 30 * 86_400_000).toISOString(),
        created_at: new Date(now).toISOString(),
      });
    }
    return mockResponse([
      {
        id: 'demo-capsule-1',
        title: 'For your 30th birthday',
        sender_saint_id: 'user',
        is_unlocked: false,
        unlock_date: new Date(now + 180 * 86_400_000).toISOString(),
        created_at: new Date(now - 90 * 86_400_000).toISOString(),
      },
      {
        id: 'demo-capsule-2',
        title: 'The kitchen on Sunday mornings',
        sender_saint_id: 'joseph',
        is_unlocked: true,
        unlock_date: new Date(now - 5 * 86_400_000).toISOString(),
        created_at: new Date(now - 200 * 86_400_000).toISOString(),
        content: 'Bread rising by the window, cardamom in the air, remember it exactly like this.',
      },
      {
        id: 'demo-capsule-3',
        title: 'Advice for hard seasons',
        sender_saint_id: 'raphael',
        is_unlocked: true,
        unlock_date: new Date(now - 40 * 86_400_000).toISOString(),
        created_at: new Date(now - 320 * 86_400_000).toISOString(),
        content: 'Sleep first. Decide tomorrow. Walk before you write back.',
      },
    ]);
  }

  // Runtime readiness: this is the KEY endpoint that unlocks everything
  if (path.includes('/runtime/readiness')) {
    return mockResponse(MOCK_READINESS);
  }

  // St. Raphael Health endpoints
  if (path.includes('/health/metrics')) {
    if (method === 'POST') return mockResponse({ stored: MOCK_HEALTH_METRICS.length });
    return mockResponse({ metrics: MOCK_HEALTH_METRICS });
  }
  if (path.includes('/health/summary')) return mockResponse(MOCK_HEALTH_SUMMARY);
  if (path.includes('/health-predictions/predict') || path.includes('/causal-twin/predictions')) {
    return mockResponse(MOCK_HEALTH_PREDICTIONS);
  }
  if (path.includes('/predict-family') || path.includes('/family-map') || path.includes('/ancestry')) {
    return mockResponse(MOCK_FAMILY_RISK);
  }
  // Predictive analytics (PredictiveHealthInsights → AnalyticsData shape).
  if (path.includes('/health/predictions')) {
    return mockResponse({
      analysis: { period_analyzed: 'Last 30 days', total_data_points: MOCK_HEALTH_METRICS.length, metrics_analyzed: 8 },
      patterns: [
        { metric: 'resting_heart_rate', trend: 'improving', confidence: 0.86, prediction_next_7_days: { expected_range: [63, 68], risk_level: 'low' } },
        { metric: 'sleep_duration', trend: 'stable', confidence: 0.78, prediction_next_7_days: { expected_range: [6.9, 7.8], risk_level: 'low' } },
        { metric: 'glucose', trend: 'stable', confidence: 0.81, prediction_next_7_days: { expected_range: [88, 101], risk_level: 'low' } },
        { metric: 'steps', trend: 'declining', confidence: 0.64, prediction_next_7_days: { expected_range: [6800, 9200], risk_level: 'medium' } },
      ],
      correlations: [
        { metric_1: 'sleep_duration', metric_2: 'resting_heart_rate', correlation: -0.62, strength: 'strong' },
        { metric_1: 'steps', metric_2: 'sleep_duration', correlation: 0.41, strength: 'moderate' },
      ],
      insights: [
        'Nights with 7+ hours of sleep are followed by a measurably lower resting heart rate.',
        'Step counts dip on the two days after short-sleep nights — recovery drives activity.',
      ],
      recommendations: [
        'Protect a consistent wind-down time; it is the single strongest lever in this sample.',
        'Schedule walks for mid-morning on post-short-sleep days to break the dip pattern.',
      ],
      generated_at: new Date().toISOString(),
    });
  }
  // Saints roster status (SaintStatusSummary[] — bare array).
  if (path.includes('/saints/status')) {
    return mockResponse([
      { saint_id: 'raphael', name: 'St. Raphael', title: 'Health & Healing', domain: 'health', engram_id: 'eng-margaret', is_active: true, knowledge_count: 128, built_in_available: true, availability_mode: 'full', persistence_available: true, history_available: true, knowledge_available: true },
      { saint_id: 'michael', name: 'St. Michael', title: 'Protection & Security', domain: 'security', engram_id: null, is_active: true, knowledge_count: 64, built_in_available: true, availability_mode: 'full', persistence_available: true, history_available: true, knowledge_available: true },
      { saint_id: 'joseph', name: 'St. Joseph', title: 'Family Coordination', domain: 'family', engram_id: null, is_active: true, knowledge_count: 87, built_in_available: true, availability_mode: 'full', persistence_available: true, history_available: true, knowledge_available: true },
      { saint_id: 'gabriel', name: 'St. Gabriel', title: 'Finance & Trusteeship', domain: 'finance', engram_id: null, is_active: true, knowledge_count: 52, built_in_available: true, availability_mode: 'full', persistence_available: true, history_available: true, knowledge_available: true },
      { saint_id: 'anthony', name: 'St. Anthony', title: 'Guidance & Audit', domain: 'audit', engram_id: null, is_active: true, knowledge_count: 41, built_in_available: true, availability_mode: 'full', persistence_available: true, history_available: true, knowledge_available: true },
    ]);
  }

  // St. Michael Security endpoints (axios-based: reached now that the demo
  // interceptor also routes axios through fetch).
  if (path.includes('/security/integrity') || path.includes('/security/scan')) {
    return mockResponse(MOCK_SECURITY_INTEGRITY);
  }
  if (path.includes('/audit') && path.includes('/cai')) return mockResponse(MOCK_CAI_AUDIT);
  if (path.includes('/audit/history')) return mockResponse({ audits: [MOCK_CAI_AUDIT] });
  if (path.includes('/monitoring/michael/scan')) return mockResponse(MOCK_MICHAEL_SCAN);
  if (path.includes('/monitoring/michael/vulnerabilities')) return mockResponse(MOCK_MICHAEL_VULNERABILITIES);
  if (path.includes('/monitoring/status')) return mockResponse(MOCK_MONITORING_STATUS);
  if (path.includes('/audit/controls/readiness')) return mockResponse(MOCK_COMPLIANCE_READINESS);
  if (path.includes('/integrity/hipaa-report')) return mockResponse(MOCK_HIPAA_REPORT);
  if (path.includes('/audit/jit-access')) return mockResponse({ success: true, data: [] });
  if (path.includes('/audit/ledger')) return mockResponse(MOCK_AUDIT_LEDGER);
  // No pending guardian intercessions in the demo (keeps the family dashboard console clean).
  if (path.includes('/saints/intercessions/pending')) return mockResponse([]);
  // No standing saint missions in the demo; the timeline renders without them.
  if (path.includes('/saints/missions/active')) return mockResponse([]);

  // Society feed endpoints: the feed simulates locally, so return empty
  // collections here to keep the demo console clean. Action endpoints
  // (boost/propagate/interact/random) must match BEFORE the plain
  // '/social/interact' read below or they'd be swallowed by it.
  if (path.includes('/social/boost')) return mockResponse({ ok: true, boosted: 5, note: 'Demo: society simulated locally.' });
  if (path.includes('/social/propagate/')) return mockResponse({ ok: true, note: 'Demo: legacy propagation simulated locally.' });
  if (path.includes('/social/interact/random')) return mockResponse({ ok: true, note: 'Demo: society event simulated locally.' });
  if (path.includes('/social/feed')) return mockResponse([]);
  if (path.includes('/social/clusters')) return mockResponse({});
  if (path.includes('/social/interact')) return mockResponse([]);

  // ── St. Joseph family-home board ──────────────────────────────────────
  // Must match BEFORE the generic '/family' matcher below, which used to
  // swallow these and hand the tasks/shopping/calendar/bulletin callers a
  // {members} object (empty boards, undefined writes).
  if (path.includes('/family-home/tasks')) {
    if (method === 'POST' || method === 'PUT') {
      let row: Record<string, unknown> = {};
      try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const isDispatch = path.endsWith('/dispatch');
      const idFromPath = path.split('/family-home/tasks/')[1]?.split('/')[0];
      const task = {
        id: idFromPath || `ft-demo-${Math.random().toString(36).slice(2, 8)}`,
        action: (row.action as string) || (row.title as string) || 'New family task',
        description: (row.description as string) || '',
        title: (row.title as string) || undefined,
        type: (row.type as string) || 'standard',
        status: isDispatch ? 'in_progress' : ((row.status as string) || 'pending'),
        category: (row.category as string) || 'family',
        assignedTo: (row.assignedTo as string) || (row.assignee as string) || undefined,
        assignee: (row.assignee as string) || undefined,
        dueDate: (row.dueDate as string) || null,
        createdAt: new Date().toISOString(),
      };
      // Stateful within the session: new tasks show up on the next list read.
      if (method === 'POST' && !idFromPath) DEMO_FAMILY_TASKS.unshift(task as (typeof DEMO_FAMILY_TASKS)[number]);
      return mockResponse({ task });
    }
    return mockResponse({ tasks: DEMO_FAMILY_TASKS });
  }
  if (path.includes('/family-home/shopping')) {
    if (method === 'POST' || method === 'PUT') {
      let row: Record<string, unknown> = {};
      try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const idFromPath = path.split('/family-home/shopping/')[1]?.split('/')[0];
      const bought = path.endsWith('/bought') || path.endsWith('/acquire');
      const item = {
        id: idFromPath || `si-demo-${Math.random().toString(36).slice(2, 8)}`,
        name: (row.name as string) || 'New item',
        quantity: (row.quantity as string) || '1',
        addedBy: (row.addedBy as string) || 'You',
        status: bought ? 'bought' : ((row.status as string) || 'needed'),
        type: (row.type as string) || 'standard',
        priceEst: (row.priceEst as number) ?? null,
        createdAt: new Date().toISOString(),
      };
      if (method === 'POST' && !idFromPath) DEMO_SHOPPING_ITEMS.unshift(item as (typeof DEMO_SHOPPING_ITEMS)[number]);
      return mockResponse({ item });
    }
    return mockResponse({ items: DEMO_SHOPPING_ITEMS });
  }
  if (path.includes('/family-home/calendar')) {
    return mockResponse({ events: DEMO_FAMILY_CALENDAR });
  }
  if (path.includes('/family-home/bulletin')) {
    if (method === 'POST') {
      let row: Record<string, unknown> = {};
      try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const message = { id: `bm-demo-${Math.random().toString(36).slice(2, 8)}`, text: (row.text as string) || '', author: (row.author as string) || 'You', createdAt: new Date().toISOString() };
      DEMO_BULLETIN_MESSAGES.unshift(message);
      return mockResponse({ message });
    }
    return mockResponse({ messages: DEMO_BULLETIN_MESSAGES });
  }

  // ── St. Gabriel Finance endpoints ─────────────────────────────────────
  // Order matters: wisegold/bank/categories are subpaths of '/finance' and
  // must match first. Shapes mirror src/lib/gabriel/finance.ts exactly.
  // WiseGold stays honestly unavailable in the demo (no fabricated crypto).
  if (path.includes('/finance/wisegold/')) {
    return mockResponse({ detail: 'Demo: WiseGold is not part of the demo.' }, 404);
  }
  if (path.includes('/finance/bank/status')) {
    return mockResponse(DEMO_BANK_STATUS);
  }
  if (path.includes('/finance/bank/')) {
    return mockResponse({ detail: 'Demo: bank linking is not part of the demo.' }, 404);
  }
  if (path.includes('/finance/budget/categories')) {
    if (method === 'POST' || method === 'PATCH') {
      let row: Record<string, unknown> = {};
      try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const idFromPath = path.split('/finance/budget/categories/')[1]?.split('/')[0];
      return mockResponse({ id: idFromPath || `cat-demo-${Math.random().toString(36).slice(2, 8)}`, name: (row.name as string) || 'New category', group: (row.group as string) || 'Lifestyle', is_hidden: Boolean(row.is_hidden) });
    }
    return mockResponse(DEMO_BUDGET_ENVELOPES.map((e) => ({ id: e.category_id, name: e.category_name, group: e.group })));
  }
  if (path.includes('/finance/budget') || path.includes('/budget/envelopes')) {
    // Live getBudget expects a BARE BudgetEnvelope[] (the old object shape
    // rendered the demo envelopes screen empty).
    return mockResponse(DEMO_BUDGET_ENVELOPES);
  }
  if (path.includes('/finance/net-worth') || path.includes('/net-worth')) {
    return mockResponse(MOCK_FINANCE_DATA.net_worth);
  }
  if (path.includes('/finance/transactions')) {
    if (method === 'POST') {
      let row: Record<string, unknown> = {};
      try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const cat = DEMO_BUDGET_ENVELOPES.find((e) => e.category_id === row.category_id);
      const createdTx = {
        id: `tx-demo-${Math.random().toString(36).slice(2, 8)}`,
        date: (row.date as string) || new Date().toISOString().slice(0, 10),
        payee: (row.payee as string) || 'Manual entry',
        amount: Number(row.amount) || 0,
        category_id: (row.category_id as string) || null,
        description: (row.description as string) || '',
        is_cleared: Boolean(row.is_cleared),
        category: cat ? { name: cat.category_name, group: cat.group } : null,
        source: 'manual' as const,
        account_name: null,
        account_mask: null,
        institution_name: null,
        pending: false,
      };
      DEMO_TRANSACTION_ROWS.unshift(createdTx as (typeof DEMO_TRANSACTION_ROWS)[number]);
      return mockResponse(createdTx);
    }
    // Live getTransactions expects a BARE Transaction[].
    return mockResponse(DEMO_TRANSACTION_ROWS);
  }
  if (path.includes('/transactions')) {
    return mockResponse({ transactions: MOCK_FINANCE_DATA.transactions });
  }
  if (path.includes('/finance') || path.includes('/gabriel')) {
    return mockResponse(MOCK_FINANCE_DATA);
  }

  // Trinity endpoints
  // Trinity: deliberately NOT mocked. trinityApi calls /api/v1/trinity/synapse
  // and, on failure, computes a full wire-compatible local model per action
  // (vitality, calendar, chronicle, nudges, what-if…). Answering here with a
  // generic shape used to feed the dashboard zeros; the 404 catch-all below
  // routes it into that far richer fallback instead.

  // Saint AI Chat endpoints
  if (path.includes('/chat') || path.includes('/ai/') || path.includes('/council')) {
    const saint = ['raphael', 'michael', 'gabriel', 'anthony', 'trinity']
      .find(s => path.toLowerCase().includes(s)) || 'trinity';
    const responses = SAINT_CHAT_RESPONSES[saint] || SAINT_CHAT_RESPONSES.trinity;
    const response = responses[Math.floor(Math.random() * responses.length)];
    const ts = new Date().toISOString();
    // Include every shape the various chat consumers read: top-level `message`,
    // `content` (saint chat), and `data.message` (EngramChat): otherwise some
    // fall back to the canned "I apologize…" error string.
    return mockResponse({
      message: response,
      content: response,
      data: { message: response, timestamp: ts },
      saint,
      timestamp: ts,
      confidence: 0.85 + Math.random() * 0.1,
    });
  }

  // Elohim sealed-status: in the demo, every requested artifact reads as
  // sealed so the St Joseph permanence badge is visible.
  if (path.includes('/api/v1/elohim/anchors')) {
    const rawIds = (path.split('ref_ids=')[1] || '').split('&')[0];
    const ids = decodeURIComponent(rawIds).split(',').filter(Boolean);
    const anchors: Record<string, { ref_type: string; sigil: string; sealed_at: string }> = {};
    ids.forEach((id, i) => {
      anchors[id] = {
        ref_type: 'soul',
        sigil: `d3a0${(i + 1).toString(16).padStart(12, '0')}`,
        sealed_at: new Date().toISOString(),
      };
    });
    return mockResponse({ anchors });
  }

  // ── Engram actions ────────────────────────────────────────────────────
  // Must match BEFORE the generic '/engram' matcher, which used to swallow
  // create/analyze/mentorship/vignette/batch-sync and return a wrong-shape
  // {profile, engrams} stub (malformed creations, dead training actions).
  if (path.includes('/engrams/create')) {
    let row: Record<string, unknown> = {};
    try { row = typeof body === 'string' ? JSON.parse(body) : {}; } catch { /* ignore */ }
    const name = (row.name as string) || 'New Engram';
    const created = {
      id: `eng-demo-${name.replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase() || 'x'}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: '00000000-0000-4000-8000-000000000001',
      name,
      relationship: (row.relationship as string) || 'custom',
      engram_type: (row.engram_type as string) || 'custom',
      archetype: (row.archetype as string) || 'The Companion',
      description: (row.description as string) || '',
      avatar_url: null,
      personality_summary: { ocean: { O: 60, C: 60, E: 60, A: 60, N: 40 } },
      total_questions_answered: 0,
      ai_readiness_score: 0,
      is_ai_active: false,
      training_status: 'training',
      voice_enabled: false,
      voice_status: 'none',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Stateful within the session: the new engram appears in the next list read.
    DEMO_ENGRAMS_LIST.unshift(created as (typeof DEMO_ENGRAMS_LIST)[number]);
    return mockResponse(created);
  }
  if (path.includes('/engrams/batch-sync')) {
    let members: Array<{ id?: string }> = [];
    try { members = typeof body === 'string' ? JSON.parse(body) : []; } catch { /* ignore */ }
    const mapping: Record<string, string> = {};
    (Array.isArray(members) ? members : []).forEach((m, i) => {
      if (m?.id) mapping[m.id] = `eng-demo-${m.id}`;
      else mapping[`member-${i}`] = `eng-demo-${i}`;
    });
    return mockResponse(mapping);
  }
  if (/\/engrams\/[^/]+\/analyze/.test(path)) {
    // PersonalityTrainingCenter reads {traits:[{name, value(0-1)}]}. Values
    // come from the demo engram roster so the radar reflects the selection.
    const engramId = path.split('/engrams/')[1]?.split('/')[0] || '';
    const known = DEMO_ENGRAMS_LIST.find((e) => e.id === engramId);
    const ocean = known?.personality_summary?.ocean || { O: 62, C: 71, E: 58, A: 76, N: 38 };
    return mockResponse({
      traits: [
        { name: 'Openness', value: ocean.O / 100 },
        { name: 'Conscientiousness', value: ocean.C / 100 },
        { name: 'Extraversion', value: ocean.E / 100 },
        { name: 'Agreeableness', value: ocean.A / 100 },
        { name: 'Neuroticism', value: ocean.N / 100 },
      ],
      source: 'demo-sample',
    });
  }
  if (/\/engrams\/[^/]+\/mentorship\/start/.test(path)) {
    return mockResponse({ status: 'started', note: 'Demo: mentorship simulated on sample data.' });
  }
  if (/\/engrams\/[^/]+\/vignette/.test(path)) {
    return mockResponse({ status: 'ingested', note: 'Demo: vignette recorded locally.' });
  }

  // Engrams list: the real endpoint returns a bare array (List[EngramResponse]).
  // Returning an object here crashes every caller that does data.filter(...)
  // (e.g. CustomEngramsDashboard's "c.filter is not a function").
  if (/\/api\/v1\/engrams\/?($|\?)/.test(path)) {
    return mockResponse(DEMO_ENGRAMS_LIST);
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

  // Catch-all for any unmocked /api/v1/ endpoint: fail like a real 404.
  // A 200 with a generic object here poisons callers that expect endpoint
  // shapes (arrays, metrics, controls): they crash on success but handle
  // failure gracefully (fallback data / empty states). Let them fail.
  if (path.includes('/api/v1/')) {
    return mockResponse({ detail: 'Demo: endpoint not mocked' }, 404);
  }

  return null; // Not an API call, pass through
}

/**
 * Initialize the demo mode fetch interceptor.
 * Call this when demo mode is activated.
 */
export function initDemoInterceptor(): void {
  if (interceptorActive) return;
  if (!isDemoAuthEnabled()) return;

  interceptorActive = true;

  // Several saints (notably St. Michael's security layer) call the API through
  // axios, which uses XHR by default and would BYPASS this fetch interceptor, 
  // hitting the real, cold backend and making the dashboard feel broken/slow in
  // demo. Route axios through its fetch adapter so the mocks below apply.
  try {
    prevAxiosAdapter = (axios.defaults as { adapter?: unknown }).adapter;
    (axios.defaults as { adapter?: unknown }).adapter = 'fetch';
  } catch { /* adapter override unavailable, fetch-based callers still mock */ }

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Never fake auth: supabase-js manages demo-less sessions locally.
    if (url.includes('.supabase.co/auth/v1/')) {
      return originalFetch.call(window, input, init);
    }

    // Supabase Storage: fail fast and honestly in demo. Letting these reach
    // the real project meant uploads/downloads hung on live-network auth
    // failures; a clean 400 routes callers into their own error handling.
    if (url.includes('/storage/v1/')) {
      return new Response(
        JSON.stringify({ statusCode: '400', error: 'DemoMode', message: 'File storage is disabled in the demo. Create a free account to upload files.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Supabase PostgREST speaks its own shapes: list selects return a BARE
    // ARRAY of rows, .single()/.maybeSingle() (Accept: vnd.pgrst.object) a
    // lone object or a PGRST116 error. Feeding these callers the generic
    // backend mocks (objects) crashed them ("data.map is not a function").
    if (url.includes('.supabase.co/rest/v1/')) {
      await new Promise(r => setTimeout(r, 80));
      let accept = '';
      try {
        accept = new Headers((init?.headers ?? {}) as HeadersInit).get('accept') || '';
      } catch { /* keep '' */ }
      const restMethod = (init?.method || 'GET').toUpperCase();
      if (accept.includes('vnd.pgrst.object')) {
        // An insert or update that asks for the row back (.insert().select()
        // .single() / .update()...single()). Echo the submitted row with an id
        // and timestamps so demo create/edit flows succeed instead of 406ing.
        if (restMethod === 'POST' || restMethod === 'PATCH') {
          let row: Record<string, unknown> = {};
          try {
            const parsed = init?.body ? JSON.parse(String(init.body)) : {};
            row = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
          } catch { /* keep empty row */ }
          const nowIso = new Date().toISOString();
          const echoed = {
            id: (row.id as string) || `demo-${Math.random().toString(36).slice(2, 10)}`,
            created_at: (row.created_at as string) || nowIso,
            updated_at: nowIso,
            ...row,
          };
          return new Response(JSON.stringify(echoed), {
            status: restMethod === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // A single-row read (.single()/.maybeSingle()): serve the first
        // seeded row when the table is seeded (career profile, daily
        // question, question category…), else PostgREST's PGRST116.
        const singleTable = (url.split('/rest/v1/')[1] || '').split('?')[0].split('/')[0];
        const singleSeed = (DEMO_SUPABASE_TABLES[singleTable] || [])[0];
        if (singleSeed) {
          return new Response(JSON.stringify(singleSeed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: 'Results contain 0 rows', hint: null }),
          { status: 406, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Seed the few tables our flagship demo screens read directly; every
      // other table still returns [] (unchanged), so this can't break callers.
      const restTable = (url.split('/rest/v1/')[1] || '').split('?')[0].split('/')[0];
      const seededRows = DEMO_SUPABASE_TABLES[restTable] || [];
      return new Response(JSON.stringify(seededRows), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Content-Range': seededRows.length ? `0-${seededRows.length - 1}/${seededRows.length}` : '*/0' },
      });
    }

    // Only intercept API calls
    if (url.includes('/api/') || url.includes('supabase')) {
      const mockResp = matchEndpoint(url, (init?.method || 'GET').toUpperCase(), init?.body);
      if (mockResp) {
        // Small delay to simulate network latency
        await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
        return mockResp;
      }
    }

    // Pass through to real fetch for non-API calls (CDN, assets, etc.)
    return originalFetch.call(window, input, init);
  };

  if (import.meta.env.DEV) console.log('[EverAfter Demo] Data interceptor active, all saints running on mock data');
}

/**
 * Remove the interceptor and restore original fetch.
 */
export function removeDemoInterceptor(): void {
  if (!interceptorActive) return;
  window.fetch = originalFetch;
  try { (axios.defaults as { adapter?: unknown }).adapter = prevAxiosAdapter; } catch { /* ignore */ }
  interceptorActive = false;
  console.log('[EverAfter Demo] Data interceptor removed');
}

/**
 * Get chat response for a specific saint (for direct integration).
 */
export function getDemoChatResponse(saint: string, userMessage?: string): string {
  const responses = SAINT_CHAT_RESPONSES[saint] || SAINT_CHAT_RESPONSES.trinity;
  // Deterministic pick keyed on the message, so asking the same question
  // twice in the demo gives the same answer (reads as intent, not dice).
  const seed = (userMessage || '').length;
  return responses[seed % responses.length];
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

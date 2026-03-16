import { API_BASE_URL, isDevelopment } from '../../lib/env';
import { supabase } from '../supabase';

export interface TransactionCategory {
  name: string;
  group: string;
}

export interface Transaction {
  id: string;
  date: string;
  payee: string;
  amount: number;
  category_id?: string | null;
  description?: string;
  is_cleared: boolean;
  category?: TransactionCategory | null;
  source?: 'manual' | 'bank';
  account_name?: string | null;
  account_mask?: string | null;
  institution_name?: string | null;
  pending?: boolean;
}

export interface BudgetEnvelope {
  id: string;
  category_id: string;
  category_name: string;
  group: string;
  month: string;
  assigned: number;
  activity: number;
  available: number;
}

export interface TransferRequest {
  from_category_id: string;
  to_category_id: string;
  amount: number;
  month: string;
}

export interface BankAccountSummary {
  id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  current_balance?: number | null;
  available_balance?: number | null;
  iso_currency_code?: string | null;
}

export interface BankConnectionSummary {
  id: string;
  provider: string;
  institution_name?: string | null;
  institution_id?: string | null;
  last_synced_at?: string | null;
  imported_transactions: number;
  accounts: BankAccountSummary[];
}

export interface BankStatusResponse {
  provider: 'plaid';
  configured: boolean;
  connected: boolean;
  sync_recommended: boolean;
  connections: BankConnectionSummary[];
}

const FINANCE_CACHE_KEYS = {
  transactions: 'everafter_finance_transactions_cache',
  bankStatus: 'everafter_finance_bank_status_cache',
} as const;

function readFinanceCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeFinanceCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore private-mode and quota failures.
  }
}

function getCandidateUrls(endpoint: string): string[] {
  const candidates = new Set<string>();

  if (endpoint.startsWith('/')) {
    candidates.add(endpoint);
  }

  if (API_BASE_URL) {
    candidates.add(`${API_BASE_URL}${endpoint}`);
  }

  if (isDevelopment && endpoint.startsWith('/api/v1')) {
    candidates.add(`http://localhost:8010${endpoint}`);
  }

  return Array.from(candidates);
}

function parseJsonText<T>(text: string, endpoint: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const compact = text.trim().slice(0, 120).replace(/\s+/g, ' ');
    if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
      throw new Error(`Finance API returned HTML for ${endpoint}. Check backend routing or VITE_API_BASE_URL.`);
    }
    throw new Error(`Finance API returned invalid JSON for ${endpoint}.`);
  }
}

async function readJsonResponse<T>(response: Response, endpoint: string): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return parseJsonText<T>(text, endpoint);
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = sessionResult.data.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  let lastError: Error | null = null;

  for (const candidateUrl of getCandidateUrls(endpoint)) {
    try {
      const response = await fetch(candidateUrl, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let detail = '';
        const bodyText = await response.text();
        if (bodyText) {
          try {
            const parsed = JSON.parse(bodyText);
            detail = parsed?.detail || parsed?.error || '';
          } catch {
            detail = bodyText.trim().slice(0, 160);
          }
        }

        if (detail.startsWith('<!doctype') || detail.startsWith('<html')) {
          lastError = new Error(`Finance API route ${candidateUrl} returned HTML instead of JSON.`);
          continue;
        }

        throw new Error(detail || `API Error ${response.status}: ${response.statusText}`);
      }

      if (!contentType.includes('application/json')) {
        const bodyText = await response.text();
        const compact = bodyText.trim().slice(0, 120).replace(/\s+/g, ' ');
        if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
          lastError = new Error(`Finance API route ${candidateUrl} returned HTML instead of JSON.`);
          continue;
        }
        throw new Error(`Finance API returned unsupported content for ${endpoint}.`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Finance API request failed.');
      if (!isDevelopment) {
        break;
      }
    }
  }

  throw lastError || new Error(`Finance API request failed for ${endpoint}.`);
}

async function fetchJsonWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);
  return readJsonResponse<T>(response, endpoint);
}

export const financeApi = {
  getBudget: async (month?: string): Promise<BudgetEnvelope[]> => {
    const query = month ? `?month=${month}` : '';
    return fetchJsonWithAuth<BudgetEnvelope[]>(`/api/v1/finance/budget${query}`);
  },

  getCategories: async (): Promise<{ id: string; name: string; group?: string }[]> => {
    const budget = await financeApi.getBudget();
    const deduped = new Map<string, { id: string; name: string; group?: string }>();
    for (const item of budget) {
      if (!deduped.has(item.category_id)) {
        deduped.set(item.category_id, {
          id: item.category_id,
          name: item.category_name,
          group: item.group,
        });
      }
    }
    return Array.from(deduped.values());
  },

  createCategory: async (name: string, group: string) => {
    return fetchJsonWithAuth('/api/v1/finance/budget/categories', {
      method: 'POST',
      body: JSON.stringify({ name, group }),
    });
  },

  updateCategory: async (categoryId: string, data: { name?: string; is_hidden?: boolean }) => {
    return fetchJsonWithAuth(`/api/v1/finance/budget/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  createTransaction: async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const created = await fetchJsonWithAuth<Transaction>('/api/v1/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
    const cached = readFinanceCache<Transaction[]>(FINANCE_CACHE_KEYS.transactions, []);
    writeFinanceCache(
      FINANCE_CACHE_KEYS.transactions,
      [created, ...cached.filter((item) => item.id !== created.id)].slice(0, 100),
    );
    return created;
  },

  getTransactions: async (limit: number = 50): Promise<Transaction[]> => {
    try {
      const transactions = await fetchJsonWithAuth<Transaction[]>(`/api/v1/finance/transactions?limit=${limit}`);
      writeFinanceCache(FINANCE_CACHE_KEYS.transactions, transactions);
      return transactions;
    } catch (error) {
      const cached = readFinanceCache<Transaction[]>(FINANCE_CACHE_KEYS.transactions, []);
      if (cached.length > 0) {
        return cached.slice(0, limit);
      }
      throw error;
    }
  },

  transferFunds: async (transfer: TransferRequest): Promise<void> => {
    await fetchWithAuth('/api/v1/finance/budget/transfer', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  },

  updateEnvelope: async (id: string, assigned: number): Promise<void> => {
    await fetchWithAuth(`/api/v1/finance/budget/envelopes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned }),
    });
  },

  getBankStatus: async (): Promise<BankStatusResponse> => {
    try {
      const status = await fetchJsonWithAuth<BankStatusResponse>('/api/v1/finance/bank/status');
      writeFinanceCache(FINANCE_CACHE_KEYS.bankStatus, status);
      return status;
    } catch (error) {
      const cached = readFinanceCache<BankStatusResponse | null>(FINANCE_CACHE_KEYS.bankStatus, null);
      if (cached) {
        return {
          ...cached,
          sync_recommended: false,
        };
      }
      throw error;
    }
  },

  createBankLinkToken: async (): Promise<{ link_token: string; expiration?: string | null }> => {
    return fetchJsonWithAuth<{ link_token: string; expiration?: string | null }>('/api/v1/finance/bank/link-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  exchangeBankPublicToken: async (payload: {
    public_token: string;
    institution_id?: string | null;
    institution_name?: string | null;
  }) => {
    return fetchJsonWithAuth('/api/v1/finance/bank/exchange', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  syncBankTransactions: async () => {
    return fetchJsonWithAuth('/api/v1/finance/bank/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getWiseGoldWallet: async (): Promise<any> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/wallet');
  },

  getWiseGoldPrice: async (): Promise<any> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/price');
  },

  getWiseGoldCovenants: async (): Promise<any[]> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/covenants');
  },

  getWiseGoldLedger: async (limit: number = 12): Promise<any[]> => {
    return fetchJsonWithAuth(`/api/v1/finance/wisegold/ledger?limit=${limit}`);
  },

  getWiseGoldAttestations: async (): Promise<any[]> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/attestations');
  },

  getWiseGoldPolicySummary: async (): Promise<any> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/policy/summary');
  },

  syncWiseGoldHeartbeat: async (): Promise<any> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/heartbeat', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  submitWiseGoldCovenantAction: async (
    covenantId: string,
    action: 'deposit' | 'withdraw',
    amount: number,
  ): Promise<any> => {
    return fetchJsonWithAuth(`/api/v1/finance/wisegold/covenants/${covenantId}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  submitWiseGoldBridge: async (payload: {
    destination_chain: string;
    destination_address: string;
    amount: number;
  }): Promise<any> => {
    return fetchJsonWithAuth('/api/v1/finance/wisegold/bridge/ccip', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

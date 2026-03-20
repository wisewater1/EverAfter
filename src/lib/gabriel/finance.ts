import { requestBackendJson, requestBackendResponse } from '../backend-request';
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
  budget: 'everafter_finance_budget_cache',
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

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = sessionResult.data.session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  return requestBackendResponse(endpoint, { ...options, headers }, `Finance API request failed for ${endpoint}.`);
}

async function fetchJsonWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = sessionResult.data.session?.access_token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  return requestBackendJson<T>(
    endpoint,
    { ...options, headers },
    `Finance API request failed for ${endpoint}.`,
  );
}

export const financeApi = {
  getBudget: async (month?: string): Promise<BudgetEnvelope[]> => {
    const query = month ? `?month=${month}` : '';
    try {
      const budget = await fetchJsonWithAuth<BudgetEnvelope[]>(`/api/v1/finance/budget${query}`);
      writeFinanceCache(FINANCE_CACHE_KEYS.budget, budget);
      return budget;
    } catch (error) {
      const cached = readFinanceCache<BudgetEnvelope[]>(FINANCE_CACHE_KEYS.budget, []);
      if (cached.length > 0) {
        return cached;
      }
      throw error;
    }
  },

  getCachedBudget: (): BudgetEnvelope[] => {
    return readFinanceCache<BudgetEnvelope[]>(FINANCE_CACHE_KEYS.budget, []);
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

  getCachedTransactions: (limit: number = 50): Transaction[] => {
    return readFinanceCache<Transaction[]>(FINANCE_CACHE_KEYS.transactions, []).slice(0, limit);
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

  getCachedBankStatus: (): BankStatusResponse | null => {
    return readFinanceCache<BankStatusResponse | null>(FINANCE_CACHE_KEYS.bankStatus, null);
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

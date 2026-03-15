import { API_BASE_URL } from '../../lib/env';
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

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = sessionResult.data.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.detail || '';
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `API Error ${response.status}: ${response.statusText}`);
  }

  return response;
}

export const financeApi = {
  getBudget: async (month?: string): Promise<BudgetEnvelope[]> => {
    const query = month ? `?month=${month}` : '';
    const response = await fetchWithAuth(`/api/v1/finance/budget${query}`);
    return response.json();
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
    const response = await fetchWithAuth('/api/v1/finance/budget/categories', {
      method: 'POST',
      body: JSON.stringify({ name, group }),
    });
    return response.json();
  },

  updateCategory: async (categoryId: string, data: { name?: string; is_hidden?: boolean }) => {
    const response = await fetchWithAuth(`/api/v1/finance/budget/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  createTransaction: async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const response = await fetchWithAuth('/api/v1/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
    return response.json();
  },

  getTransactions: async (limit: number = 50): Promise<Transaction[]> => {
    const response = await fetchWithAuth(`/api/v1/finance/transactions?limit=${limit}`);
    return response.json();
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
    const response = await fetchWithAuth('/api/v1/finance/bank/status');
    return response.json();
  },

  createBankLinkToken: async (): Promise<{ link_token: string; expiration?: string | null }> => {
    const response = await fetchWithAuth('/api/v1/finance/bank/link-token', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.json();
  },

  exchangeBankPublicToken: async (payload: {
    public_token: string;
    institution_id?: string | null;
    institution_name?: string | null;
  }) => {
    const response = await fetchWithAuth('/api/v1/finance/bank/exchange', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  syncBankTransactions: async () => {
    const response = await fetchWithAuth('/api/v1/finance/bank/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.json();
  },
};

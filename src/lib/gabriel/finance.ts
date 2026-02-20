import { supabase } from '../supabase';

export interface Transaction {
    id: string;
    date: string;
    payee: string;
    amount: number;
    category_id: string;
    description?: string;
    is_cleared: boolean;
    category?: { name: string; group: string };
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

// Helper to handle authenticated requests
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    console.log(`[Finance API] ${endpoint} | Token present: ${!!token} | Token prefix: ${token?.substring(0, 20)}...`);

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers as any
    };

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Finance API] ${endpoint} failed: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }

    return response;
}

export const financeApi = {
    getBudget: async (month?: string): Promise<BudgetEnvelope[]> => {
        const query = month ? `?month=${month}` : '';
        const response = await fetchWithAuth(`/api/v1/finance/budget${query}`);
        return await response.json();
    },

    getCategories: async (): Promise<{ id: string, name: string }[]> => {
        // We can leverage the budget endpoint to get categories if no dedicated endpoint exists,
        // or we can add a dedicated endpoint.
        // For now, let's use the budget endpoint as it contains all category info
        const budget = await financeApi.getBudget();
        return budget.map(b => ({ id: b.category_id, name: b.category_name }));
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
    }
};

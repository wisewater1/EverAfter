import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Building2,
  Filter,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react';

import AddTransactionModal from './AddTransactionModal';
import { BankStatusResponse, Transaction, financeApi } from '../../lib/gabriel/finance';
import { openPlaidLink } from '../../lib/gabriel/plaidLink';

type FilterMode = 'all' | 'bank' | 'manual';
type SortMode = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function TransactionLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bankStatus, setBankStatus] = useState<BankStatusResponse | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date_desc');

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setLoading(true);
      const status = await financeApi.getBankStatus();
      setBankStatus(status);

      if (status.connected && status.sync_recommended) {
        try {
          await financeApi.syncBankTransactions();
          const refreshedStatus = await financeApi.getBankStatus();
          setBankStatus(refreshedStatus);
        } catch (syncError) {
          console.error('Bank sync on load failed:', syncError);
        }
      }

      const data = await financeApi.getTransactions(100);
      setTransactions(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err?.message || 'Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnectBank() {
    try {
      setBankLoading(true);
      const tokenResponse = await financeApi.createBankLinkToken();
      await openPlaidLink({
        linkToken: tokenResponse.link_token,
        onSuccess: async (publicToken, metadata) => {
          await financeApi.exchangeBankPublicToken({
            public_token: publicToken,
            institution_id: metadata?.institution?.institution_id ?? metadata?.institution?.id ?? null,
            institution_name: metadata?.institution?.name ?? null,
          });
          await bootstrap();
        },
      });
    } catch (err: any) {
      console.error('Failed to connect bank:', err);
      setError(err?.message || 'Failed to connect bank');
    } finally {
      setBankLoading(false);
    }
  }

  async function handleSyncBank() {
    try {
      setBankLoading(true);
      await financeApi.syncBankTransactions();
      await bootstrap();
    } catch (err: any) {
      console.error('Failed to sync bank:', err);
      setError(err?.message || 'Failed to sync transactions');
    } finally {
      setBankLoading(false);
    }
  }

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const results = transactions.filter((transaction) => {
      if (filterMode !== 'all' && (transaction.source || 'manual') !== filterMode) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        transaction.payee,
        transaction.description,
        transaction.category?.name,
        transaction.institution_name,
        transaction.account_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return [...results].sort((left, right) => {
      if (sortMode === 'date_asc') {
        return new Date(left.date).getTime() - new Date(right.date).getTime();
      }
      if (sortMode === 'amount_desc') {
        return Math.abs(right.amount) - Math.abs(left.amount);
      }
      if (sortMode === 'amount_asc') {
        return Math.abs(left.amount) - Math.abs(right.amount);
      }
      return new Date(right.date).getTime() - new Date(left.date).getTime();
    });
  }, [transactions, searchQuery, filterMode, sortMode]);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const bankButtonLabel = bankStatus?.connected ? 'Sync Bank' : 'Connect Bank';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-sm">
      <div className="border-b border-slate-800 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 xl:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search transactions..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFilterMode((current) =>
                  current === 'all' ? 'bank' : current === 'bank' ? 'manual' : 'all',
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Filter className="h-4 w-4" />
              {filterMode === 'all' ? 'Filter' : filterMode === 'bank' ? 'Bank only' : 'Manual only'}
            </button>
            <button
              type="button"
              onClick={() =>
                setSortMode((current) =>
                  current === 'date_desc'
                    ? 'date_asc'
                    : current === 'date_asc'
                      ? 'amount_desc'
                      : current === 'amount_desc'
                        ? 'amount_asc'
                        : 'date_desc',
                )
              }
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <ArrowDownUp className="h-4 w-4" />
              {sortMode === 'date_desc'
                ? 'Newest'
                : sortMode === 'date_asc'
                  ? 'Oldest'
                  : sortMode === 'amount_desc'
                    ? 'Largest'
                    : 'Smallest'}
            </button>
            <button
              type="button"
              onClick={bankStatus?.configured ? (bankStatus.connected ? handleSyncBank : handleConnectBank) : undefined}
              disabled={bankLoading || !bankStatus?.configured}
              className="flex items-center gap-2 rounded-lg border border-sky-700/40 bg-sky-500/10 px-3 py-2 font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bankLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : bankStatus?.connected ? <RefreshCcw className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              {bankButtonLabel}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="ml-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Bank Sync</div>
            <div className="mt-1 text-sm text-slate-200">
              {!bankStatus?.configured
                ? 'Plaid is not configured on this backend.'
                : bankStatus.connected
                  ? `${bankStatus.connections.length} linked connection${bankStatus.connections.length === 1 ? '' : 's'}`
                  : 'No bank linked yet'}
            </div>
          </div>

          {bankStatus?.connections.map((connection) => (
            <div
              key={connection.id}
              className="min-w-[260px] rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-100">{connection.institution_name || 'Linked bank'}</div>
                  <div className="text-xs text-slate-500">
                    {connection.imported_transactions} imported transaction
                    {connection.imported_transactions === 1 ? '' : 's'}
                  </div>
                </div>
                {connection.last_synced_at && (
                  <div className="text-[11px] text-slate-500">
                    {new Date(connection.last_synced_at).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                {connection.accounts.map((account) => (
                  <span
                    key={account.id}
                    className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1"
                  >
                    {account.name}
                    {account.mask ? ` ••••${account.mask}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 border-b border-slate-800 bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <div className="col-span-2">Date</div>
        <div className="col-span-3">Payee</div>
        <div className="col-span-2">Account</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-1">Source</div>
        <div className="col-span-2 text-right">Amount</div>
      </div>

      <div className="divide-y divide-slate-800/50">
        {error && (
          <div className="border-b border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
            <strong>API Error:</strong> {error}
          </div>
        )}

        {filteredTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="grid cursor-default grid-cols-12 items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-800/30"
          >
            <div className="col-span-2 text-slate-400">{new Date(transaction.date).toLocaleDateString()}</div>
            <div className="col-span-3">
              <div className="font-medium text-slate-200">{transaction.payee}</div>
              {transaction.description && (
                <div className="truncate text-xs italic text-slate-500">{transaction.description}</div>
              )}
            </div>
            <div className="col-span-2 text-xs text-slate-400">
              <div>{transaction.account_name || 'Manual entry'}</div>
              {transaction.institution_name && (
                <div className="truncate text-[11px] text-slate-500">{transaction.institution_name}</div>
              )}
            </div>
            <div className="col-span-2">
              <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {transaction.category?.name || 'Uncategorized'}
              </span>
            </div>
            <div className="col-span-1 text-xs text-slate-400">
              <span
                className={`rounded-full px-2 py-1 ${
                  transaction.source === 'bank'
                    ? 'bg-sky-500/10 text-sky-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {transaction.source === 'bank' ? 'Bank' : 'Manual'}
              </span>
              {transaction.pending && <div className="mt-1 text-[10px] text-amber-400">Pending</div>}
            </div>
            <div
              className={`col-span-2 text-right font-mono font-medium ${
                transaction.amount > 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {transaction.amount > 0 ? '+' : ''}
              {transaction.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            No transactions found.
          </div>
        )}
      </div>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={() => {
          void bootstrap();
        }}
      />
    </div>
  );
}

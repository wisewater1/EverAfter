/**
 * Legacy Vault — Supabase data layer.
 *
 * Extracted from src/components/LegacyVaultEnhanced.tsx so the vault's
 * Supabase access can be reused (and unit-tested) outside of the giant
 * component. The functions here are pure async helpers — no React state,
 * no setLoading — so the caller stays in charge of UI lifecycle.
 *
 * Slice 1 of the LegacyVaultEnhanced refactor: pure code movement,
 * matching the original semantics one-to-one. Behavior change is
 * out-of-scope.
 */

import { supabase } from '../supabase';
import type {
    Beneficiary,
    Receipt,
    VaultItem,
    VaultItemType,
} from './types';

interface AuthUser {
    id: string;
    email?: string;
}

function ensureClient() {
    if (!supabase) throw new Error('Supabase client is not configured.');
    return supabase;
}

/**
 * Load every vault item of `type` owned by `user`. Matches the existing
 * "Continuity" section query — newest first.
 */
export async function fetchVaultItems(
    user: AuthUser,
    type: VaultItemType,
): Promise<VaultItem[]> {
    const client = ensureClient();
    const { data, error } = await client
        .from('vault_items')
        .select('*')
        .eq('type', type)
        .eq('user_id', user.id) // explicit even with RLS
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as VaultItem[];
}

/**
 * Items shared TO the current user — items where they appear as a
 * beneficiary by email match. Used by the "Shared" section.
 */
export async function fetchSharedVaultItems(
    user: AuthUser,
): Promise<VaultItem[]> {
    if (!user.email) return [];
    const client = ensureClient();

    const { data, error } = await client
        .from('vault_items')
        .select(`
            *,
            beneficiary_links!inner (
                role,
                beneficiaries!inner (
                    email
                )
            )
        `)
        .neq('user_id', user.id)
        .eq('beneficiary_links.beneficiaries.email', user.email)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as VaultItem[];
}

/** Beneficiaries owned by `user`. */
export async function fetchBeneficiaries(
    user: AuthUser,
): Promise<Beneficiary[]> {
    const client = ensureClient();
    const { data, error } = await client
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Beneficiary[];
}

/** Recent vault receipts (audit / export proofs) — last 20. */
export async function fetchReceipts(user: AuthUser): Promise<Receipt[]> {
    const client = ensureClient();
    const { data, error } = await client
        .from('vault_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) throw error;
    return (data || []) as Receipt[];
}

/** Both calls used by the "Assurance" section, in parallel. */
export async function fetchAssuranceData(
    user: AuthUser,
): Promise<{ beneficiaries: Beneficiary[]; receipts: Receipt[] }> {
    const [beneficiaries, receipts] = await Promise.all([
        fetchBeneficiaries(user).catch(() => [] as Beneficiary[]),
        fetchReceipts(user).catch(() => [] as Receipt[]),
    ]);
    return { beneficiaries, receipts };
}

export interface CreateBeneficiaryInput {
    name?: string;
    email: string;
    phone?: string;
    relationship?: string;
}

export async function createBeneficiary(
    user: AuthUser,
    payload: CreateBeneficiaryInput,
): Promise<void> {
    const client = ensureClient();
    const { error } = await client.from('beneficiaries').insert({
        user_id: user.id,
        name: payload.name || null,
        email: payload.email,
        phone: payload.phone || null,
        relationship: payload.relationship || null,
    });
    if (error) throw error;
}

export async function deleteBeneficiary(
    user: AuthUser,
    beneficiaryId: string,
): Promise<void> {
    const client = ensureClient();
    const { error } = await client
        .from('beneficiaries')
        .delete()
        .eq('id', beneficiaryId)
        .eq('user_id', user.id);
    if (error) throw error;
}

export async function deleteVaultItem(itemId: string): Promise<void> {
    const client = ensureClient();
    const { error } = await client.from('vault_items').delete().eq('id', itemId);
    if (error) throw error;
}

export async function runIntegrityCheck(): Promise<{ message?: string }> {
    const client = ensureClient();
    const { data, error } = await client.functions.invoke('vault-integrity-check');
    if (error) throw error;
    return (data ?? {}) as { message?: string };
}

export async function exportVault(): Promise<{ downloadUrl?: string }> {
    const client = ensureClient();
    const { data, error } = await client.functions.invoke('vault-export');
    if (error) throw error;
    return (data ?? {}) as { downloadUrl?: string };
}

/**
 * Legacy Vault: shared types.
 *
 * Extracted from src/components/LegacyVaultEnhanced.tsx (2102 LOC) so the
 * vault types are reusable across sub-components without forcing
 * everything to import the giant component file.
 *
 * Slice 1 of the LegacyVaultEnhanced refactor: pure code movement. No
 * behavior change.
 */

export type VaultItemType = 'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE';

export type VaultItemStatus =
    | 'DRAFT'
    | 'SCHEDULED'
    | 'LOCKED'
    | 'PUBLISHED'
    | 'PAUSED'
    | 'SENT'
    | 'ARCHIVED';

export type UnlockRule =
    | 'DATE'
    | 'DEATH_CERT'
    | 'CUSTODIAN_APPROVAL'
    | 'HEARTBEAT_TIMEOUT';

export interface VaultItem {
    id: string;
    user_id: string;
    type: VaultItemType;
    title: string;
    slug?: string;
    status: VaultItemStatus;
    // payload is unmodelled jsonb: kept as Record so consumers can read
    // common fields like recipients/attachments without losing the rest.
    payload: Record<string, unknown> & {
        recipients?: unknown[];
        attachments?: string[];
    };
    is_encrypted: boolean;
    encryption_key_id?: string;
    unlock_at?: string;
    unlock_rule?: UnlockRule;
    heartbeat_timeout_days?: number;
    created_at: string;
    updated_at: string;
}

export interface Beneficiary {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    relationship?: string;
    created_at?: string;
}

export interface Receipt {
    id: string;
    vault_item_id?: string;
    receipt_type: string;
    snapshot_id: string;
    sha256: string;
    created_at: string;
    download_count: number;
    file_url?: string;
}

export type UnlockRequestStatus = 'pending' | 'approved' | 'declined' | 'expired';

export type UnlockRequestDecision = 'approved' | 'declined';

/**
 * A successor access request for a vault item whose release rule needs a
 * reviewed decision (custodian approval, or a verified passing with
 * documentation reviewed). Rows live in public.vault_unlock_requests.
 */
export interface UnlockRequest {
    id: string;
    vault_item_id: string;
    owner_user_id: string;
    requested_by_email: string;
    request_reason?: string | null;
    evidence_note?: string | null;
    status: UnlockRequestStatus;
    decided_by_email?: string | null;
    decided_at?: string | null;
    created_at: string;
    /** Present when the query embeds the parent item for display. */
    vault_items?: { title: string } | null;
}

export type ItemStatusFilter = 'ALL' | VaultItemStatus;

export interface LegacyConceptPreset {
    type: VaultItemType;
    title: string;
    payload: Record<string, unknown>;
    unlock_rule: UnlockRule;
    heartbeat_timeout_days?: number;
    is_encrypted?: boolean;
}

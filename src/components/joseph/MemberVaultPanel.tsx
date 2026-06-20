import { useEffect, useMemo, useState } from 'react';
import {
    Archive,
    CheckCircle2,
    Clock,
    FileText,
    Heart,
    Lock,
    Plus,
    Send,
    Shield,
    Vault,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { FamilyMember } from '../../lib/joseph/genealogy';

interface MemberVaultPanelProps {
    userId: string;
    member: FamilyMember;
}

type VaultType = 'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE';
type ItemStatus =
    | 'DRAFT'
    | 'SCHEDULED'
    | 'LOCKED'
    | 'PUBLISHED'
    | 'PAUSED'
    | 'SENT'
    | 'ARCHIVED';

interface LinkedItem {
    id: string;
    type: VaultType;
    title: string;
    status: ItemStatus;
    role: 'VIEWER' | 'CUSTODIAN' | 'EXECUTOR';
    unlock_at: string | null;
    updated_at: string;
}

interface BeneficiaryRow {
    id: string;
    email: string;
    name: string | null;
    relationship: string | null;
    metadata: Record<string, unknown> | null;
}

const TYPE_META: Record<VaultType, { label: string; icon: typeof Vault; color: string }> = {
    CAPSULE: { label: 'Capsule', icon: Archive, color: 'text-amber-300' },
    MEMORIAL: { label: 'Memorial', icon: Heart, color: 'text-rose-300' },
    WILL: { label: 'Will', icon: Shield, color: 'text-cyan-300' },
    MESSAGE: { label: 'Message', icon: Send, color: 'text-emerald-300' },
};

const STATUS_META: Record<ItemStatus, { label: string; icon: typeof Clock; cls: string }> = {
    DRAFT: { label: 'Draft', icon: FileText, cls: 'text-slate-400 border-white/10 bg-white/5' },
    SCHEDULED: {
        label: 'Scheduled',
        icon: Clock,
        cls: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
    },
    LOCKED: {
        label: 'Locked',
        icon: Lock,
        cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    },
    PUBLISHED: {
        label: 'Published',
        icon: CheckCircle2,
        cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    },
    PAUSED: { label: 'Paused', icon: Clock, cls: 'text-slate-400 border-white/10 bg-white/5' },
    SENT: {
        label: 'Sent',
        icon: Send,
        cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    },
    ARCHIVED: {
        label: 'Archived',
        icon: Archive,
        cls: 'text-slate-500 border-white/5 bg-white/[0.02]',
    },
};

function normalizeForCompare(s: string | null | undefined): string {
    return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Best-effort match: a beneficiary matches a family member when its
 * `metadata.familyMemberId` is explicitly set OR when name + relationship
 * line up. Without the explicit link, false matches across unrelated
 * people sharing a first name are still possible, so the UI is read-only
 * and the deterministic link is opt-in via the future "Link to vault" flow.
 */
function beneficiaryMatchesMember(
    beneficiary: BeneficiaryRow,
    member: FamilyMember,
): boolean {
    const meta = beneficiary.metadata || {};
    if (typeof meta.familyMemberId === 'string' && meta.familyMemberId === member.id) {
        return true;
    }
    const benName = normalizeForCompare(beneficiary.name);
    const memberFull = normalizeForCompare(`${member.firstName} ${member.lastName}`);
    if (benName && benName === memberFull) {
        const benRel = normalizeForCompare(beneficiary.relationship);
        const memberRel = normalizeForCompare(
            member.aiPersonality?.familyRole,
        );
        // If we know both relationships, require them to line up before we
        // declare a match — common given-name collisions otherwise yank
        // unrelated items into the panel.
        if (benRel && memberRel) return benRel === memberRel;
        return true;
    }
    return false;
}

export default function MemberVaultPanel({ userId, member }: MemberVaultPanelProps) {
    const navigate = useNavigate();
    const [items, setItems] = useState<LinkedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!userId || !member?.id || !supabase) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                // 1) Fetch every beneficiary on this user account.
                const { data: beneficiaries, error: benError } = await supabase
                    .from('beneficiaries')
                    .select('id, email, name, relationship, metadata')
                    .eq('user_id', userId);

                if (cancelled) return;
                if (benError) throw benError;

                const matched = (beneficiaries || []).filter((b) =>
                    beneficiaryMatchesMember(b as BeneficiaryRow, member),
                );

                if (matched.length === 0) {
                    if (!cancelled) {
                        setItems([]);
                        setLoading(false);
                    }
                    return;
                }

                // 2) Fetch every link + vault item where the beneficiary
                //    matches one of those rows.
                const matchedIds = matched.map((b) => b.id);
                const { data: links, error: linkError } = await supabase
                    .from('beneficiary_links')
                    .select(
                        `
                            role,
                            beneficiary_id,
                            vault_items!inner (
                                id,
                                type,
                                title,
                                status,
                                unlock_at,
                                updated_at,
                                user_id
                            )
                        `,
                    )
                    .in('beneficiary_id', matchedIds);

                if (cancelled) return;
                if (linkError) throw linkError;

                const flattened: LinkedItem[] = (links || [])
                    .flatMap((row: any) => {
                        const item = row.vault_items;
                        if (!item || item.user_id !== userId) return [];
                        return [
                            {
                                id: item.id,
                                type: item.type as VaultType,
                                title: item.title,
                                status: item.status as ItemStatus,
                                role: row.role as LinkedItem['role'],
                                unlock_at: item.unlock_at,
                                updated_at: item.updated_at,
                            },
                        ];
                    })
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

                if (!cancelled) {
                    setItems(flattened);
                    setLoading(false);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load vault items.');
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, member]);

    const groupedByType = useMemo(() => {
        const map: Record<VaultType, LinkedItem[]> = {
            CAPSULE: [],
            MEMORIAL: [],
            WILL: [],
            MESSAGE: [],
        };
        for (const item of items) map[item.type].push(item);
        return map;
    }, [items]);

    const totalCount = items.length;

    return (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Vault className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider">
                        Legacy vault items for this person
                    </span>
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums">
                    {loading ? '…' : `${totalCount} linked`}
                </span>
            </header>

            {error && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-300">
                    {error}
                </div>
            )}

            {!loading && totalCount === 0 && !error && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-3 py-3 text-[11px] text-slate-500">
                    No vault items addressed to{' '}
                    <span className="text-slate-300">{member.firstName}</span> yet.
                    Create a capsule, message, will, or memorial for them and
                    link them as a beneficiary.
                </div>
            )}

            {totalCount > 0 && (
                <div className="space-y-2">
                    {(Object.keys(groupedByType) as VaultType[]).map((type) => {
                        const list = groupedByType[type];
                        if (list.length === 0) return null;
                        const meta = TYPE_META[type];
                        const Icon = meta.icon;
                        return (
                            <div key={type} className="space-y-1">
                                <div className="flex items-center gap-1.5 px-1">
                                    <Icon className={`w-3 h-3 ${meta.color}`} />
                                    <span className="text-[9px] uppercase tracking-wider text-slate-500">
                                        {meta.label} · {list.length}
                                    </span>
                                </div>
                                <ul className="space-y-1">
                                    {list.map((item) => {
                                        const sMeta = STATUS_META[item.status];
                                        const SIcon = sMeta.icon;
                                        return (
                                            <li
                                                key={item.id}
                                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.025] hover:bg-white/[0.05] transition-colors"
                                            >
                                                <span className="text-xs text-white truncate min-w-0">
                                                    {item.title}
                                                </span>
                                                <span className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider hidden sm:inline">
                                                        {item.role}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] uppercase tracking-wider ${sMeta.cls}`}
                                                    >
                                                        <SIcon className="w-2.5 h-2.5" />
                                                        {sMeta.label}
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                onClick={() =>
                    navigate(
                        `/legacy-vault?prefillBeneficiaryName=${encodeURIComponent(
                            `${member.firstName} ${member.lastName}`,
                        )}&prefillFamilyMemberId=${encodeURIComponent(member.id)}`,
                    )
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 px-3 py-2 text-xs font-medium transition-colors"
            >
                <Plus className="w-3.5 h-3.5" />
                Create vault item for {member.firstName}
            </button>
        </section>
    );
}

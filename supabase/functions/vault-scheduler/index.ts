import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface VaultItemRow {
  id: string;
  user_id: string;
  type: 'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE';
  status: string;
  unlock_rule: 'DATE' | 'DEATH_CERT' | 'CUSTODIAN_APPROVAL' | 'HEARTBEAT_TIMEOUT' | null;
  unlock_at: string | null;
  heartbeat_timeout_days: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const nowDate = new Date();
    const now = nowDate.toISOString();
    let processed = 0;

    // Each release rule is evaluated independently; an item is released only
    // when its own trigger condition is verified. When a condition cannot be
    // verified the item stays SCHEDULED (sealed) and will be re-evaluated on
    // the next run, so the whole pass is safe to repeat.
    const eligibleItems: VaultItemRow[] = [];

    // Rule: DATE. Release once the chosen date has arrived.
    const { data: dateItems, error: dateError } = await supabase
      .from('vault_items')
      .select('id, user_id, type, status, unlock_rule, unlock_at, heartbeat_timeout_days')
      .eq('status', 'SCHEDULED')
      .eq('unlock_rule', 'DATE')
      .not('unlock_at', 'is', null)
      .lte('unlock_at', now);

    if (dateError) throw dateError;
    eligibleItems.push(...((dateItems || []) as VaultItemRow[]));

    // Rule: HEARTBEAT_TIMEOUT. Release after a period of account inactivity,
    // measured from the owner's last quiet check-in. Items without a
    // configured timeout, or whose owner has no check-in record, are skipped
    // because the inactivity condition cannot be verified.
    const { data: heartbeatItems, error: heartbeatError } = await supabase
      .from('vault_items')
      .select('id, user_id, type, status, unlock_rule, unlock_at, heartbeat_timeout_days')
      .eq('status', 'SCHEDULED')
      .eq('unlock_rule', 'HEARTBEAT_TIMEOUT')
      .not('heartbeat_timeout_days', 'is', null);

    if (heartbeatError) throw heartbeatError;

    const heartbeatRows = (heartbeatItems || []) as VaultItemRow[];
    if (heartbeatRows.length > 0) {
      const ownerIds = [...new Set(heartbeatRows.map((item) => item.user_id))];
      const { data: ownerProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, last_check_in_at')
        .in('id', ownerIds);

      if (profileError) throw profileError;

      const lastCheckInByOwner = new Map<string, string | null>(
        (ownerProfiles || []).map((profile: { id: string; last_check_in_at: string | null }) => [
          profile.id,
          profile.last_check_in_at,
        ]),
      );

      for (const item of heartbeatRows) {
        const timeoutDays = item.heartbeat_timeout_days;
        if (typeof timeoutDays !== 'number' || timeoutDays <= 0) continue;

        const lastCheckIn = lastCheckInByOwner.get(item.user_id);
        if (!lastCheckIn) continue;

        const lastCheckInMs = new Date(lastCheckIn).getTime();
        if (Number.isNaN(lastCheckInMs)) continue;

        if (nowDate.getTime() - lastCheckInMs > timeoutDays * MS_PER_DAY) {
          eligibleItems.push(item);
        }
      }
    }

    // Rules: DEATH_CERT and CUSTODIAN_APPROVAL. Both require a reviewed
    // decision: a verified passing (documentation reviewed) or custodian
    // approval, recorded as an approved row in vault_unlock_requests.
    // Pending or declined requests keep the item sealed until a custodian
    // or the owner reviews again.
    const { data: reviewItems, error: reviewError } = await supabase
      .from('vault_items')
      .select('id, user_id, type, status, unlock_rule, unlock_at, heartbeat_timeout_days')
      .eq('status', 'SCHEDULED')
      .in('unlock_rule', ['DEATH_CERT', 'CUSTODIAN_APPROVAL']);

    if (reviewError) throw reviewError;

    const reviewRows = (reviewItems || []) as VaultItemRow[];
    if (reviewRows.length > 0) {
      const reviewItemIds = reviewRows.map((item) => item.id);
      const { data: approvals, error: approvalError } = await supabase
        .from('vault_unlock_requests')
        .select('vault_item_id')
        .in('vault_item_id', reviewItemIds)
        .eq('status', 'approved');

      if (approvalError) throw approvalError;

      const approvedItemIds = new Set(
        (approvals || []).map((row: { vault_item_id: string }) => row.vault_item_id),
      );

      for (const item of reviewRows) {
        if (approvedItemIds.has(item.id)) {
          eligibleItems.push(item);
        }
      }
    }

    for (const item of eligibleItems) {
      if (item.type === 'MESSAGE') {
        // The status guard keeps the pass idempotent: a message already
        // delivered by a concurrent or earlier run is left untouched.
        const { data: updatedRows, error: updateError } = await supabase
          .from('vault_items')
          .update({
            status: 'SENT',
            delivered_at: now,
          })
          .eq('id', item.id)
          .eq('status', 'SCHEDULED')
          .select('id');

        if (updateError) {
          console.error(`Error updating message ${item.id}:`, updateError);
          continue;
        }
        if (!updatedRows || updatedRows.length === 0) continue;

        await supabase.from('vault_audit_logs').insert({
          user_id: item.user_id,
          vault_item_id: item.id,
          action: 'DELIVERED',
          details: { delivered_at: now, unlock_rule: item.unlock_rule },
        });

        processed++;
      } else if (item.type === 'CAPSULE' || item.type === 'WILL' || item.type === 'MEMORIAL') {
        const nextStatus = item.type === 'MEMORIAL' ? 'PUBLISHED' : 'LOCKED';
        const { data: updatedRows, error: updateError } = await supabase
          .from('vault_items')
          .update({
            status: nextStatus,
            locked_at: now,
          })
          .eq('id', item.id)
          .eq('status', 'SCHEDULED')
          .select('id');

        if (updateError) {
          console.error(`Error unlocking ${item.type} ${item.id}:`, updateError);
          continue;
        }
        if (!updatedRows || updatedRows.length === 0) continue;

        await supabase.from('vault_audit_logs').insert({
          user_id: item.user_id,
          vault_item_id: item.id,
          action: item.type === 'MEMORIAL' ? 'PUBLISHED' : 'UNLOCKED',
          details: { status: nextStatus, processed_at: now, unlock_rule: item.unlock_rule },
        });

        processed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        message: `Processed ${processed} scheduled items`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduler error:', error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

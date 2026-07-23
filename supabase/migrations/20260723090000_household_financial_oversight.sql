-- Household financial oversight.
-- St. Gabriel reviews a household only through Oversight Grants governed by
-- St. Michael. Every financial read resolves through one authorization
-- function at query time and fails closed. The audit trail is append-only
-- and tamper-evident. See docs/FAMILY_DATA_MODEL.md, section "Household
-- financial oversight", which documents this schema.

-- ------------------------------------------------------------------
-- Households and membership
-- ------------------------------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Primary household',
  trusted_contact_person_id uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_households_owner on public.households(owner_user_id);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid not null references public.family_members(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'adult' check (role in ('adult','minor','dependent_adult')),
  is_primary_earner boolean not null default false,
  dependency_weight numeric not null default 1.0 check (dependency_weight > 0),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create unique index if not exists idx_household_members_current
  on public.household_members(household_id, person_id) where left_at is null;
create index if not exists idx_household_members_person on public.household_members(person_id);

-- ------------------------------------------------------------------
-- Invitations. One invitation plus one reminder, then the product stops
-- asking permanently unless the subject re-opens the conversation.
-- ------------------------------------------------------------------

create table if not exists public.oversight_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  subject_person_id uuid not null references public.family_members(id) on delete cascade,
  requested_by_person_id uuid not null references public.family_members(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  requested_scope text not null check (requested_scope in
    ('balances_only','balances_and_obligations','balances_obligations_and_transactions','full_ledger')),
  purpose_statement text not null,
  created_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  responded_at timestamptz,
  response text check (response in ('accepted','declined')),
  reopened_at timestamptz,
  unique (household_id, subject_person_id)
);

create or replace function public.fn_oversight_invitation_guard()
returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.reminder_sent_at is not null
     and new.reminder_sent_at is distinct from old.reminder_sent_at then
    raise exception 'Only one reminder is ever sent for a coverage invitation.';
  end if;
  return new;
end $$;

drop trigger if exists trg_oversight_invitation_guard on public.oversight_invitations;
create trigger trg_oversight_invitation_guard
  before update on public.oversight_invitations
  for each row execute function public.fn_oversight_invitation_guard();

-- ------------------------------------------------------------------
-- Oversight grants
-- ------------------------------------------------------------------

create table if not exists public.oversight_grants (
  grant_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  subject_person_id uuid not null references public.family_members(id) on delete cascade,
  granted_by_person_id uuid not null references public.family_members(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete set null,
  authority_basis text not null check (authority_basis in
    ('self','guardian_of_minor','power_of_attorney','trustee','court_appointed_guardian','executor_or_administrator')),
  authority_document_id uuid references public.vault_items(id) on delete restrict,
  authority_document_label text,
  scope text not null check (scope in
    ('balances_only','balances_and_obligations','balances_obligations_and_transactions','full_ledger')),
  included_account_ids uuid[] not null default '{}',
  purpose_statement text not null,
  granted_at timestamptz not null default now(),
  effective_from timestamptz not null default now(),
  expires_at timestamptz not null,
  review_due_at timestamptz,
  revoked_at timestamptz,
  revoked_by_person_id uuid references public.family_members(id),
  revocation_reason text,
  suspended_at timestamptz,
  suspension_reason text,
  closed_by_passing_at timestamptz,
  verification_method text not null,
  verification_event_id uuid,
  -- Rule 4: proxy authority never exists on assertion alone.
  constraint oversight_proxy_requires_document
    check (authority_basis = 'self' or authority_document_id is not null),
  constraint oversight_expiry_after_start check (expires_at > effective_from),
  constraint oversight_verification_present check (length(trim(verification_method)) > 0)
);

create index if not exists idx_oversight_grants_household on public.oversight_grants(household_id);
create index if not exists idx_oversight_grants_subject on public.oversight_grants(subject_person_id);

-- Rule 7: minors age into their own consent. Guardian grants are clamped to
-- the subject's age of majority when the birth date is known.
create or replace function public.fn_oversight_guardian_clamp()
returns trigger
language plpgsql as $$
declare
  v_birth date;
  v_majority timestamptz;
begin
  if new.authority_basis = 'guardian_of_minor' then
    select birth_date into v_birth from public.family_members where id = new.subject_person_id;
    if v_birth is not null then
      v_majority := (v_birth + interval '18 years')::timestamptz;
      if new.expires_at > v_majority then
        new.expires_at := v_majority;
      end if;
      if new.review_due_at is null or new.review_due_at > v_majority then
        new.review_due_at := v_majority - interval '30 days';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_oversight_guardian_clamp on public.oversight_grants;
create trigger trg_oversight_guardian_clamp
  before insert or update on public.oversight_grants
  for each row execute function public.fn_oversight_guardian_clamp();

-- ------------------------------------------------------------------
-- Financial accounts and snapshots. Metadata and holder lists here; values
-- live only in append-only snapshots. Provider linking stores read-only
-- token references, never raw credentials.
-- ------------------------------------------------------------------

create table if not exists public.financial_account_links (
  account_id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  account_label text not null,
  account_kind text not null default 'depository' check (account_kind in
    ('depository','investment','credit','loan','mortgage','other')),
  holders uuid[] not null,
  currency text not null default 'USD',
  provider text not null default 'manual',
  provider_item_ref text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint financial_account_has_holder check (array_length(holders, 1) >= 1)
);

create index if not exists idx_financial_accounts_household on public.financial_account_links(household_id);

create table if not exists public.financial_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.financial_account_links(account_id) on delete cascade,
  as_of timestamptz not null default now(),
  balance numeric not null,
  total_obligation numeric not null default 0,
  recorded_by_user_id uuid not null references auth.users(id)
);

create index if not exists idx_financial_snapshots_account on public.financial_account_snapshots(account_id, as_of desc);

-- ------------------------------------------------------------------
-- Append-only, tamper-evident audit trail
-- ------------------------------------------------------------------

create table if not exists public.oversight_audit_events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  grant_id uuid,
  subject_person_id uuid,
  actor_user_id uuid,
  event_type text not null check (event_type in (
    'grant_created','grant_scope_changed','grant_renewed','grant_expired','grant_revoked',
    'grant_suspended','grant_reinstated','grant_closed_by_passing',
    'invitation_sent','invitation_reminder','invitation_accepted','invitation_declined','invitation_reopened',
    'financial_read','attestation_export','break_glass_access','exploitation_flag_raised',
    'majority_notice','expiry_notice','review_due_notice')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  prev_hash text not null default '',
  event_hash text not null default ''
);

create index if not exists idx_oversight_audit_household on public.oversight_audit_events(household_id, id);
create index if not exists idx_oversight_audit_subject on public.oversight_audit_events(subject_person_id);

create or replace function public.fn_oversight_audit_chain()
returns trigger
language plpgsql as $$
declare
  v_prev text;
begin
  -- Serialize per household so the chain never forks under concurrency.
  perform pg_advisory_xact_lock(hashtext(new.household_id::text));
  select event_hash into v_prev
    from public.oversight_audit_events
   where household_id = new.household_id
   order by id desc limit 1;
  new.prev_hash := coalesce(v_prev, '');
  new.created_at := coalesce(new.created_at, now());
  new.event_hash := encode(sha256(convert_to(
    new.prev_hash || '|' || new.event_type || '|' || new.detail::text || '|' || new.created_at::text,
    'utf8')), 'hex');
  return new;
end $$;

drop trigger if exists trg_oversight_audit_chain on public.oversight_audit_events;
create trigger trg_oversight_audit_chain
  before insert on public.oversight_audit_events
  for each row execute function public.fn_oversight_audit_chain();

create or replace function public.fn_oversight_audit_append_only()
returns trigger
language plpgsql as $$
begin
  raise exception 'The oversight audit trail is append-only. % is not permitted.', tg_op;
end $$;

drop trigger if exists trg_oversight_audit_append_only on public.oversight_audit_events;
create trigger trg_oversight_audit_append_only
  before update or delete on public.oversight_audit_events
  for each row execute function public.fn_oversight_audit_append_only();

-- ------------------------------------------------------------------
-- Alerts. Every coverage lifecycle alert is written for both sides.
-- ------------------------------------------------------------------

create table if not exists public.oversight_alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  grant_id uuid,
  subject_person_id uuid,
  alert_type text not null check (alert_type in (
    'coverage_expiring','coverage_revoked','coverage_suspended','proxy_review_due',
    'new_grant_created','member_reaching_majority','relationship_change_suspension',
    'exploitation_flag','break_glass_notice')),
  audience text not null check (audience in ('subject','grantee','trusted_contact')),
  recipient_user_id uuid,
  message text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  dedupe_key text
);

create unique index if not exists idx_oversight_alerts_dedupe
  on public.oversight_alerts(dedupe_key) where dedupe_key is not null;
create index if not exists idx_oversight_alerts_household on public.oversight_alerts(household_id, created_at desc);

-- Helper: write one alert to both sides (and the trusted contact when asked).
create or replace function public.fn_oversight_alert_both_sides(
  p_household uuid, p_grant uuid, p_subject uuid, p_type text, p_message text,
  p_include_trusted boolean default false, p_dedupe text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_owner uuid;
  v_subject_user uuid;
  v_trusted uuid;
begin
  select owner_user_id, trusted_contact_person_id into v_owner, v_trusted
    from public.households where id = p_household;
  select subject_user_id into v_subject_user
    from public.oversight_grants where grant_id = p_grant;

  insert into public.oversight_alerts
      (household_id, grant_id, subject_person_id, alert_type, audience, recipient_user_id, message, dedupe_key)
    values
      (p_household, p_grant, p_subject, p_type, 'subject', v_subject_user, p_message,
       case when p_dedupe is null then null else p_dedupe || ':subject' end)
    on conflict do nothing;

  insert into public.oversight_alerts
      (household_id, grant_id, subject_person_id, alert_type, audience, recipient_user_id, message, dedupe_key)
    values
      (p_household, p_grant, p_subject, p_type, 'grantee', v_owner, p_message,
       case when p_dedupe is null then null else p_dedupe || ':grantee' end)
    on conflict do nothing;

  if p_include_trusted and v_trusted is not null then
    insert into public.oversight_alerts
        (household_id, grant_id, subject_person_id, alert_type, audience, recipient_user_id, message, dedupe_key)
      values
        (p_household, p_grant, p_subject, p_type, 'trusted_contact', null, p_message,
         case when p_dedupe is null then null else p_dedupe || ':trusted' end)
      on conflict do nothing;
  end if;
end $$;

-- ------------------------------------------------------------------
-- THE authorization gate. Every financial read resolves through this
-- function at query time. Missing, expired, revoked, suspended, or closed
-- grants yield no rows: fail closed, no bypass path.
-- ------------------------------------------------------------------

create or replace function public.fn_oversight_active_grants(p_household uuid)
returns setof public.oversight_grants
language sql
stable
security definer
set search_path = public, pg_temp as $$
  select g.* from public.oversight_grants g
   where g.household_id = p_household
     and g.revoked_at is null
     and g.suspended_at is null
     and g.closed_by_passing_at is null
     and g.effective_from <= now()
     and now() < g.expires_at;
$$;

-- Who may look at a household's coverage surfaces at all: the tree owner,
-- a linked household member, or a linked grant subject.
create or replace function public.fn_oversight_viewer_allowed(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp as $$
  select exists (select 1 from public.households h where h.id = p_household and h.owner_user_id = auth.uid())
      or exists (select 1 from public.household_members hm
                  where hm.household_id = p_household and hm.member_user_id = auth.uid() and hm.left_at is null)
      or exists (select 1 from public.oversight_grants g
                  where g.household_id = p_household and g.subject_user_id = auth.uid());
$$;

-- ------------------------------------------------------------------
-- Row level security. Direct table access is deliberately narrow; financial
-- values cross person boundaries only through the definer RPCs below.
-- ------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.oversight_invitations enable row level security;
alter table public.oversight_grants enable row level security;
alter table public.financial_account_links enable row level security;
alter table public.financial_account_snapshots enable row level security;
alter table public.oversight_audit_events enable row level security;
alter table public.oversight_alerts enable row level security;

drop policy if exists households_owner_all on public.households;
create policy households_owner_all on public.households
  for all using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists household_members_read on public.household_members;
create policy household_members_read on public.household_members
  for select using (public.fn_oversight_viewer_allowed(household_id));
drop policy if exists household_members_owner_write on public.household_members;
create policy household_members_owner_write on public.household_members
  for all using (exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid())))
  with check (exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid())));

drop policy if exists oversight_invitations_read on public.oversight_invitations;
create policy oversight_invitations_read on public.oversight_invitations
  for select using (public.fn_oversight_viewer_allowed(household_id));

-- Only the subject may re-open a declined invitation. The steward cannot,
-- which is what keeps the one-invitation-plus-one-reminder cap meaningful.
drop policy if exists oversight_invitations_subject_reopen on public.oversight_invitations;
create policy oversight_invitations_subject_reopen on public.oversight_invitations
  for update using (
    exists (select 1 from public.household_members hm
             where hm.household_id = oversight_invitations.household_id
               and hm.person_id = oversight_invitations.subject_person_id
               and hm.member_user_id = (select auth.uid())
               and hm.left_at is null))
  with check (
    exists (select 1 from public.household_members hm
             where hm.household_id = oversight_invitations.household_id
               and hm.person_id = oversight_invitations.subject_person_id
               and hm.member_user_id = (select auth.uid())
               and hm.left_at is null));

-- Rule 3: the subject's watcher list can never be hidden. Grants rows are
-- readable by every allowed viewer of the household, and by the subject's
-- own linked account regardless of any other role's preference.
drop policy if exists oversight_grants_read on public.oversight_grants;
create policy oversight_grants_read on public.oversight_grants
  for select using (
    public.fn_oversight_viewer_allowed(household_id)
    or subject_user_id = (select auth.uid())
  );

drop policy if exists financial_accounts_read on public.financial_account_links;
create policy financial_accounts_read on public.financial_account_links
  for select using (created_by_user_id = (select auth.uid()));

drop policy if exists financial_snapshots_read on public.financial_account_snapshots;
create policy financial_snapshots_read on public.financial_account_snapshots
  for select using (recorded_by_user_id = (select auth.uid()));

-- Rule 9: the subject can always read their own audit trail; the owner reads
-- the household's. Nobody updates or deletes (triggers reject it anyway).
drop policy if exists oversight_audit_read on public.oversight_audit_events;
create policy oversight_audit_read on public.oversight_audit_events
  for select using (
    exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid()))
    or exists (select 1 from public.oversight_grants g
                where g.grant_id = oversight_audit_events.grant_id and g.subject_user_id = (select auth.uid()))
    or exists (select 1 from public.household_members hm
                where hm.household_id = oversight_audit_events.household_id
                  and hm.person_id = oversight_audit_events.subject_person_id
                  and hm.member_user_id = (select auth.uid()))
  );

drop policy if exists oversight_alerts_read on public.oversight_alerts;
create policy oversight_alerts_read on public.oversight_alerts
  for select using (public.fn_oversight_viewer_allowed(household_id));

-- ------------------------------------------------------------------
-- Relationship changes break grants (rule 6), passing closes them (rule 8).
-- ------------------------------------------------------------------

create or replace function public.fn_oversight_suspend_on_member_left()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  g record;
begin
  if new.left_at is not null and old.left_at is null then
    for g in
      update public.oversight_grants
         set suspended_at = now(),
             suspension_reason = 'Household membership ended; explicit re-consent required.'
       where household_id = new.household_id
         and suspended_at is null and revoked_at is null and closed_by_passing_at is null
         and (subject_person_id = new.person_id or granted_by_person_id = new.person_id)
       returning *
    loop
      insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
      values (g.household_id, g.grant_id, g.subject_person_id, auth.uid(), 'grant_suspended',
              jsonb_build_object('reason', g.suspension_reason));
      perform public.fn_oversight_alert_both_sides(
        g.household_id, g.grant_id, g.subject_person_id, 'relationship_change_suspension',
        'A household relationship change paused this oversight authorization. It stays paused until consent is given again.');
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists trg_oversight_member_left on public.household_members;
create trigger trg_oversight_member_left
  after update on public.household_members
  for each row execute function public.fn_oversight_suspend_on_member_left();

create or replace function public.fn_oversight_suspend_on_link_removed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  g record;
begin
  if old.link_type = 'spouse' then
    for g in
      update public.oversight_grants
         set suspended_at = now(),
             suspension_reason = 'The relationship this authorization rested on ended; explicit re-consent required.'
       where suspended_at is null and revoked_at is null and closed_by_passing_at is null
         and authority_basis <> 'self'
         and ((subject_person_id = old.from_member_id and granted_by_person_id = old.to_member_id)
           or (subject_person_id = old.to_member_id and granted_by_person_id = old.from_member_id))
       returning *
    loop
      insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
      values (g.household_id, g.grant_id, g.subject_person_id, auth.uid(), 'grant_suspended',
              jsonb_build_object('reason', g.suspension_reason));
      perform public.fn_oversight_alert_both_sides(
        g.household_id, g.grant_id, g.subject_person_id, 'relationship_change_suspension',
        'A relationship change paused this oversight authorization. It stays paused until consent is given again.');
    end loop;
  end if;
  return old;
end $$;

drop trigger if exists trg_oversight_link_removed on public.family_member_links;
create trigger trg_oversight_link_removed
  after delete on public.family_member_links
  for each row execute function public.fn_oversight_suspend_on_link_removed();

create or replace function public.fn_oversight_close_on_passing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  g record;
begin
  if new.death_date is not null and old.death_date is null then
    for g in
      update public.oversight_grants
         set closed_by_passing_at = now()
       where subject_person_id = new.id
         and closed_by_passing_at is null and revoked_at is null
       returning *
    loop
      insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
      values (g.household_id, g.grant_id, g.subject_person_id, auth.uid(), 'grant_closed_by_passing',
              jsonb_build_object('note',
                'Verified passing closed this authorization. Further access follows the Inheritance and Legacy Vault path under a documented executor or administrator instrument.'));
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists trg_oversight_close_on_passing on public.family_members;
create trigger trg_oversight_close_on_passing
  after update on public.family_members
  for each row execute function public.fn_oversight_close_on_passing();

-- ------------------------------------------------------------------
-- RPCs. All SECURITY DEFINER with a pinned search path; execution granted to
-- authenticated users only. Every financial value crosses person boundaries
-- only through these, and only via fn_oversight_active_grants.
-- ------------------------------------------------------------------

-- Ensure a household exists for the caller and membership mirrors the tree.
-- p_self_person is the canonical person id of the caller's own node on the
-- tree (the product's primary-member heuristic), so the caller's account is
-- bound to their person and subject-side rights work from their own login.
create or replace function public.rpc_oversight_bootstrap(p_self_person uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
begin
  if v_uid is null then
    raise exception 'Sign in required.';
  end if;

  select id into v_household from public.households where owner_user_id = v_uid order by created_at limit 1;
  if v_household is null then
    insert into public.households (owner_user_id) values (v_uid) returning id into v_household;
  end if;

  insert into public.household_members (household_id, person_id, role, dependency_weight)
  select v_household, fm.id,
         case
           when fm.birth_date is not null and fm.birth_date > (current_date - interval '18 years') then 'minor'
           else 'adult'
         end,
         case
           when fm.birth_date is not null and fm.birth_date > (current_date - interval '18 years') then 0.6
           else 1.0
         end
    from public.family_members fm
   where fm.user_id = v_uid
     and fm.legacy_id is not null
     and not exists (select 1 from public.household_members hm
                      where hm.household_id = v_household and hm.person_id = fm.id and hm.left_at is null)
  on conflict do nothing;

  if p_self_person is not null then
    update public.household_members hm
       set member_user_id = v_uid
      from public.family_members fm
     where hm.household_id = v_household
       and hm.person_id = p_self_person
       and fm.id = hm.person_id
       and fm.user_id = v_uid
       and hm.member_user_id is null;
  end if;

  return public.rpc_oversight_overview(v_household);
end $$;

-- Coverage facts (no financial values): household, members, grants,
-- invitations, account metadata the caller may see, and current alerts.
create or replace function public.rpc_oversight_overview(p_household uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.fn_oversight_viewer_allowed(p_household) then
    raise exception 'Not authorized for this household.';
  end if;

  return jsonb_build_object(
    'household', (select jsonb_build_object('id', h.id, 'name', h.name,
                        'owner_user_id', h.owner_user_id,
                        'trusted_contact_person_id', h.trusted_contact_person_id)
                    from public.households h where h.id = p_household),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
                  'person_id', hm.person_id,
                  'client_id', fm.legacy_id,
                  'full_name', trim(coalesce(fm.first_name,'') || ' ' || coalesce(fm.last_name,'')),
                  'role', hm.role,
                  'birth_date', fm.birth_date,
                  'death_date', fm.death_date,
                  'dependency_weight', hm.dependency_weight,
                  'is_primary_earner', hm.is_primary_earner,
                  'is_account_holder_self', (hm.member_user_id = v_uid)))
                from public.household_members hm
                join public.family_members fm on fm.id = hm.person_id
               where hm.household_id = p_household and hm.left_at is null), '[]'::jsonb),
    'grants', coalesce((select jsonb_agg(to_jsonb(g)) from public.oversight_grants g
               where g.household_id = p_household), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(to_jsonb(i)) from public.oversight_invitations i
               where i.household_id = p_household), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object(
                  'account_id', a.account_id,
                  'institution_name', a.institution_name,
                  'account_label', a.account_label,
                  'account_kind', a.account_kind,
                  'holders', a.holders,
                  'currency', a.currency,
                  'is_active', a.is_active))
                from public.financial_account_links a
               where a.household_id = p_household and a.is_active
                 and (a.created_by_user_id = v_uid
                      or exists (select 1 from public.fn_oversight_active_grants(p_household) g
                                  where a.account_id = any(g.included_account_ids)))), '[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(to_jsonb(al) order by al.created_at desc)
                from (select * from public.oversight_alerts
                       where household_id = p_household
                       order by created_at desc limit 40) al), '[]'::jsonb)
  );
end $$;

-- The audited financial read. Returns per-holder authorized account views
-- built under rule 10, plus per-member aggregates, from live grants only.
create or replace function public.rpc_oversight_picture(p_household uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_views jsonb;
  v_grants_used uuid[];
  g uuid;
begin
  if not public.fn_oversight_viewer_allowed(p_household) then
    raise exception 'Not authorized for this household.';
  end if;

  with latest as (
    select distinct on (s.account_id) s.account_id, s.balance, s.total_obligation, s.as_of
      from public.financial_account_snapshots s
      join public.financial_account_links a on a.account_id = s.account_id
     where a.household_id = p_household
     order by s.account_id, s.as_of desc
  ),
  holder_grants as (
    select a.account_id, a.account_label, a.institution_name, a.account_kind,
           a.holders, holder, g.grant_id, g.scope,
           l.balance, l.total_obligation, l.as_of,
           cardinality(a.holders) as holder_count
      from public.financial_account_links a
      join latest l on l.account_id = a.account_id
      cross join lateral unnest(a.holders) as holder
      join public.fn_oversight_active_grants(p_household) g
        on g.subject_person_id = holder
       and a.account_id = any(g.included_account_ids)
     where a.household_id = p_household and a.is_active
  ),
  coverage as (
    select hg.*,
           (select count(*) from holder_grants x where x.account_id = hg.account_id) = hg.holder_count as fully_covered
      from holder_grants hg
  )
  select jsonb_agg(jsonb_build_object(
           'account_id', c.account_id,
           'account_label', c.account_label,
           'institution_name', c.institution_name,
           'account_kind', c.account_kind,
           'holder_person_id', c.holder,
           'grant_id', c.grant_id,
           'scope', c.scope,
           'fully_covered', c.fully_covered,
           'authorized_balance', round((c.balance / c.holder_count)::numeric, 2),
           'authorized_obligation', case when c.scope = 'balances_only' then 0
                                         else round((c.total_obligation / c.holder_count)::numeric, 2) end,
           'as_of', c.as_of)),
         array_agg(distinct c.grant_id)
    into v_views, v_grants_used
    from coverage c;

  -- Rule 1 and rule 9: every actual read is logged against the grant used.
  if v_grants_used is not null then
    foreach g in array v_grants_used loop
      insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
      select p_household, og.grant_id, og.subject_person_id, v_uid, 'financial_read',
             jsonb_build_object('surface', 'household_picture')
        from public.oversight_grants og where og.grant_id = g;
    end loop;
  end if;

  return jsonb_build_object('views', coalesce(v_views, '[]'::jsonb));
end $$;

-- Invitation: request coverage from the tree. No silent enrollment.
create or replace function public.rpc_oversight_request_coverage(
  p_household uuid, p_subject_person uuid, p_requested_by uuid, p_scope text, p_purpose text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_existing public.oversight_invitations;
begin
  if not exists (select 1 from public.households h where h.id = p_household and h.owner_user_id = v_uid) then
    raise exception 'Only the household steward can send a coverage invitation.';
  end if;
  select * into v_existing from public.oversight_invitations
   where household_id = p_household and subject_person_id = p_subject_person;
  if found then
    if v_existing.response = 'declined' and v_existing.reopened_at is null then
      raise exception 'This member declined coverage. The product will not ask again unless they re-open the conversation.';
    end if;
    return v_existing.invitation_id;
  end if;
  insert into public.oversight_invitations
      (household_id, subject_person_id, requested_by_person_id, owner_user_id, requested_scope, purpose_statement)
    values (p_household, p_subject_person, p_requested_by, v_uid, p_scope, p_purpose)
    returning invitation_id into v_id;
  insert into public.oversight_audit_events (household_id, subject_person_id, actor_user_id, event_type, detail)
  values (p_household, p_subject_person, v_uid, 'invitation_sent', jsonb_build_object('scope', p_scope));
  return v_id;
end $$;

create or replace function public.rpc_oversight_remind(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_inv public.oversight_invitations;
begin
  select * into v_inv from public.oversight_invitations where invitation_id = p_invitation;
  if not found then raise exception 'Invitation not found.'; end if;
  if not exists (select 1 from public.households h where h.id = v_inv.household_id and h.owner_user_id = auth.uid()) then
    raise exception 'Only the household steward can send the reminder.';
  end if;
  if v_inv.responded_at is not null then
    raise exception 'This invitation has already been answered.';
  end if;
  update public.oversight_invitations set reminder_sent_at = now() where invitation_id = p_invitation;
  insert into public.oversight_audit_events (household_id, subject_person_id, actor_user_id, event_type, detail)
  values (v_inv.household_id, v_inv.subject_person_id, auth.uid(), 'invitation_reminder', '{}'::jsonb);
end $$;

-- Respond to an invitation. Acceptance creates a self-basis grant. When the
-- subject answers from their own signed-in account the verification is the
-- session itself; when the household steward records an in-person answer,
-- a concrete verification method must be stated.
create or replace function public.rpc_oversight_respond(
  p_invitation uuid, p_accept boolean, p_scope text, p_account_ids uuid[],
  p_expires_at timestamptz, p_verification text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.oversight_invitations;
  v_is_subject boolean;
  v_is_owner boolean;
  v_grant uuid;
  v_verification text;
begin
  select * into v_inv from public.oversight_invitations where invitation_id = p_invitation;
  if not found then raise exception 'Invitation not found.'; end if;
  if v_inv.responded_at is not null and v_inv.reopened_at is null then
    raise exception 'This invitation has already been answered.';
  end if;

  v_is_owner := exists (select 1 from public.households h where h.id = v_inv.household_id and h.owner_user_id = v_uid);
  v_is_subject := exists (select 1 from public.household_members hm
                           where hm.household_id = v_inv.household_id
                             and hm.person_id = v_inv.subject_person_id
                             and hm.member_user_id = v_uid);
  if not (v_is_owner or v_is_subject) then
    raise exception 'Only the invited member or the household steward may record the answer.';
  end if;

  update public.oversight_invitations
     set responded_at = now(), response = case when p_accept then 'accepted' else 'declined' end
   where invitation_id = p_invitation;

  if not p_accept then
    insert into public.oversight_audit_events (household_id, subject_person_id, actor_user_id, event_type, detail)
    values (v_inv.household_id, v_inv.subject_person_id, v_uid, 'invitation_declined', '{}'::jsonb);
    return null;
  end if;

  if v_is_subject then
    v_verification := 'authenticated_session';
  else
    v_verification := nullif(trim(coalesce(p_verification, '')), '');
    if v_verification is null then
      raise exception 'State how the member''s consent was verified, for example verified_in_person or verified_by_phone.';
    end if;
  end if;

  insert into public.oversight_grants
      (household_id, subject_person_id, granted_by_person_id, owner_user_id, subject_user_id,
       authority_basis, scope, included_account_ids, purpose_statement,
       expires_at, review_due_at, verification_method)
    values
      (v_inv.household_id, v_inv.subject_person_id, v_inv.subject_person_id, v_inv.owner_user_id,
       case when v_is_subject then v_uid else null end,
       'self', coalesce(p_scope, v_inv.requested_scope), coalesce(p_account_ids, '{}'),
       v_inv.purpose_statement,
       coalesce(p_expires_at, now() + interval '12 months'),
       coalesce(p_expires_at, now() + interval '12 months') - interval '30 days',
       v_verification)
    returning grant_id into v_grant;

  insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
  values (v_inv.household_id, v_grant, v_inv.subject_person_id, v_uid, 'grant_created',
          jsonb_build_object('basis','self','via','invitation'));
  perform public.fn_oversight_alert_both_sides(v_inv.household_id, v_grant, v_inv.subject_person_id,
          'new_grant_created', 'A new financial oversight authorization was created with the member''s consent.');
  return v_grant;
end $$;

-- Direct self grant (the signed-in member covering their own node, or the
-- steward recording a member's directly-given consent with verification).
create or replace function public.rpc_oversight_grant_self(
  p_household uuid, p_subject_person uuid, p_scope text, p_account_ids uuid[],
  p_purpose text, p_expires_at timestamptz, p_verification text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean;
  v_is_subject boolean;
  v_verification text;
  v_grant uuid;
  v_owner uuid;
begin
  select owner_user_id into v_owner from public.households where id = p_household;
  if v_owner is null then raise exception 'Household not found.'; end if;
  v_is_owner := v_owner = v_uid;
  v_is_subject := exists (select 1 from public.household_members hm
                           where hm.household_id = p_household
                             and hm.person_id = p_subject_person
                             and hm.member_user_id = v_uid);
  if not (v_is_owner or v_is_subject) then
    raise exception 'Only the member or the household steward can create this coverage.';
  end if;

  if v_is_subject then
    v_verification := 'authenticated_session';
  else
    v_verification := nullif(trim(coalesce(p_verification, '')), '');
    if v_verification is null then
      raise exception 'State how the member''s consent was verified, for example verified_in_person or verified_by_phone.';
    end if;
  end if;

  insert into public.oversight_grants
      (household_id, subject_person_id, granted_by_person_id, owner_user_id, subject_user_id,
       authority_basis, scope, included_account_ids, purpose_statement,
       expires_at, review_due_at, verification_method)
    values
      (p_household, p_subject_person, p_subject_person, v_owner,
       case when v_is_subject then v_uid else null end,
       'self', p_scope, coalesce(p_account_ids, '{}'), p_purpose,
       coalesce(p_expires_at, now() + interval '12 months'),
       coalesce(p_expires_at, now() + interval '12 months') - interval '30 days',
       v_verification)
    returning grant_id into v_grant;

  insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
  values (p_household, v_grant, p_subject_person, v_uid, 'grant_created', jsonb_build_object('basis','self'));
  perform public.fn_oversight_alert_both_sides(p_household, v_grant, p_subject_person,
          'new_grant_created', 'A new financial oversight authorization was created with the member''s consent.');
  return v_grant;
end $$;

-- Proxy grant. Rule 4: refused without a linked Legacy Vault instrument.
create or replace function public.rpc_oversight_grant_proxy(
  p_household uuid, p_subject_person uuid, p_granted_by_person uuid, p_basis text,
  p_document uuid, p_document_label text, p_scope text, p_account_ids uuid[],
  p_purpose text, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_grant uuid;
begin
  select owner_user_id into v_owner from public.households where id = p_household;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Only the household steward can record a proxy authorization.';
  end if;
  if p_basis = 'self' then
    raise exception 'Use the self-consent path for direct consent.';
  end if;
  if p_document is null then
    raise exception 'Proxy authority requires a documented instrument in the Legacy Vault: guardianship, power of attorney, trusteeship, court appointment, or letters testamentary.';
  end if;
  if not exists (select 1 from public.vault_items v where v.id = p_document and v.user_id = v_uid) then
    raise exception 'The referenced instrument was not found in this account''s Legacy Vault.';
  end if;

  insert into public.oversight_grants
      (household_id, subject_person_id, granted_by_person_id, owner_user_id,
       authority_basis, authority_document_id, authority_document_label,
       scope, included_account_ids, purpose_statement,
       expires_at, review_due_at, verification_method)
    values
      (p_household, p_subject_person, p_granted_by_person, v_owner,
       p_basis, p_document, p_document_label,
       p_scope, coalesce(p_account_ids, '{}'), p_purpose,
       coalesce(p_expires_at, now() + interval '12 months'),
       least(coalesce(p_expires_at, now() + interval '12 months') - interval '30 days', now() + interval '11 months'),
       'documented_instrument_on_file')
    returning grant_id into v_grant;

  insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
  values (p_household, v_grant, p_subject_person, v_uid, 'grant_created',
          jsonb_build_object('basis', p_basis, 'document_id', p_document));
  perform public.fn_oversight_alert_both_sides(p_household, v_grant, p_subject_person,
          'new_grant_created', 'A proxy financial oversight authorization was recorded with its instrument on file.');
  return v_grant;
end $$;

-- Rule 2: revocation is instant, needs no approval and no explanation.
create or replace function public.rpc_oversight_revoke(p_grant uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_g public.oversight_grants;
  v_allowed boolean;
begin
  select * into v_g from public.oversight_grants where grant_id = p_grant;
  if not found then raise exception 'Authorization not found.'; end if;
  if v_g.revoked_at is not null then return; end if;

  v_allowed := (v_g.subject_user_id is not null and v_g.subject_user_id = v_uid)
    or v_g.owner_user_id = v_uid
    or exists (select 1 from public.household_members hm
                where hm.household_id = v_g.household_id
                  and hm.person_id = v_g.subject_person_id
                  and hm.member_user_id = v_uid);
  if not v_allowed then
    raise exception 'Only the covered member or the household steward can end this authorization.';
  end if;

  update public.oversight_grants
     set revoked_at = now(),
         revoked_by_person_id = case when v_g.owner_user_id = v_uid and (v_g.subject_user_id is null or v_g.subject_user_id <> v_uid)
                                     then v_g.granted_by_person_id else v_g.subject_person_id end,
         revocation_reason = nullif(trim(coalesce(p_reason, '')), '')
   where grant_id = p_grant;

  insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, actor_user_id, event_type, detail)
  values (v_g.household_id, p_grant, v_g.subject_person_id, v_uid, 'grant_revoked',
          jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));
  perform public.fn_oversight_alert_both_sides(v_g.household_id, p_grant, v_g.subject_person_id,
          'coverage_revoked', 'A financial oversight authorization was revoked. Gabriel no longer sees this member''s accounts anywhere in the product.');
end $$;

-- Manual account management. Values enter only through snapshots.
create or replace function public.rpc_oversight_account_upsert(
  p_household uuid, p_account uuid, p_institution text, p_label text,
  p_kind text, p_holders uuid[], p_currency text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if not public.fn_oversight_viewer_allowed(p_household) then
    raise exception 'Not authorized for this household.';
  end if;
  if p_account is null then
    insert into public.financial_account_links
        (household_id, created_by_user_id, institution_name, account_label, account_kind, holders, currency)
      values (p_household, v_uid, p_institution, p_label, p_kind, p_holders, coalesce(p_currency, 'USD'))
      returning account_id into v_id;
    return v_id;
  end if;
  update public.financial_account_links
     set institution_name = p_institution, account_label = p_label,
         account_kind = p_kind, holders = p_holders, currency = coalesce(p_currency, currency)
   where account_id = p_account and created_by_user_id = v_uid
   returning account_id into v_id;
  if v_id is null then
    raise exception 'Only the person who added an account can edit it.';
  end if;
  return v_id;
end $$;

create or replace function public.rpc_oversight_snapshot_add(
  p_account uuid, p_balance numeric, p_obligation numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.financial_account_links a
                  where a.account_id = p_account and a.created_by_user_id = v_uid) then
    raise exception 'Only the person who added an account can record its values.';
  end if;
  insert into public.financial_account_snapshots (account_id, balance, total_obligation, recorded_by_user_id)
  values (p_account, p_balance, coalesce(p_obligation, 0), v_uid);
end $$;

-- Consent receipt export. The receipt itself is composed client side from
-- these live facts; the export is a logged event.
create or replace function public.rpc_oversight_receipt(p_household uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.fn_oversight_viewer_allowed(p_household) then
    raise exception 'Not authorized for this household.';
  end if;
  insert into public.oversight_audit_events (household_id, actor_user_id, event_type, detail)
  values (p_household, v_uid, 'attestation_export', jsonb_build_object('kind', 'consent_receipt'));
  return public.rpc_oversight_overview(p_household);
end $$;

-- The subject-readable audit trail.
create or replace function public.rpc_oversight_audit(p_household uuid, p_limit int default 200)
returns setof public.oversight_audit_events
language sql
stable
security definer
set search_path = public, pg_temp as $$
  select e.* from public.oversight_audit_events e
   where e.household_id = p_household
     and public.fn_oversight_viewer_allowed(p_household)
   order by e.id desc
   limit least(coalesce(p_limit, 200), 500);
$$;

-- ------------------------------------------------------------------
-- Daily lifecycle pass, invoked by the oversight-daily-cron edge function
-- with the service role. Emits 30 and 7 day notices for expiry and
-- majority, review-due notices, and the exploitation screen.
-- ------------------------------------------------------------------

create or replace function public.fn_oversight_daily()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  g record;
  a record;
  v_days int;
  v_majority timestamptz;
  v_notices int := 0;
  v_flags int := 0;
begin
  for g in
    select og.*, fm.birth_date, trim(coalesce(fm.first_name,'') || ' ' || coalesce(fm.last_name,'')) as subject_name
      from public.oversight_grants og
      join public.family_members fm on fm.id = og.subject_person_id
     where og.revoked_at is null and og.suspended_at is null and og.closed_by_passing_at is null
       and now() < og.expires_at
  loop
    v_days := floor(extract(epoch from (g.expires_at - now())) / 86400);
    if v_days in (30, 7) then
      perform public.fn_oversight_alert_both_sides(
        g.household_id, g.grant_id, g.subject_person_id, 'coverage_expiring',
        'The oversight authorization for ' || g.subject_name || ' expires in ' || v_days ||
        ' days, on ' || to_char(g.expires_at, 'FMMonth DD, YYYY') || '. Renewal needs the member''s fresh consent.',
        false, 'expiry:' || g.grant_id || ':' || v_days);
      insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, event_type, detail)
      values (g.household_id, g.grant_id, g.subject_person_id, 'expiry_notice', jsonb_build_object('days', v_days));
      v_notices := v_notices + 1;
    end if;

    if g.authority_basis = 'guardian_of_minor' and g.birth_date is not null then
      v_majority := (g.birth_date + interval '18 years')::timestamptz;
      v_days := floor(extract(epoch from (v_majority - now())) / 86400);
      if v_days in (30, 7) then
        perform public.fn_oversight_alert_both_sides(
          g.household_id, g.grant_id, g.subject_person_id, 'member_reaching_majority',
          g.subject_name || ' reaches the age of majority in ' || v_days ||
          ' days. The guardianship coverage ends automatically then, and continuing needs their own consent.',
          false, 'majority:' || g.grant_id || ':' || v_days);
        insert into public.oversight_audit_events (household_id, grant_id, subject_person_id, event_type, detail)
        values (g.household_id, g.grant_id, g.subject_person_id, 'majority_notice', jsonb_build_object('days', v_days));
        v_notices := v_notices + 1;
      end if;
    end if;

    if g.review_due_at is not null and g.review_due_at <= now()
       and g.authority_basis <> 'self' then
      perform public.fn_oversight_alert_both_sides(
        g.household_id, g.grant_id, g.subject_person_id, 'proxy_review_due',
        'The instrument behind ' || g.subject_name || '''s proxy coverage is due for review.',
        false, 'review:' || g.grant_id || ':' || to_char(g.review_due_at, 'YYYYMMDD'));
      v_notices := v_notices + 1;
    end if;
  end loop;

  -- Exploitation screen: a latest snapshot that fell by more than half and
  -- by more than 5000 against the prior one raises a flag to the subject,
  -- the grantee, and the designated trusted contact. Never to one side only.
  for a in
    with ranked as (
      select s.account_id, s.balance, s.as_of,
             lag(s.balance) over (partition by s.account_id order by s.as_of) as prev_balance,
             row_number() over (partition by s.account_id order by s.as_of desc) as rn
        from public.financial_account_snapshots s
       where s.as_of > now() - interval '35 days'
    )
    select r.account_id, r.balance, r.prev_balance, l.household_id, l.holders, l.account_label
      from ranked r
      join public.financial_account_links l on l.account_id = r.account_id
     where r.rn = 1 and r.prev_balance is not null
       and r.prev_balance > 0
       and r.balance < r.prev_balance * 0.5
       and (r.prev_balance - r.balance) > 5000
  loop
    perform public.fn_oversight_alert_both_sides(
      a.household_id, null, a.holders[1], 'exploitation_flag',
      'St. Michael flagged an unusual pattern on ' || a.account_label ||
      ': the balance fell from ' || round(a.prev_balance) || ' to ' || round(a.balance) ||
      ' between reviews. Please confirm this movement was expected.',
      true, 'exploit:' || a.account_id || ':' || to_char(now(), 'YYYYMMDD'));
    insert into public.oversight_audit_events (household_id, subject_person_id, event_type, detail)
    values (a.household_id, a.holders[1], 'exploitation_flag_raised',
            jsonb_build_object('account_id', a.account_id));
    v_flags := v_flags + 1;
  end loop;

  return jsonb_build_object('notices', v_notices, 'exploitation_flags', v_flags, 'ran_at', now());
end $$;

-- ------------------------------------------------------------------
-- Grants and revocations of execution rights
-- ------------------------------------------------------------------

revoke all on function public.rpc_oversight_bootstrap(uuid) from public, anon;
revoke all on function public.rpc_oversight_overview(uuid) from public, anon;
revoke all on function public.rpc_oversight_picture(uuid) from public, anon;
revoke all on function public.rpc_oversight_request_coverage(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_oversight_remind(uuid) from public, anon;
revoke all on function public.rpc_oversight_respond(uuid, boolean, text, uuid[], timestamptz, text) from public, anon;
revoke all on function public.rpc_oversight_grant_self(uuid, uuid, text, uuid[], text, timestamptz, text) from public, anon;
revoke all on function public.rpc_oversight_grant_proxy(uuid, uuid, uuid, text, uuid, text, text, uuid[], text, timestamptz) from public, anon;
revoke all on function public.rpc_oversight_revoke(uuid, text) from public, anon;
revoke all on function public.rpc_oversight_account_upsert(uuid, uuid, text, text, text, uuid[], text) from public, anon;
revoke all on function public.rpc_oversight_snapshot_add(uuid, numeric, numeric) from public, anon;
revoke all on function public.rpc_oversight_receipt(uuid) from public, anon;
revoke all on function public.rpc_oversight_audit(uuid, int) from public, anon;
revoke all on function public.fn_oversight_daily() from public, anon, authenticated;

grant execute on function public.rpc_oversight_bootstrap(uuid) to authenticated;
grant execute on function public.rpc_oversight_overview(uuid) to authenticated;
grant execute on function public.rpc_oversight_picture(uuid) to authenticated;
grant execute on function public.rpc_oversight_request_coverage(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.rpc_oversight_remind(uuid) to authenticated;
grant execute on function public.rpc_oversight_respond(uuid, boolean, text, uuid[], timestamptz, text) to authenticated;
grant execute on function public.rpc_oversight_grant_self(uuid, uuid, text, uuid[], text, timestamptz, text) to authenticated;
grant execute on function public.rpc_oversight_grant_proxy(uuid, uuid, uuid, text, uuid, text, text, uuid[], text, timestamptz) to authenticated;
grant execute on function public.rpc_oversight_revoke(uuid, text) to authenticated;
grant execute on function public.rpc_oversight_account_upsert(uuid, uuid, text, text, text, uuid[], text) to authenticated;
grant execute on function public.rpc_oversight_snapshot_add(uuid, numeric, numeric) to authenticated;
grant execute on function public.rpc_oversight_receipt(uuid) to authenticated;
grant execute on function public.rpc_oversight_audit(uuid, int) to authenticated;

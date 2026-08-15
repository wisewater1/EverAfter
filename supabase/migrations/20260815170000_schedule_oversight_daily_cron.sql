-- Schedule the household-oversight lifecycle pass.
--
-- fn_oversight_daily() is a plain SQL function, so pg_cron calls it directly.
-- That deliberately avoids the pg_net + HTTP route, which would require storing
-- a service-role key inside the database to authenticate back to the edge
-- function. The oversight-daily-cron edge function stays deployed for manual or
-- external invocation; this schedule is the in-database path and holds no secret.
create extension if not exists pg_cron;

-- Idempotent: drop any existing schedule of the same name before creating it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'oversight-daily') then
    perform cron.unschedule('oversight-daily');
  end if;
end $$;

-- 07:10 UTC daily. Offset from the top of the hour so it does not contend with
-- other scheduled work, and early enough that expiry and majority notices are
-- written before people start their day.
select cron.schedule(
  'oversight-daily',
  '10 7 * * *',
  $$select public.fn_oversight_daily()$$
);

-- The scheduler runs as the job owner; nothing is exposed to anon or
-- authenticated. fn_oversight_daily already has EXECUTE revoked from both.
revoke all on function public.fn_oversight_daily() from public, anon, authenticated;

-- Audit events must come from trusted server-side paths so staff cannot forge
-- privileged activity history through direct PostgREST inserts.
drop policy if exists audit_logs_staff_insert on public.audit_logs;
revoke insert on public.audit_logs from public, anon, authenticated;

-- Let administrators remove an invoice without deleting its order. Payment ledger
-- records remain available for audit; the invoice FK on payments uses ON DELETE SET NULL.
create or replace function public.delete_admin_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['admin']::public.app_role[]) then
    raise exception 'Only an administrator can delete invoices';
  end if;

  delete from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found';
  end if;
end;
$$;

revoke all on function public.delete_admin_invoice(uuid) from public, anon;
grant execute on function public.delete_admin_invoice(uuid) to authenticated;

drop policy if exists "Admins delete payment documents" on storage.objects;
create policy "Admins delete payment documents" on storage.objects
for delete to authenticated using (
  bucket_id = 'payment-documents'
  and public.has_any_role(array['admin']::public.app_role[])
);

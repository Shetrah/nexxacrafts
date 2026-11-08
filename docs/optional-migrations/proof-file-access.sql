-- OPTIONAL — review before applying. Not part of supabase/migrations so it is never applied implicitly.
--
-- Why: designers upload proof files to their own folder in the private `customer-files` bucket
-- (storage policies require the first folder to equal the uploader's user id). The existing read
-- policy lets customers read only objects under THEIR OWN folder, so a customer can see a proof
-- record (proof_reviews) and approve it, but cannot open the proof file itself.
--
-- What this does: adds ONE additional, read-only policy that lets a signed-in customer read a storage
-- object only when that exact object path is referenced by a proof_reviews row for an order item of
-- an order they own. It does not change or remove any existing policy, grants no write access and
-- exposes nothing to anonymous users. The subquery runs under the caller's own RLS on proof_reviews,
-- order_items and orders.
--
-- Apply in the Supabase SQL editor (or move into supabase/migrations with a new timestamp) once approved.

drop policy if exists customer_files_read_own_proofs on storage.objects;
create policy customer_files_read_own_proofs on storage.objects for select to authenticated
using (
  bucket_id = 'customer-files'
  and exists (
    select 1
    from public.proof_reviews pr
    join public.order_items oi on oi.id = pr.order_item_id
    join public.orders o on o.id = oi.order_id
    where pr.file_path = objects.name
      and o.customer_id = auth.uid()
  )
);

-- Roll back:
-- drop policy if exists customer_files_read_own_proofs on storage.objects;

-- Photo mounting is priced from the per-size/per-finish prices managed in the
-- admin service editor. The order RPC already validates option values and
-- multiplies option prices by the entered quantity.
insert into public.services (slug, name, category, description, pricing_mode, fields, is_active, sort_order)
values (
  'photo-mounting',
  'Photo Mounting',
  'Print',
  'Photo mounting in standard and custom sizes, with per-size pricing and quantity-based totals.',
  'instant',
  '[
    {"name":"mounting_size","label":"Mounting size","type":"select","required":true,"options":["A5 (14.8 × 21 cm)","A4 (21 × 29.7 cm)","A3 (29.7 × 42 cm)","A2 (42 × 59.4 cm)","A1 (59.4 × 84.1 cm)","Custom size"],"optionPrices":{"A5 (14.8 × 21 cm)":0,"A4 (21 × 29.7 cm)":0,"A3 (29.7 × 42 cm)":0,"A2 (42 × 59.4 cm)":0,"A1 (59.4 × 84.1 cm)":0,"Custom size":0},"help":"Each size price is set by an administrator and charged per mounted photo."},
    {"name":"custom_size","label":"Custom size details (cm)","type":"text","showWhen":{"field":"mounting_size","equals":"Custom size"},"help":"Enter width × height if you selected Custom size."},
    {"name":"mounting_finish","label":"Mount finish","type":"select","options":["Standard mount board","Foam board","Advise me"],"optionPrices":{"Standard mount board":0,"Foam board":0,"Advise me":0}},
    {"name":"quantity","label":"Quantity","type":"number","min":1,"step":1,"required":true},
    {"name":"notes","label":"Additional instructions","type":"textarea","help":"Add framing, colour, or presentation preferences."}
  ]'::jsonb,
  true,
  75
)
on conflict (slug) do nothing;

-- Sent timestamps are tracked independently, so a retry can complete one
-- channel without resending a message already accepted by the other channel.
alter table public.invoices
  add column if not exists whatsapp_sent_at timestamptz;

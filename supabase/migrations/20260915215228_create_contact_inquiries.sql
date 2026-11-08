/*
# Create contact_inquiries table (single-tenant, no auth)

1. New Tables
- `contact_inquiries`
  - `id` (uuid, primary key)
  - `name` (text, not null) — name of the person submitting the inquiry
  - `email` (text, not null) — email address for follow-up
  - `phone` (text, nullable) — optional phone number
  - `service` (text, not null) — the service the visitor is interested in
  - `message` (text, not null) — the project details / message body
  - `created_at` (timestamptz, default now()) — when the inquiry was submitted

2. Security
- Enable RLS on `contact_inquiries`.
- Allow anon + authenticated INSERT only — the contact form is public, but inquiries
  should not be readable or editable by anonymous visitors.
- No SELECT / UPDATE / DELETE policies: only the server-side service role can read or
  manage inquiries (e.g. from the Supabase dashboard).
*/

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  service text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_inquiries" ON contact_inquiries;
CREATE POLICY "anon_insert_inquiries"
  ON contact_inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Allow staff-recorded customer orders that are not linked to a website account.
ALTER TABLE public.orders ALTER COLUMN customer_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_admin_manual_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_payment_method text,
  p_delivery_method text,
  p_delivery_address text,
  p_delivery_instructions text,
  p_customer_notes text,
  p_service_slug text,
  p_configuration jsonb,
  p_quantity integer,
  p_amount numeric
)
RETURNS TABLE(order_id uuid, reference text, invoice_id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services%ROWTYPE;
  v_field jsonb;
  v_dependency jsonb;
  v_value text;
  v_reference text;
  v_invoice_number text;
  v_order_id uuid;
  v_invoice_id uuid;
  v_quantity integer;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only an administrator can enter a manual order';
  END IF;
  IF nullif(trim(p_customer_name), '') IS NULL
     OR nullif(trim(p_customer_email), '') IS NULL
     OR nullif(trim(p_customer_phone), '') IS NULL THEN
    RAISE EXCEPTION 'Customer name, email and phone are required';
  END IF;
  IF lower(trim(p_customer_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid customer email address';
  END IF;
  IF p_payment_method NOT IN ('mpesa', 'bank', 'card') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;
  IF p_delivery_method NOT IN ('collection', 'local_delivery', 'courier') THEN
    RAISE EXCEPTION 'Unsupported delivery method';
  END IF;
  IF p_delivery_method IN ('local_delivery', 'courier') AND nullif(trim(p_delivery_address), '') IS NULL THEN
    RAISE EXCEPTION 'A delivery address is required';
  END IF;
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Enter a valid agreed order amount';
  END IF;
  v_quantity := greatest(1, coalesce(p_quantity, 1));
  IF coalesce(jsonb_typeof(p_configuration), '') <> 'object' THEN
    RAISE EXCEPTION 'Order requirements must be a JSON object';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE slug = p_service_slug AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected service is not available'; END IF;

  -- Validate selected values against the current service form. File questions are intentionally
  -- skipped: staff are recording information already supplied by the client.
  PERFORM public.service_option_price(p_service_slug, p_configuration);
  FOR v_field IN SELECT value FROM jsonb_array_elements(coalesce(v_service.fields, '[]'::jsonb)) LOOP
    IF v_field->>'type' = 'file' OR coalesce((v_field->>'required')::boolean, false) = false THEN
      CONTINUE;
    END IF;
    v_dependency := v_field->'showWhen';
    IF v_dependency IS NOT NULL
       AND p_configuration->>coalesce(v_dependency->>'field', '') IS DISTINCT FROM v_dependency->>'equals' THEN
      CONTINUE;
    END IF;
    v_value := p_configuration->>coalesce(v_field->>'name', '');
    IF v_field->>'type' = 'checkbox' THEN
      IF v_value IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Complete required field: %', v_field->>'label'; END IF;
    ELSIF nullif(trim(v_value), '') IS NULL THEN
      RAISE EXCEPTION 'Complete required field: %', v_field->>'label';
    END IF;
  END LOOP;

  v_reference := 'NCO-' || to_char(timezone('utc', now()), 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  v_invoice_number := 'INV-' || to_char(timezone('utc', now()), 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

  INSERT INTO public.orders (
    reference, customer_id, customer_name, customer_email, customer_phone,
    payment_method, delivery_method, delivery_address, delivery_instructions,
    status, payment_status, customer_notes, subtotal, tax, total
  ) VALUES (
    v_reference, NULL, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
    p_payment_method, p_delivery_method, nullif(trim(p_delivery_address), ''), nullif(trim(p_delivery_instructions), ''),
    'awaiting_payment', 'unpaid', nullif(trim(p_customer_notes), ''), p_amount, 0, p_amount
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, service_slug, service_name, configuration, quantity,
    estimated_amount, confirmed_amount, files
  ) VALUES (
    v_order_id, v_service.slug, v_service.name,
    p_configuration || jsonb_build_object('quantity', v_quantity), v_quantity,
    p_amount, p_amount, '{}'::text[]
  );

  INSERT INTO public.invoices (
    order_id, invoice_number, customer_name, customer_email, subtotal, tax, total,
    amount_paid, status, issued_at, created_by
  ) VALUES (
    v_order_id, v_invoice_number, trim(p_customer_name), lower(trim(p_customer_email)),
    p_amount, 0, p_amount, 0, 'issued', now(), auth.uid()
  ) RETURNING id INTO v_invoice_id;

  -- Record the expected amount for finance; the gateway creates a separate PayHero attempt
  -- when the client opens the invoice link, so this row must not look like a pending STK push.
  INSERT INTO public.payments (order_id, invoice_id, method, amount, status)
  VALUES (v_order_id, v_invoice_id, p_payment_method, p_amount, 'pending');

  RETURN QUERY SELECT v_order_id, v_reference, v_invoice_id, v_invoice_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_manual_order(text,text,text,text,text,text,text,text,text,jsonb,integer,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_manual_order(text,text,text,text,text,text,text,text,text,jsonb,integer,numeric) TO authenticated;

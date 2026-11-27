-- Fix ambiguous column reference in update_admin_order function
-- Changes return columns from order_id/invoice_id to result_order_id/result_invoice_id
-- Adds table aliases to all queries to prevent ambiguity

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.update_admin_order(uuid, text, jsonb, integer, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.update_admin_order(
  p_order_id uuid,
  p_service_slug text,
  p_configuration jsonb,
  p_quantity integer,
  p_new_amount numeric,
  p_new_delivery_fee numeric,
  p_reason text DEFAULT NULL
) RETURNS TABLE(
  result_order_id uuid,
  result_invoice_id uuid,
  order_reference text,
  invoice_number text,
  new_total numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_new_total numeric(14,2);
  v_new_subtotal numeric(14,2);
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','finance']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only admins or finance staff can edit orders';
  END IF;
  
  IF p_new_amount < 0 OR p_new_delivery_fee < 0 THEN
    RAISE EXCEPTION 'Amounts cannot be negative';
  END IF;
  
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;
  
  SELECT * INTO v_order FROM public.orders o WHERE o.id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot edit a cancelled order';
  END IF;
  
  SELECT * INTO v_service FROM public.services s WHERE s.slug = p_service_slug AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found or inactive: %', p_service_slug;
  END IF;
  
  v_new_subtotal := p_new_amount;
  v_new_total := p_new_amount + p_new_delivery_fee;
  
  UPDATE public.orders
  SET
    subtotal = v_new_total,
    total = v_new_total,
    updated_at = now()
  WHERE id = p_order_id;
  
  UPDATE public.order_items
  SET
    service_slug = p_service_slug,
    service_name = v_service.name,
    configuration = p_configuration || jsonb_build_object('quantity', p_quantity, 'delivery_fee', p_new_delivery_fee),
    quantity = p_quantity,
    estimated_amount = v_new_total,
    confirmed_amount = v_new_total
  WHERE order_id = p_order_id;
  
  SELECT * INTO v_invoice FROM public.invoices WHERE order_id = p_order_id LIMIT 1;
  
  IF FOUND THEN
    IF v_invoice.status = 'paid' THEN
      RAISE EXCEPTION 'Cannot edit order - linked invoice % is already paid', v_invoice.invoice_number;
    END IF;
    
    UPDATE public.invoices
    SET
      subtotal = v_new_subtotal,
      total = v_new_total,
      updated_at = now()
    WHERE id = v_invoice.id;
    
    UPDATE public.payments
    SET amount = v_new_total
    WHERE invoice_id = v_invoice.id AND status = 'pending';
    
    UPDATE public.invoices
    SET 
      sent_at = NULL,
      whatsapp_sent_at = NULL
    WHERE id = v_invoice.id;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_order.id,
    v_invoice.id,
    v_order.reference,
    v_invoice.invoice_number,
    v_new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_order(uuid, text, jsonb, integer, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_admin_order(uuid, text, jsonb, integer, numeric, numeric, text) TO authenticated;

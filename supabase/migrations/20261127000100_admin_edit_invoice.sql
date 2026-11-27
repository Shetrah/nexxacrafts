-- Add ability for admins to edit invoices and resend them
-- This allows updating invoice amounts when client requests changes

-- Function to update an existing invoice and its linked order
CREATE OR REPLACE FUNCTION public.update_admin_invoice(
  p_invoice_id uuid,
  p_new_subtotal numeric,
  p_new_delivery_fee numeric,
  p_new_tax numeric DEFAULT 0,
  p_reason text DEFAULT NULL
) RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_invoice public.invoices%rowtype;
  v_new_total numeric(14,2);
  v_order_id uuid;
BEGIN
  -- Check admin permission
  IF NOT public.has_any_role(ARRAY['admin','finance']::public.app_role[]) THEN
    RETURN QUERY SELECT false, 'Only admins or finance staff can edit invoices';
    RETURN;
  END IF;
  
  -- Validate inputs
  IF p_new_subtotal < 0 OR p_new_delivery_fee < 0 OR p_new_tax < 0 THEN
    RETURN QUERY SELECT false, 'Amounts cannot be negative';
    RETURN;
  END IF;
  
  -- Get the invoice
  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invoice not found';
    RETURN;
  END IF;
  
  -- Cannot edit paid invoices
  IF v_invoice.status = 'paid' THEN
    RETURN QUERY SELECT false, 'Cannot edit a paid invoice';
    RETURN;
  END IF;
  
  -- Calculate new total
  v_new_total := p_new_subtotal + p_new_delivery_fee + p_new_tax;
  
  -- Update the invoice
  UPDATE public.invoices
  SET
    subtotal = p_new_subtotal,
    tax = p_new_tax,
    total = v_new_total,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Update linked order if exists
  IF v_invoice.order_id IS NOT NULL THEN
    v_order_id := v_invoice.order_id;
    
    -- Update order totals
    UPDATE public.orders
    SET
      subtotal = v_new_total,
      total = v_new_total,
      updated_at = now()
    WHERE id = v_order_id;
    
    -- Update order items with new delivery fee and amounts
    UPDATE public.order_items
    SET
      confirmed_amount = v_new_total,
      estimated_amount = v_new_total,
      configuration = jsonb_set(
        COALESCE(configuration, '{}'::jsonb),
        '{delivery_fee}',
        to_jsonb(p_new_delivery_fee)
      )
    WHERE order_id = v_order_id;
    
    -- Update pending payment amount
    UPDATE public.payments
    SET amount = v_new_total
    WHERE invoice_id = p_invoice_id AND status = 'pending';
  END IF;
  
  -- Log the change (optional - create audit table if needed)
  -- INSERT INTO invoice_audit_log (invoice_id, changed_by, old_total, new_total, reason)
  -- VALUES (p_invoice_id, auth.uid(), v_invoice.total, v_new_total, p_reason);
  
  RETURN QUERY SELECT true, 'Invoice updated successfully';
END $$;

REVOKE ALL ON FUNCTION public.update_admin_invoice(uuid, numeric, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_admin_invoice(uuid, numeric, numeric, numeric, text) TO authenticated;

-- Add updated_at column to invoices if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

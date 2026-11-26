-- Fix existing invoices with incorrect subtotal values
-- Recalculate subtotal = total - delivery_fee
-- Delivery fee is stored in order_items.configuration->>'delivery_fee'

DO $$
DECLARE
  invoice_record RECORD;
  delivery_fee_value NUMERIC(14,2);
  correct_subtotal NUMERIC(14,2);
BEGIN
  -- Loop through all invoices that have an order_id
  FOR invoice_record IN 
    SELECT i.id, i.total, i.subtotal, i.order_id
    FROM public.invoices i
    WHERE i.order_id IS NOT NULL
      AND i.status NOT IN ('draft', 'void')
  LOOP
    -- Get delivery fee from order_items configuration
    SELECT COALESCE(
      (oi.configuration->>'delivery_fee')::numeric,
      0
    )
    INTO delivery_fee_value
    FROM public.order_items oi
    WHERE oi.order_id = invoice_record.order_id
    LIMIT 1;
    
    -- Calculate correct subtotal (total - delivery_fee)
    correct_subtotal := invoice_record.total - COALESCE(delivery_fee_value, 0);
    
    -- Update invoice only if subtotal is incorrect
    IF invoice_record.subtotal != correct_subtotal THEN
      UPDATE public.invoices
      SET subtotal = correct_subtotal
      WHERE id = invoice_record.id;
      
      RAISE NOTICE 'Fixed invoice %: subtotal % -> % (delivery fee: %)', 
        invoice_record.id, 
        invoice_record.subtotal, 
        correct_subtotal,
        delivery_fee_value;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Invoice subtotal fix completed';
END $$;

-- Fix invoice for order NCO-261126-8744C0431511
-- Correct the amounts: Banner should be 400, Design 500, Delivery 300, Total 1200

DO $$
DECLARE
  v_order_id uuid;
BEGIN
  -- Get the order ID
  SELECT id INTO v_order_id 
  FROM public.orders 
  WHERE reference = 'NCO-261126-8744C0431511';
  
  IF v_order_id IS NOT NULL THEN
    -- Update order_items to correct amount (900 = banner 400 + design 500)
    UPDATE public.order_items
    SET 
      confirmed_amount = 900,
      estimated_amount = 900
    WHERE order_id = v_order_id;
    
    -- Update invoice: subtotal 900, total 1200 (subtotal + 300 delivery)
    UPDATE public.invoices
    SET 
      subtotal = 900,
      total = 1200
    WHERE order_id = v_order_id;
    
    -- Update order totals
    UPDATE public.orders
    SET 
      subtotal = 1200,
      total = 1200
    WHERE id = v_order_id;
    
    RAISE NOTICE 'Fixed invoice for order NCO-261126-8744C0431511: subtotal=900, total=1200';
  ELSE
    RAISE NOTICE 'Order NCO-261126-8744C0431511 not found - no changes made';
  END IF;
END $$;

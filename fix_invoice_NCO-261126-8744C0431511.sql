-- Fix invoice for order NCO-261126-8744C0431511
-- Update the item amount to reflect correct banner price (400 instead of 900)
-- Design fee (500) + Banner (400) + Delivery (300) = Total 1200

-- First, let's update the order_items confirmed_amount
UPDATE public.order_items
SET 
  confirmed_amount = 900,  -- Banner 400 + Design 500 = 900 (correct)
  estimated_amount = 900
WHERE order_id = (
  SELECT id FROM public.orders WHERE reference = 'NCO-261126-8744C0431511'
);

-- Update the invoice subtotal to 900 (banner 400 + design 500)
UPDATE public.invoices
SET 
  subtotal = 900,  -- Banner 400 + Design 500
  total = 1200     -- Subtotal 900 + Delivery 300
WHERE order_id = (
  SELECT id FROM public.orders WHERE reference = 'NCO-261126-8744C0431511'
);

-- Update the order totals
UPDATE public.orders
SET 
  subtotal = 1200,  -- Includes delivery in order table
  total = 1200
WHERE reference = 'NCO-261126-8744C0431511';

SELECT 'Invoice updated successfully for order NCO-261126-8744C0431511' as message;

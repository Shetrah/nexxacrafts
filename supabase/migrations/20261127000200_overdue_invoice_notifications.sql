-- System for tracking and sending overdue invoice notifications
-- Sends WhatsApp reminder 24 hours after invoice is issued if still unpaid

-- Table to track overdue notifications sent
CREATE TABLE IF NOT EXISTS public.invoice_overdue_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('24hr_overdue', '48hr_overdue', '7day_overdue')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_via text CHECK (sent_via IN ('whatsapp', 'email', 'both')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_overdue_notifications_invoice ON public.invoice_overdue_notifications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_overdue_notifications_sent_at ON public.invoice_overdue_notifications(sent_at);

-- Function to find invoices that need overdue notifications
CREATE OR REPLACE FUNCTION public.get_overdue_invoices_for_notification()
RETURNS TABLE(
  invoice_id uuid,
  invoice_number text,
  customer_name text,
  customer_email text,
  customer_phone text,
  total numeric,
  issued_at timestamptz,
  hours_overdue integer,
  notification_type text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.invoice_number,
    i.customer_name,
    i.customer_email,
    COALESCE(o.customer_phone, '') as customer_phone,
    i.total,
    i.issued_at,
    EXTRACT(EPOCH FROM (now() - i.issued_at)) / 3600 AS hours_overdue,
    CASE 
      WHEN EXTRACT(EPOCH FROM (now() - i.issued_at)) >= 86400 * 7 THEN '7day_overdue'
      WHEN EXTRACT(EPOCH FROM (now() - i.issued_at)) >= 86400 * 2 THEN '48hr_overdue'
      ELSE '24hr_overdue'
    END::text as notification_type
  FROM public.invoices i
  LEFT JOIN public.orders o ON i.order_id = o.id
  WHERE 
    -- Invoice is issued and unpaid
    i.status IN ('issued', 'partially_paid')
    -- At least 24 hours have passed since issued
    AND i.issued_at < (now() - interval '24 hours')
    -- Not already paid
    AND i.amount_paid < i.total
    -- Check which notifications haven't been sent yet
    AND (
      -- 24hr notification not sent and it's been > 24hrs
      (NOT EXISTS (
        SELECT 1 FROM public.invoice_overdue_notifications 
        WHERE invoice_id = i.id AND notification_type = '24hr_overdue'
      ) AND EXTRACT(EPOCH FROM (now() - i.issued_at)) >= 86400)
      OR
      -- 48hr notification not sent and it's been > 48hrs
      (NOT EXISTS (
        SELECT 1 FROM public.invoice_overdue_notifications 
        WHERE invoice_id = i.id AND notification_type = '48hr_overdue'
      ) AND EXTRACT(EPOCH FROM (now() - i.issued_at)) >= 86400 * 2)
      OR
      -- 7day notification not sent and it's been > 7 days
      (NOT EXISTS (
        SELECT 1 FROM public.invoice_overdue_notifications 
        WHERE invoice_id = i.id AND notification_type = '7day_overdue'
      ) AND EXTRACT(EPOCH FROM (now() - i.issued_at)) >= 86400 * 7)
    )
  ORDER BY i.issued_at ASC;
END $$;

-- Function to record that an overdue notification was sent
CREATE OR REPLACE FUNCTION public.record_overdue_notification(
  p_invoice_id uuid,
  p_notification_type text,
  p_sent_via text DEFAULT 'whatsapp',
  p_status text DEFAULT 'sent',
  p_error_message text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.invoice_overdue_notifications (
    invoice_id,
    notification_type,
    sent_via,
    status,
    error_message
  ) VALUES (
    p_invoice_id,
    p_notification_type,
    p_sent_via,
    p_status,
    p_error_message
  )
  ON CONFLICT (invoice_id, notification_type) 
  DO UPDATE SET
    sent_at = now(),
    sent_via = p_sent_via,
    status = p_status,
    error_message = p_error_message
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END $$;

REVOKE ALL ON FUNCTION public.get_overdue_invoices_for_notification() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_overdue_invoices_for_notification() TO service_role;

REVOKE ALL ON FUNCTION public.record_overdue_notification(uuid, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_overdue_notification(uuid, text, text, text, text) TO service_role;

-- Grant access to the notifications table
GRANT SELECT, INSERT, UPDATE ON public.invoice_overdue_notifications TO service_role;

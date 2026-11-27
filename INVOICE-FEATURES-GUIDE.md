# Invoice Features Guide

## ✅ Completed Features

### 1. Admin Invoice Editing
### 2. Automated Overdue Notifications

---

## Feature 1: Admin Invoice Editing

### Overview
Allows admins to modify invoice amounts when clients request changes (e.g., different sizes, additional items).

### How to Use

1. **Navigate to Invoices**
   - Go to Admin Panel → Invoices

2. **Find the Invoice**
   - Locate the invoice you want to edit
   - Only **unpaid invoices** can be edited (issued, partially_paid)

3. **Click "Edit amounts"**
   - Button appears next to "Resend invoice" button

4. **Edit Modal Opens**
   - **Subtotal (KES)** - Total of service + design assistance
   - **Delivery Fee (KES)** - Shown separately on invoice
   - **Tax (KES)** - Tax amount (usually 0)
   - **Reason** (optional) - E.g., "Client requested 2m x 1m instead of 1m x 0.5m"

5. **Live Total Calculation**
   - New total shown in blue box as you type
   - Formula: Total = Subtotal + Delivery Fee + Tax

6. **Save Changes**
   - Click "Save changes"
   - Success message shows new total
   - Invoice automatically updated
   - Linked order and items synced

### What Gets Updated

When you edit an invoice:
- ✅ Invoice: `subtotal`, `tax`, `total`
- ✅ Order: `subtotal`, `total`
- ✅ Order Items: `confirmed_amount`, `estimated_amount`, `configuration.delivery_fee`
- ✅ Pending Payments: `amount` updated to new total

### Safety Features

- ❌ Cannot edit **paid** invoices
- ✅ Validates all amounts (must be ≥ 0)
- ✅ Updates all linked records atomically (transaction)
- ✅ Optional reason field for audit trail

### Example

**Before Edit:**
- Banner Printing: KES 400
- Design Assistance: KES 500
- Subtotal: KES 900
- Delivery: KES 300
- **Total: KES 1,200**

**Client Requests:** Larger banner (2m instead of 1m)

**After Edit:**
- Subtotal: KES 1,400 (banner now 900)
- Delivery: KES 300
- **New Total: KES 1,700**
- Reason: "Client requested 2m x 1m banner instead of 1m x 0.5m"

---

## Feature 2: Automated Overdue Notifications

### Overview
Automatically sends WhatsApp reminders to clients with unpaid invoices at 24 hours, 48 hours, and 7 days after invoice issued.

### How It Works

#### Automatic Schedule
Cron job runs **every 6 hours** and:
1. Checks all invoices issued > 24 hours ago
2. Filters for unpaid invoices (issued, partially_paid status)
3. Checks if notification already sent for this tier
4. Sends WhatsApp message if due
5. Records notification in database

#### Notification Tiers

**24 Hours - Friendly Reminder**
```
Hello THE MWANGAZA KAJIWENI SCHOOL,

This is a friendly reminder that your invoice INV-261126-A9D5A 
for KES 1,200.00 is now overdue.

Please complete your payment at your earliest convenience. 
If you have any questions or need assistance, feel free to reach out.

Thank you!
NexxaCraft Team
nexxacrafts.co.ke
```

**48 Hours - Polite Request**
```
Hello THE MWANGAZA KAJIWENI SCHOOL,

Your invoice INV-261126-A9D5A for KES 1,200.00 is now 2 days overdue.

We kindly request that you complete the payment as soon as possible. 
If there are any issues preventing payment, please contact us immediately.

Thank you for your attention.
NexxaCraft Team
nexxacrafts.co.ke
```

**7 Days - Urgent Notice**
```
Hello THE MWANGAZA KAJIWENI SCHOOL,

This is an important reminder regarding invoice INV-261126-A9D5A 
for KES 1,200.00, which is now 7 days overdue.

Please settle this invoice urgently. If you need to discuss payment 
arrangements or have any concerns, contact us immediately.

Thank you.
NexxaCraft Team
nexxacrafts.co.ke
```

### Database Tracking

**Table:** `invoice_overdue_notifications`

Tracks:
- `invoice_id` - Which invoice
- `notification_type` - 24hr_overdue, 48hr_overdue, 7day_overdue
- `sent_at` - Timestamp
- `sent_via` - whatsapp, email, both
- `status` - sent, failed, pending
- `error_message` - If failed, why

**Prevents:**
- ❌ Duplicate notifications
- ❌ Spamming clients
- ❌ Re-sending after invoice paid

### Monitoring

#### Check Cron Job Status
Run in Supabase SQL Editor:
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View recent runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

#### Check Sent Notifications
```sql
-- View all sent notifications
SELECT 
  i.invoice_number,
  i.customer_name,
  i.total,
  ion.notification_type,
  ion.sent_at,
  ion.status
FROM invoice_overdue_notifications ion
JOIN invoices i ON ion.invoice_id = i.id
ORDER BY ion.sent_at DESC;
```

#### Manually Trigger (Testing)
```sql
SELECT net.http_post(
  url := 'https://mjaobluyatooabghlzdo.supabase.co/functions/v1/send-overdue-notifications',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

---

## Setup Status

### ✅ Completed
- [x] Database migrations deployed
- [x] Edge Function deployed
- [x] Frontend UI for invoice editing
- [x] pg_cron extension enabled
- [x] Cron job scheduled automatically
- [x] Works for existing invoices
- [x] Works for new invoices

### 🎯 Active Now
- Cron job runs every 6 hours
- Next run: Check with `SELECT * FROM cron.job;`

---

## Troubleshooting

### Invoice Editing Not Working
1. Check you're logged in as admin or finance role
2. Verify invoice is not "paid" status
3. Check browser console for errors
4. Verify database function: `SELECT * FROM pg_proc WHERE proname = 'update_admin_invoice';`

### Notifications Not Sending
1. **Check cron job is running:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-overdue-invoice-notifications';
   ```

2. **Check recent run results:**
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

3. **Manually trigger:**
   ```sql
   SELECT net.http_post(
     url := 'https://mjaobluyatooabghlzdo.supabase.co/functions/v1/send-overdue-notifications',
     headers := '{"Content-Type": "application/json"}'::jsonb,
     body := '{}'::jsonb
   );
   ```

4. **Check Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → send-overdue-notifications → Logs

5. **Verify WhatsApp API key set:**
   - Supabase Dashboard → Settings → Edge Functions → Secrets
   - Ensure `WHATSAPP_API_KEY` is set

---

## Git Commits

- `f095267` - Database functions and Edge Function
- `94be4d1` - UI for invoice editing
- `6e58d57` - Auto-enable pg_cron and schedule notifications

---

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Check cron job logs: `SELECT * FROM cron.job_run_details`
3. Check notification records: `SELECT * FROM invoice_overdue_notifications`
4. Review this guide

---

**Last Updated:** November 27, 2026
**Status:** ✅ Fully Operational

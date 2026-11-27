// Edge Function to send overdue invoice notifications via WhatsApp
// Should be triggered by a cron job every 6 hours

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');

interface OverdueInvoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total: number;
  issued_at: string;
  hours_overdue: number;
  notification_type: '24hr_overdue' | '48hr_overdue' | '7day_overdue';
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getOverdueMessage(invoice: OverdueInvoice): string {
  const amount = formatCurrency(invoice.total);
  const days = Math.floor(invoice.hours_overdue / 24);
  
  if (invoice.notification_type === '24hr_overdue') {
    return `Hello ${invoice.customer_name},\n\nThis is a friendly reminder that your invoice ${invoice.invoice_number} for ${amount} is now overdue.\n\nPlease complete your payment at your earliest convenience. If you have any questions or need assistance, feel free to reach out.\n\nThank you!\nNexxaCraft Team\nnexxacrafts.co.ke`;
  } else if (invoice.notification_type === '48hr_overdue') {
    return `Hello ${invoice.customer_name},\n\nYour invoice ${invoice.invoice_number} for ${amount} is now ${days} days overdue.\n\nWe kindly request that you complete the payment as soon as possible. If there are any issues preventing payment, please contact us immediately.\n\nThank you for your attention.\nNexxaCraft Team\nnexxacrafts.co.ke`;
  } else {
    return `Hello ${invoice.customer_name},\n\nThis is an important reminder regarding invoice ${invoice.invoice_number} for ${amount}, which is now ${days} days overdue.\n\nPlease settle this invoice urgently. If you need to discuss payment arrangements or have any concerns, contact us immediately.\n\nThank you.\nNexxaCraft Team\nnexxacrafts.co.ke`;
  }
}

async function sendWhatsAppNotification(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!whatsappApiKey) {
    return { success: false, error: 'WhatsApp API key not configured' };
  }
  
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('0') && cleanPhone.length === 10
    ? `254${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('254') && cleanPhone.length === 12
    ? cleanPhone
    : cleanPhone.length === 9
    ? `254${cleanPhone}`
    : '';
    
  if (!whatsappNumber) {
    return { success: false, error: 'Invalid phone number format' };
  }
  
  try {
    const response = await fetch('https://api.wassenger.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: whatsappNumber,
        message: message,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `WhatsApp API error: ${response.status} - ${errorText.slice(0, 200)}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (request) => {
  // Only allow service role or cron to trigger this
  const authHeader = request.headers.get('authorization');
  
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration missing' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    console.log('Starting overdue invoice notification check...');
    
    // Get all invoices that need overdue notifications
    const overdueResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_overdue_invoices_for_notification`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!overdueResponse.ok) {
      throw new Error(`Failed to fetch overdue invoices: ${overdueResponse.status}`);
    }
    
    const overdueInvoices = await overdueResponse.json() as OverdueInvoice[];
    
    console.log(`Found ${overdueInvoices.length} invoices needing notifications`);
    
    if (overdueInvoices.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'No overdue invoices found',
        processed: 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ invoice: string; error: string }>,
    };
    
    // Process each overdue invoice
    for (const invoice of overdueInvoices) {
      results.processed++;
      
      if (!invoice.customer_phone) {
        console.warn(`No phone number for invoice ${invoice.invoice_number}`);
        results.failed++;
        results.errors.push({ 
          invoice: invoice.invoice_number, 
          error: 'No phone number available' 
        });
        
        // Record the failed attempt
        await fetch(`${supabaseUrl}/rest/v1/rpc/record_overdue_notification`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_invoice_id: invoice.invoice_id,
            p_notification_type: invoice.notification_type,
            p_sent_via: 'whatsapp',
            p_status: 'failed',
            p_error_message: 'No phone number available',
          }),
        });
        
        continue;
      }
      
      // Send WhatsApp notification
      const message = getOverdueMessage(invoice);
      const result = await sendWhatsAppNotification(invoice.customer_phone, message);
      
      if (result.success) {
        results.sent++;
        console.log(`Sent ${invoice.notification_type} notification for invoice ${invoice.invoice_number}`);
        
        // Record successful send
        await fetch(`${supabaseUrl}/rest/v1/rpc/record_overdue_notification`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_invoice_id: invoice.invoice_id,
            p_notification_type: invoice.notification_type,
            p_sent_via: 'whatsapp',
            p_status: 'sent',
          }),
        });
      } else {
        results.failed++;
        results.errors.push({ 
          invoice: invoice.invoice_number, 
          error: result.error || 'Unknown error' 
        });
        console.error(`Failed to send notification for ${invoice.invoice_number}: ${result.error}`);
        
        // Record failed send
        await fetch(`${supabaseUrl}/rest/v1/rpc/record_overdue_notification`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_invoice_id: invoice.invoice_id,
            p_notification_type: invoice.notification_type,
            p_sent_via: 'whatsapp',
            p_status: 'failed',
            p_error_message: result.error?.slice(0, 500),
          }),
        });
      }
      
      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Overdue notification job completed: ${results.sent} sent, ${results.failed} failed`);
    
    return new Response(JSON.stringify({ 
      ok: true, 
      ...results 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in overdue notifications:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

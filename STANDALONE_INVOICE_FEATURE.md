# Standalone Invoice Feature - Implementation Guide

## Overview
Add ability to create invoices for walk-in/non-registered clients with line item details, preview, and send via WhatsApp/Email.

## Required Changes to `src/features/admin/invoices/InvoicesPage.tsx`

### 1. Add these functions after the existing `deleteInvoice` function (around line 258):

```typescript
// Standalone invoice functions
function updateStandaloneItem(index: number, field: keyof InvoiceLineItem, value: string | number) {
  setStandaloneForm(prev => {
    const items = [...prev.items];
    items[index] = { ...items[index], [field]: value };
    
    // Recalculate amount for this item
    if (field === 'quantity' || field === 'rate') {
      const qty = Number(field === 'quantity' ? value : items[index].quantity) || 0;
      const rate = Number(field === 'rate' ? value : items[index].rate) || 0;
      items[index].amount = qty * rate;
    }
    
    return { ...prev, items };
  });
}

function addStandaloneItem() {
  setStandaloneForm(prev => ({ ...prev, items: [...prev.items, blankItem()] }));
}

function removeStandaloneItem(index: number) {
  if (standaloneForm.items.length === 1) return;
  setStandaloneForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
}

function calculateStandaloneTotal() {
  const subtotal = standaloneForm.items.reduce((sum, item) => sum + item.amount, 0);
  const deliveryFee = Number(standaloneForm.delivery_fee) || 0;
  const tax = Number(standaloneForm.tax) || 0;
  return { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
}

async function createStandaloneInvoice(event: React.FormEvent) {
  event.preventDefault(); 
  setSaving(true); 
  setError(''); 
  setNotice('');
  
  try {
    if (!standaloneForm.customer_name.trim()) {
      throw new Error('Customer name is required.');
    }
    if (!standaloneForm.customer_phone.trim()) {
      throw new Error('Customer phone is required.');
    }
    
    const hasValidItems = standaloneForm.items.some(item => item.description.trim() && item.amount > 0);
    if (!hasValidItems) {
      throw new Error('Add at least one item with a description and amount.');
    }
    
    const { subtotal, deliveryFee, tax, total } = calculateStandaloneTotal();
    
    if (total <= 0) {
      throw new Error('Invoice total must be greater than zero.');
    }
    
    // Create the invoice
    const invoice = await createInvoice({
      order_id: null,
      customer_name: standaloneForm.customer_name.trim(),
      customer_email: standaloneForm.customer_email.trim() || null,
      subtotal: subtotal + deliveryFee, // Include delivery in subtotal for now
      tax,
      total,
      due_date: standaloneForm.due_date || null,
      created_by: user.id,
    });
    
    // Update to issued status
    const issued = await updateInvoice(invoice.id, { 
      status: 'issued', 
      issued_at: new Date().toISOString() 
    });
    
    // Send invoice
    const delivery = await sendInvoiceEmail(issued.id);
    const sentChannels = [
      delivery.emailSent ? 'email' : '', 
      delivery.whatsappSent ? 'WhatsApp' : ''
    ].filter(Boolean);
    const deliveryIssues = [
      !delivery.emailSent && standaloneForm.customer_email ? `Email: ${delivery.emailError || 'not accepted'}` : '', 
      !delivery.whatsappSent ? `WhatsApp: ${delivery.whatsappError || 'not accepted'}` : ''
    ].filter(Boolean);
    
    if (deliveryIssues.length) {
      setError(`Invoice ${issued.invoice_number} was issued, but delivery was partial (${sentChannels.join(' and ') || 'no channel'} accepted). ${deliveryIssues.join(' · ')} Use Resend invoice below to retry.`);
    } else {
      setNotice(`Invoice ${issued.invoice_number} was issued and sent${sentChannels.length ? ` by ${sentChannels.join(' and ')}` : ''}.`);
    }
    
    setStandaloneOpen(false);
    setStandaloneForm(blankStandalone());
    setStandaloneStep('edit');
    await reload();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Could not create and send the invoice.');
  } finally {
    setSaving(false);
  }
}
```

### 2. Add button to header (around line 261), change from:
```typescript
<button type="button" onClick={()=>{setOpen((value)=>!value);setError('');setNotice('');}} className="btn-primary">{open?<X size={16}/>:<Plus size={16}/>} {open?'Close':'Create invoice'}</button>
```

To:
```typescript
<div className="flex gap-2">
  <button type="button" onClick={()=>{setOpen((value)=>!value);setError('');setNotice('');}} className="btn-outline">{open?<X size={16}/>:<Plus size={16}/>} {open?'Close':'From order'}</button>
  <button type="button" onClick={()=>{setStandaloneOpen((value)=>!value);setError('');setNotice('');}} className="btn-primary">{standaloneOpen?<X size={16}/>:<Plus size={16}/>} {standaloneOpen?'Close':'Walk-in invoice'}</button>
</div>
```

### 3. Add standalone invoice form after the existing order-based form (around line 285), before the "Recent invoices" section:

```typescript
{standaloneOpen && standaloneStep === 'edit' && (
  <form className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
    <h3 className="text-lg font-bold">Walk-in Client Invoice</h3>
    <p className="mt-2 text-sm text-slate-600">Create invoice for walk-in clients. Email is optional; WhatsApp will be used for delivery.</p>
    
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Customer Name *
        <input
          required
          className="form-control mt-1"
          value={standaloneForm.customer_name}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_name: e.target.value })}
          placeholder="John Doe"
        />
      </label>
      
      <label className="text-sm font-semibold">
        Phone Number *
        <input
          required
          type="tel"
          className="form-control mt-1"
          value={standaloneForm.customer_phone}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_phone: e.target.value })}
          placeholder="0712345678"
        />
      </label>
      
      <label className="text-sm font-semibold sm:col-span-2">
        Email (Optional)
        <input
          type="email"
          className="form-control mt-1"
          value={standaloneForm.customer_email}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, customer_email: e.target.value })}
          placeholder="customer@example.com"
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          If provided, invoice will be sent via email and WhatsApp
        </span>
      </label>
    </div>
    
    <div className="mt-6">
      <h4 className="text-sm font-semibold">Invoice Items</h4>
      <div className="mt-3 space-y-3">
        {standaloneForm.items.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input
              required
              className="form-control"
              placeholder="Description (e.g., Banner 3x6ft)"
              value={item.description}
              onChange={(e) => updateStandaloneItem(index, 'description', e.target.value)}
            />
            <input
              required
              type="number"
              min="1"
              step="1"
              className="form-control"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateStandaloneItem(index, 'quantity', e.target.value)}
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              placeholder="Rate"
              value={item.rate}
              onChange={(e) => updateStandaloneItem(index, 'rate', e.target.value)}
            />
            <div className="flex items-center rounded border border-line bg-slate-50 px-3 text-sm font-semibold">
              {money(item.amount)}
            </div>
            {standaloneForm.items.length > 1 && (
              <button
                type="button"
                onClick={() => removeStandaloneItem(index)}
                className="btn-outline btn-sm text-red-700"
                aria-label="Remove item"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addStandaloneItem}
        className="btn-outline btn-sm mt-3"
      >
        <Plus size={14} /> Add item
      </button>
    </div>
    
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-semibold">
        Delivery Fee (KES)
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control mt-1"
          value={standaloneForm.delivery_fee}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, delivery_fee: e.target.value })}
        />
      </label>
      
      <label className="text-sm font-semibold">
        Tax (KES)
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control mt-1"
          value={standaloneForm.tax}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, tax: e.target.value })}
        />
      </label>
      
      <label className="text-sm font-semibold">
        Due Date
        <input
          type="date"
          className="form-control mt-1"
          value={standaloneForm.due_date}
          onChange={(e) => setStandaloneForm({ ...standaloneForm, due_date: e.target.value })}
        />
      </label>
    </div>
    
    <div className="mt-6 rounded-lg border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-900">Invoice Total</span>
        <span className="text-2xl font-bold text-brand-700">{money(calculateStandaloneTotal().total)}</span>
      </div>
      <div className="mt-2 space-y-1 text-xs text-brand-700">
        <div className="flex justify-between"><span>Subtotal:</span><span>{money(calculateStandaloneTotal().subtotal)}</span></div>
        <div className="flex justify-between"><span>Delivery Fee:</span><span>{money(calculateStandaloneTotal().deliveryFee)}</span></div>
        <div className="flex justify-between"><span>Tax:</span><span>{money(calculateStandaloneTotal().tax)}</span></div>
      </div>
    </div>
    
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        className="btn-outline"
        onClick={() => { setStandaloneOpen(false); setStandaloneForm(blankStandalone()); }}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn-outline"
        onClick={() => setStandaloneStep('preview')}
      >
        Preview Invoice
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={createStandaloneInvoice}
        className="btn-primary"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
        {saving ? 'Sending...' : 'Issue & Send'}
      </button>
    </div>
  </form>
)}

{standaloneOpen && standaloneStep === 'preview' && (
  <div className="rounded-xl border border-line bg-white p-5 shadow-xs sm:p-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold">Invoice Preview</h3>
      <button type="button" onClick={() => setStandaloneStep('edit')} className="btn-outline btn-sm">
        <X size={14} /> Close Preview
      </button>
    </div>
    
    <div className="mt-6 rounded-lg border border-line p-6">
      <div className="mb-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">Invoice To</h4>
        <p className="mt-2 font-semibold">{standaloneForm.customer_name}</p>
        <p className="text-sm text-slate-600">{standaloneForm.customer_phone}</p>
        {standaloneForm.customer_email && <p className="text-sm text-slate-600">{standaloneForm.customer_email}</p>}
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line bg-slate-50">
            <th className="p-3 text-left text-sm font-semibold">Description</th>
            <th className="p-3 text-center text-sm font-semibold">Qty</th>
            <th className="p-3 text-right text-sm font-semibold">Rate</th>
            <th className="p-3 text-right text-sm font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {standaloneForm.items.filter(item => item.description.trim()).map((item, index) => (
            <tr key={index} className="border-b border-line">
              <td className="p-3 text-sm">{item.description}</td>
              <td className="p-3 text-center text-sm">{item.quantity}</td>
              <td className="p-3 text-right text-sm">{money(Number(item.rate) || 0)}</td>
              <td className="p-3 text-right text-sm font-semibold">{money(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-6 flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal:</span><span className="font-semibold">{money(calculateStandaloneTotal().subtotal)}</span></div>
          {Number(standaloneForm.delivery_fee) > 0 && (
            <div className="flex justify-between"><span>Delivery Fee:</span><span className="font-semibold">{money(Number(standaloneForm.delivery_fee))}</span></div>
          )}
          {Number(standaloneForm.tax) > 0 && (
            <div className="flex justify-between"><span>Tax:</span><span className="font-semibold">{money(Number(standaloneForm.tax))}</span></div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-lg"><span className="font-bold">Total:</span><span className="font-bold text-brand-700">{money(calculateStandaloneTotal().total)}</span></div>
        </div>
      </div>
    </div>
    
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        className="btn-outline"
        onClick={() => setStandaloneStep('edit')}
      >
        Back to Edit
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={createStandaloneInvoice}
        className="btn-primary"
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
        {saving ? 'Sending...' : 'Confirm & Send Invoice'}
      </button>
    </div>
  </div>
)}
```

## Summary

This adds:
1. **Walk-in invoice button** - Opens a new form specifically for non-registered clients
2. **Line items table** - Add multiple items with description, quantity, rate
3. **Client details** - Name (required), Phone (required), Email (optional)
4. **Preview mode** - See invoice before sending
5. **Auto-calculation** - Totals calculated automatically
6. **WhatsApp delivery** - Works even without email

The invoice will be sent via WhatsApp to the phone number, and email if provided.

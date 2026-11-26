import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarClock, ClipboardList, Download, FileText, ImagePlus, Loader2, MapPin, PackageSearch, Plus, Send, UserRound, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader, Modal, SpecList, StatusBadge, useToast } from '@/components/ui';
import { useAdmin } from '../AdminContext';
import { getOrderBundle, listOrders, type OrderBundle } from '@/lib/api/orders';
import { listServiceRecords } from '@/lib/api/services';
import { formatDateTime, formatMoney, humanize } from '@/lib/format';
import type { OrderItemRow, OrderRow, ServiceRow } from '@/types/db';
import type { ServiceField } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';
import ModuleStub from '../ModuleStub';
import { statusMeta } from '@/lib/status';
import { ORDER_STATUSES } from '@/lib/status';
import { createSignedFileUrl, displayFileName, isDemoFilePath } from '@/lib/api/storage';
import { groupFilesByRole, FILE_ROLE_META, isImagePath } from '@/lib/designFiles';
import { calculateEstimate, loadPricingRates, type PricingRate } from '@/lib/pricing';
import { sendInvoiceEmail } from '@/lib/platform';
import { CheckoutPrintout } from '@/components/CheckoutPrintout';
import { listCustomerProfiles } from '@/lib/api/profiles';

function OrderSpecifications({ item, catalog }: { item: OrderItemRow; catalog: readonly ServiceRow[] }) {
  const service = catalog.find((record) => record.slug === item.service_slug);
  const fields = Array.isArray(service?.fields) ? service.fields as unknown as ServiceField[] : [];
  const entries = describeConfigurationFromFields(item.configuration, fields);
  const allEntries = entries;

  if (!allEntries.length && !item.files.length) return <p className="text-sm text-slate-500">No additional specifications were provided for this item.</p>;
  return <>
    {allEntries.length > 0 && <SpecList dense columns={allEntries.length > 5 ? 2 : 1} items={allEntries.map(({ label, value }) => ({ label, value: <span className="whitespace-pre-wrap text-left">{value}</span> }))} />}
    {item.files.length > 0 && <div className="mt-4 space-y-3">{groupFilesByRole(item.files).map(({ role, files }) => <div key={role} className="rounded-lg border border-line bg-slate-50/70 p-3"><h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{FILE_ROLE_META[role].staffLabel}</h5><div className="grid gap-2 sm:grid-cols-2">{files.map((file) => <OrderFile key={file} path={file} />)}</div></div>)}</div>}
  </>;
}

function OrderFile({ path }: { path: string }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const demo = isDemoFilePath(path);
  const name = displayFileName(path);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void createSignedFileUrl(path).then((signedUrl) => { if (active) setUrl(signedUrl); })
      .catch((urlError: unknown) => { if (active) setError(urlError instanceof Error ? urlError.message : 'Could not open file.'); });
    return () => { active = false; };
  }, [demo, path]);
  if (demo) return <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">{name} · demo reference only</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{name}: {error}</p>;
  if (!url) return <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500">Preparing {name}…</p>;
  return <a href={url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-2 rounded-md border border-line bg-white p-2 hover:border-brand-200 hover:text-brand-700">
    {isImagePath(path) ? <img src={url} alt={name} className="size-12 rounded object-cover" /> : <span className="grid size-10 shrink-0 place-items-center rounded bg-brand-50 text-brand-700"><FileText size={17} /></span>}
    <span className="min-w-0 flex-1 truncate text-xs font-medium">{name}</span><Download className="shrink-0 text-slate-400 group-hover:text-brand-700" size={15} />
  </a>;
}

function describeConfigurationFromFields(
  configuration: unknown,
  fields: ServiceField[],
) {
  const config = configuration && typeof configuration === 'object' && !Array.isArray(configuration)
    ? configuration as Record<string, unknown>
    : {};
  const known = new Set(fields.map((field) => field.name));
  const rows: Array<{ key: string; label: string; value: string }> = [];
  for (const field of fields) {
    const raw = config[field.name];
    if (raw === null || raw === undefined || raw === '' || raw === false) continue;
    let value = typeof raw === 'boolean' ? 'Yes' : Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (field.type === 'file') {
      try {
        const files = JSON.parse(value) as unknown;
        value = Array.isArray(files) ? files.map((file) => displayFileName(String(file))).join(', ') : 'File attached';
      } catch { value = 'File attached'; }
    }
    rows.push({ key: field.name, label: field.label, value });
  }
  for (const [key, raw] of Object.entries(config)) {
    if (known.has(key) || raw === null || raw === undefined || raw === '' || raw === false) continue;
    rows.push({ key, label: humanize(key), value: Array.isArray(raw) ? raw.join(', ') : String(raw) });
  }
  return rows;
}

function OrderDetail({ bundle, catalog }: { bundle: OrderBundle; catalog: readonly ServiceRow[] }) {
  const { order, items } = bundle;
  return <div className="space-y-5">
    <Card>
      <CardHeader title="Client details" description="Contact and fulfilment information provided at checkout." />
      <CardBody><SpecList columns={2} items={[
        { label: 'Name', value: order.customer_name },
        { label: 'Email', value: order.customer_email },
        { label: 'Phone', value: order.customer_phone },
        { label: 'Preferred payment', value: humanize(order.payment_method) },
        { label: 'Fulfilment', value: humanize(order.delivery_method) },
        ...(order.delivery_address ? [{ label: 'Delivery address', value: order.delivery_address }] : []),
        ...(order.delivery_instructions ? [{ label: 'Delivery instructions', value: order.delivery_instructions }] : []),
        ...(order.customer_notes ? [{ label: 'Order notes', value: <span className="whitespace-pre-wrap">{order.customer_notes}</span> }] : []),
      ]} /></CardBody>
    </Card>
    <div className="space-y-4">
      {items.map((item, index) => <Card key={item.id}>
        <CardHeader title={`${index + 1}. ${item.service_name}`} description={`Quantity ${item.quantity} · ${item.estimated_amount === null ? 'Price to be quoted' : formatMoney(item.confirmed_amount ?? item.estimated_amount, { currency: order.currency, decimals: 2 })}`} />
        <CardBody>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Client requirements and selected options</h4>
          <OrderSpecifications item={item} catalog={catalog} />
          {item.production_notes && <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-800">Production notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.production_notes}</p></div>}
        </CardBody>
      </Card>)}
    </div>
  </div>;
}

function OrderArtworkShare({ order }: { order: OrderRow }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function retryTeamOrderAlert() {
    if (!supabase) return;
    setAlertBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('whatsapp-messages', { body: { action: 'new-order', orderId: order.id, retry: true } });
      if (invokeError) {
        const response = (invokeError as typeof invokeError & { context?: Response }).context;
        const details = response ? await response.clone().json().catch(() => null) : null;
        throw new Error(details?.error || invokeError.message || 'Could not resend the team order alert.');
      }
      if (data?.error) throw new Error(data.error);
      setNotice(data?.alreadyNotified ? 'The team WhatsApp alert was already delivered.' : 'Order alert accepted by WhatsApp for the team.');
    } catch (sendError) { setError(sendError instanceof Error ? sendError.message : 'Could not resend the team order alert.'); }
    finally { setAlertBusy(false); }
  }
  async function share() {
    if (!supabase || !file) return;
    if (file.size > 100 * 1024 * 1024) { setError('Artwork files must be 100 MB or smaller.'); return; }
    setBusy(true); setError(''); setNotice('');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${order.id}/${crypto.randomUUID()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from('order-artwork').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (uploadError) throw uploadError;
      const { data: signed, error: signedError } = await supabase.storage.from('order-artwork').createSignedUrl(path, 60 * 60);
      if (signedError || !signed?.signedUrl) throw signedError || new Error('Could not create a temporary artwork link.');
      const { data, error: invokeError } = await supabase.functions.invoke('whatsapp-messages', { body: { action: 'share-artwork', orderId: order.id, mediaUrl: signed.signedUrl, fileName: file.name, mimetype: file.type || undefined, caption: caption.trim() || undefined } });
      if (invokeError) {
        const response = (invokeError as typeof invokeError & { context?: Response }).context;
        const details = response ? await response.clone().json().catch(() => null) : null;
        throw new Error(details?.error || invokeError.message || 'WhatsApp could not send the artwork.');
      }
      if (data?.error) throw new Error(data.error);
      setNotice(`Artwork shared with ${order.customer_name} on WhatsApp.`);
      setFile(null); setCaption('');
    } catch (shareError) { setError(shareError instanceof Error ? shareError.message : 'Could not share the artwork.'); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader title="Design approval" description="Upload the designed artwork and send it to the client’s WhatsApp number for review." /><CardBody><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 p-3"><div><p className="text-sm font-semibold">Team order alert</p><p className="text-xs text-slate-500">Retry the alert if WhatsApp was unavailable when the order arrived.</p></div><button type="button" disabled={alertBusy} onClick={()=>void retryTeamOrderAlert()} className="btn-outline btn-sm">{alertBusy?<Loader2 className="animate-spin" size={14}/>:<Send size={14}/>} Retry team alert</button></div><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-medium">Artwork file<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" className="form-control mt-1 h-auto py-2" onChange={event=>setFile(event.target.files?.[0]||null)}/><span className="mt-1 block text-xs font-normal text-slate-500">PNG, JPG, WebP, SVG, or PDF · up to 100 MB</span></label><label className="text-sm font-medium">Message to client<input className="form-control mt-1" value={caption} onChange={event=>setCaption(event.target.value)} placeholder={`Please review design for ${order.reference}`}/></label><button type="button" disabled={!file||busy} onClick={()=>void share()} className="btn-primary">{busy?<Loader2 className="animate-spin" size={16}/>:<Send size={16}/>} Share artwork</button></div>{file&&<p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><ImagePlus size={14}/>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>}{error&&<p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-800">{error}</p>}{notice&&<p role="status" className="mt-3 rounded-lg bg-success-50 p-3 text-sm text-success-800">{notice}</p>}</CardBody></Card>;
}

export default function OrdersPage() {
  const { refreshKey, refresh } = useAdmin();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [catalog, setCatalog] = useState<ServiceRow[]>([]);
  const [customers, setCustomers] = useState<Array<{id:string;display_name:string;company_name:string|null;email:string;phone:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderBundle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualStep, setManualStep] = useState<'edit' | 'preview'>('edit');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  
  const [manual, setManual] = useState({ name: '', email: '', phone: '', serviceSlug: '', quantity: '1', amount: '', paymentMethod: 'mpesa', deliveryMethod: 'collection', deliveryAddress: '', notes: '', deliveryFee: '0' });
  const [configuration, setConfiguration] = useState<Record<string, string | number | boolean>>({});
  const [rates, setRates] = useState<PricingRate[]>([]);
  const selectedId = searchParams.get('order');
  const selectedService = catalog.find((service) => service.slug === manual.serviceSlug);
  const serviceFields = Array.isArray(selectedService?.fields) ? selectedService.fields as unknown as ServiceField[] : [];
  const visibleManualFields = serviceFields.filter((field) => field.type !== 'file' && field.name !== 'quantity' && (!field.showWhen || configuration[field.showWhen.field] === field.showWhen.equals));
  const manualEstimate = selectedService ? calculateEstimate(selectedService.slug, { ...configuration, quantity: Number(manual.quantity) || 1 }, rates, serviceFields) : null;

  useEffect(() => { void loadPricingRates().then(setRates).catch(() => setRates([])); }, []);
  useEffect(() => {
    if (manualEstimate !== null) setManual((current) => ({ ...current, amount: manualEstimate.toFixed(2) }));
  }, [manualEstimate]);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query === null) return;
    setSearch(query);
    setSearchParams((current) => { current.delete('q'); return current; }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSearchParams({});
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, setSearchParams]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void Promise.all([listOrders({ limit: 200 }), listServiceRecords(), supabase.from('client_contacts').select('id,display_name,company_name,email,phone').order('company_name',{ascending:false,nullsFirst:false}).limit(500)]).then(([rows, services, clientResult]) => {
      if (!active) return;
      setOrders(rows);
      setCatalog(services);
      if (clientResult.error) throw clientResult.error;
      setCustomers(clientResult.data ?? []);
      setError('');
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load orders.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let active = true;
    setDetailLoading(true);
    void getOrderBundle(selectedId).then((bundle) => {
      if (!active) return;
      setSelected(bundle);
      if (!bundle) toast.error('Order details could not be found or are not available to this staff role.');
    }).catch((loadError: unknown) => {
      if (active) toast.error(loadError instanceof Error ? loadError.message : 'Could not load order details.');
    }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, toast]);

  function changeConfiguration(name: string, value: string | number | boolean) {
    setConfiguration((current) => {
      const next = { ...current, [name]: value };
      if (name === 'artwork' && value !== 'Need design assistance') {
        serviceFields.filter((field) => field.showWhen?.field === 'artwork').forEach((field) => { delete next[field.name]; });
      }
      return next;
    });
  }

  function reviewManualOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService || !supabase) return;
    const orderConfiguration = { ...configuration, quantity: Number(manual.quantity) || 1 };
    const missing = serviceFields.filter((field) => field.required && field.type !== 'file' && (!field.showWhen || orderConfiguration[field.showWhen.field] === field.showWhen.equals) && (field.type === 'checkbox' ? orderConfiguration[field.name] !== true : orderConfiguration[field.name] === undefined || orderConfiguration[field.name] === '')).map((field) => field.label);
    if (missing.length) { setManualError(`Complete these service details: ${missing.join(', ')}.`); return; }
    const amount = Number(manual.amount);
    if (!Number.isFinite(amount) || amount < 0) { setManualError('Enter the agreed order amount.'); return; }
    setManualError('');
    setManualStep('preview');
  }

  async function createManualOrder() {
    if (!selectedService || !supabase) return;
    const orderConfiguration = { ...configuration, quantity: Number(manual.quantity) || 1 };
    const fee = manual.deliveryMethod === 'collection' ? 0 : Number(manual.deliveryFee || 0);
    const amount = Number(manual.amount) + fee;
    setManualSaving(true); setManualError('');
    let createdReference = '';
    try {
      const { data, error: createError } = await supabase.rpc('create_admin_manual_order', {
        p_customer_name: manual.name,
        p_customer_email: manual.email,
        p_customer_phone: manual.phone,
        p_payment_method: manual.paymentMethod,
        p_delivery_method: manual.deliveryMethod,
        p_delivery_address: manual.deliveryAddress || null,
        p_delivery_instructions: null,
        p_customer_notes: manual.notes || null,
        p_service_slug: selectedService.slug,
        p_configuration: orderConfiguration,
        p_quantity: Number(manual.quantity) || 1,
        p_amount: Number(manual.amount),
        p_delivery_fee: fee,
      });
      if (createError) throw createError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.order_id || !row?.invoice_id || !row?.reference) throw new Error('Order was created without its invoice details. Refresh the page and check the order list.');
      createdReference = String(row.reference);
      let whatsappNotified = false;
      const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke('whatsapp-messages', { body: { action: 'new-order', orderId: row.order_id } });
      if (whatsappError) console.error('Manual order saved, but WhatsApp notification failed.', whatsappError);
      else whatsappNotified = whatsappData?.ok === true;
      try {
        const delivery = await sendInvoiceEmail(String(row.invoice_id));
        const sentChannels = [delivery.emailSent ? 'email' : '', delivery.whatsappSent ? 'WhatsApp' : ''].filter(Boolean);
        const failedChannels = [
          !delivery.emailSent ? `Email: ${delivery.emailError || 'not accepted by Resend'}` : '',
          !delivery.whatsappSent ? `WhatsApp: ${delivery.whatsappError || 'not accepted by provider'}` : '',
        ].filter(Boolean);
        if (failedChannels.length) {
          toast.error(`Order ${createdReference} was saved. Invoice delivery was ${sentChannels.length ? 'partial' : 'not confirmed'} (${failedChannels.join(' · ')}). Retry it from Finance → Invoices.`);
        } else {
          toast.success(`Order ${createdReference} was saved and its invoice was sent by email and WhatsApp to ${manual.email} / ${manual.phone}.${whatsappNotified ? ' Team WhatsApp alert sent.' : ''}`);
        }
      } catch (emailError) {
        toast.error(`Order ${createdReference} was saved, but invoice delivery failed: ${emailError instanceof Error ? emailError.message : 'Please retry it from Finance → Invoices.'}`);
      }
      setManualOpen(false);
      setManualStep('edit');
      setManual({ name: '', email: '', phone: '', serviceSlug: '', quantity: '1', amount: '', paymentMethod: 'mpesa', deliveryMethod: 'collection', deliveryAddress: '', notes: '', deliveryFee: '0' });
      setConfiguration({});
      refresh();
    } catch (createError) {
      setManualError(createError instanceof Error ? createError.message : 'The manual order could not be saved.');
    } finally { setManualSaving(false); }
  }

  async function deleteOrder(order: OrderRow) {
    if (!supabase || !window.confirm(`Delete order ${order.reference}? This permanently removes its invoice, payment/order records, proofs, and uploaded files.`)) return;
    setDeletingId(order.id);
    try {
      const bundle = await getOrderBundle(order.id);
      if (!bundle) throw new Error('Order details could not be loaded for cleanup. Nothing was deleted.');
      const customerFiles = new Set<string>();
      for (const item of bundle.items) {
        for (const path of item.files ?? []) {
          if (path && !path.startsWith('DEMO FILE') && !/^https?:\/\//i.test(path)) customerFiles.add(path);
        }
        const itemConfig = item.configuration && typeof item.configuration === 'object' && !Array.isArray(item.configuration)
          ? item.configuration as Record<string, unknown> : {};
        const service = catalog.find(record => record.slug === item.service_slug);
        const fileFields = Array.isArray(service?.fields) ? service.fields as unknown as ServiceField[] : [];
        for (const field of fileFields.filter(candidate => candidate.type === 'file')) {
          const raw = itemConfig[field.name];
          if (typeof raw !== 'string' || !raw) continue;
          let values: unknown = raw;
          try { values = JSON.parse(raw) as unknown; } catch { /* A single storage path is also valid. */ }
          for (const path of Array.isArray(values) ? values : [values]) {
            if (typeof path === 'string' && path && !path.startsWith('DEMO FILE') && !/^https?:\/\//i.test(path)) customerFiles.add(path);
          }
        }
      }
      for (const proof of bundle.proofs) {
        if (proof.file_path && !/^https?:\/\//i.test(proof.file_path)) customerFiles.add(proof.file_path);
      }
      const { data: artwork, error: artworkListError } = await supabase.storage.from('order-artwork').list(order.id, { limit: 1000 });
      if (artworkListError) throw new Error(`Could not list this order’s artwork files: ${artworkListError.message}`);
      const artworkPaths = (artwork ?? []).filter(file => file.name && file.id).map(file => `${order.id}/${file.name}`);
      if (artworkPaths.length) {
        const { error: artworkRemoveError } = await supabase.storage.from('order-artwork').remove(artworkPaths);
        if (artworkRemoveError) throw new Error(`Could not remove the order’s artwork: ${artworkRemoveError.message}`);
      }
      const itemIds = bundle.items.map(item => item.id);
      const removableCustomerFiles: string[] = [];
      for (const path of customerFiles) {
        const { data: otherItemRefs, error: referenceError } = await supabase.from('order_items').select('id').neq('order_id', order.id).overlaps('files', [path]).limit(1);
        if (referenceError) throw new Error(`Could not check whether a client file is shared with another order: ${referenceError.message}`);
        const { data: proofRefs, error: proofReferenceError } = await supabase.from('proof_reviews').select('order_item_id').eq('file_path', path).limit(20);
        if (proofReferenceError) throw new Error(`Could not check whether a proof file is shared with another order: ${proofReferenceError.message}`);
        const hasOtherProofRef = (proofRefs ?? []).some(proof => !itemIds.includes(proof.order_item_id));
        if (!otherItemRefs?.length && !hasOtherProofRef) removableCustomerFiles.push(path);
      }
      if (removableCustomerFiles.length) {
        const { error: filesRemoveError } = await supabase.storage.from('customer-files').remove(removableCustomerFiles);
        if (filesRemoveError) throw new Error(`Could not remove the order’s client files: ${filesRemoveError.message}`);
      }
      const paymentDocumentPaths = [
        ...bundle.invoices.map(invoice => `invoices/${invoice.id}.pdf`),
        ...bundle.payments.map(payment => `receipts/${payment.id}.pdf`),
      ];
      if (paymentDocumentPaths.length) {
        const { error: documentRemoveError } = await supabase.storage.from('payment-documents').remove(paymentDocumentPaths);
        if (documentRemoveError) throw new Error(`Could not remove generated invoice or receipt PDFs: ${documentRemoveError.message}`);
      }
      const { error: deleteError } = await supabase.rpc('delete_admin_order', { p_order_id: order.id });
      if (deleteError) throw deleteError;
      setOrders(current => current.filter(item => item.id !== order.id));
      if (selectedId === order.id) { setSelected(null); setSearchParams({}); }
      toast.success(`Order ${order.reference}, its invoice records, and uploaded files were deleted.`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete order.'); }
    finally { setDeletingId(''); }
  }

  async function openOrderPayment(order: OrderRow) {
    if (!supabase) return;
    try {
      const { data: invoices, error: invoiceError } = await supabase.from('invoices').select('id,total,amount_paid,status').eq('order_id', order.id).in('status', ['issued','partially_paid']).order('created_at', { ascending: false }).limit(10);
      if (invoiceError) throw invoiceError;
      const invoice = (invoices ?? []).find(row => Number(row.total) > Number(row.amount_paid));
      if (!invoice) { toast.error('This order has no active invoice with a balance due. Create or issue its invoice in Finance → Invoices.'); return; }
      navigate(`/pay/${invoice.id}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not open the payment page for this order.'); }
  }

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => (statusFilter === 'all' || order.status === statusFilter)
      && (!query || [order.reference, order.customer_name, order.customer_email, order.customer_phone].some((value) => value.toLowerCase().includes(query))));
  }, [orders, search, statusFilter]);

  if (!supabase) return <ModuleStub module="orders" />;

  return <div className="space-y-6">
    <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-line bg-white px-5 py-5 shadow-xs sm:px-6">
      <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" />
      <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-brand-700"><span className="size-1.5 rounded-full bg-accent-600" />Commerce</div><h2 className="mt-1 text-2xl font-bold tracking-tight">Orders</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review the client’s selections, specifications, files and delivery preferences for each order.</p></div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><label className="relative w-full sm:w-72"><span className="sr-only">Search orders</span><PackageSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input className="form-control pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or reference" /></label><button type="button" onClick={()=>{setManualOpen(true);setManualError('');}} className="btn-primary shrink-0"><Plus size={16}/> Enter manual order</button></div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">{error}</p>}
    <Card>
      <CardHeader title="Customer orders" description="Select an order to see every answer captured in its order form." actions={<select aria-label="Filter orders by status" className="form-control min-w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select>} />
      {loading ? <div className="p-12 text-center text-sm text-slate-500"><Loader2 size={20} className="mx-auto mb-2 animate-spin text-brand-600" />Loading customer orders…</div> : visibleOrders.length === 0 ? <div className="p-12 text-center"><ClipboardList className="mx-auto text-slate-400" size={26} /><p className="mt-3 font-semibold text-slate-700">{orders.length ? 'No orders match your search' : 'No customer orders yet'}</p></div> : <div className="divide-y divide-line">{visibleOrders.map((order) => <div key={order.id} className="grid w-full gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1.1fr_1fr_auto_auto_auto] sm:items-center sm:px-6">
        <button type="button" onClick={() => setSearchParams({ order: order.id })} className="contents text-left">
        <span className="min-w-0"><span className="block truncate font-semibold text-slate-900">{order.reference}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarClock size={13} />{formatDateTime(order.created_at)}</span></span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{order.customer_name}</span><span className="block truncate text-xs text-slate-500">{order.customer_email}</span></span>
        <span className="text-sm capitalize text-slate-600">{humanize(order.payment_status)}</span>
        </button>
        {order.status === 'awaiting_payment' && order.payment_status !== 'paid' ? <button type="button" onClick={()=>void openOrderPayment(order)} className="inline-flex w-fit items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100" title="Open this order’s invoice payment page">{statusMeta('order', 'awaiting_payment').label} <ArrowRight size={14}/></button> : <StatusBadge {...statusMeta('order', order.payment_status === 'paid' && order.status === 'awaiting_payment' ? 'awaiting_review' : order.status)} />}
        <button type="button" onClick={() => setSearchParams({ order: order.id })} className="hidden text-slate-400 hover:text-brand-700 sm:block" aria-label={`Review order ${order.reference}`}><ArrowRight size={17} /></button>
        <button type="button" disabled={deletingId===order.id} onClick={()=>void deleteOrder(order)} className="btn-outline btn-sm text-red-700" aria-label={`Delete order ${order.reference}`}>{deletingId===order.id?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}<span className="sr-only sm:not-sr-only">Delete</span></button>
      </div>)}</div>}
    </Card>

    <Modal open={manualOpen} onClose={()=>{if(!manualSaving)setManualOpen(false);}} title={manualStep==='preview'?'Review invoice':'Enter a client order'} description={manualStep==='preview'?'Check the invoice details before saving the order and emailing it to the client.':'Record the client’s chosen service and requirements, then issue an invoice with a link to track progress.'} size="xl">
      {manualStep==='preview'&&selectedService ? <div className="space-y-5"><div className="rounded-xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-900">Preview only. The invoice number and tracking link will be assigned when you confirm and save.</div><CheckoutPrintout kind="invoice" number="Assigned when saved" orderReference="Assigned when saved" customerName={manual.name} customerEmail={manual.email} lines={[{description:selectedService.name,quantity:Number(manual.quantity)||1,amount:Number(manual.amount)||0,details:[...describeConfigurationFromFields(configuration,serviceFields).map(({label,value})=>`${label}: ${value}`),...(Number(manual.deliveryFee)>0?[`Delivery fee: KES ${Number(manual.deliveryFee).toFixed(2)}`]:[])]}]} subtotal={Number(manual.amount)||0} tax={0} total={(Number(manual.amount)||0)+(Number(manual.deliveryFee)||0)} paymentMethod={manual.paymentMethod}/><div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-outline" disabled={manualSaving} onClick={()=>{setManualStep('edit');setManualError('');}}>Back to edit</button><button type="button" disabled={manualSaving} onClick={()=>void createManualOrder()} className="btn-primary">{manualSaving?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>} {manualSaving?'Saving order and emailing invoice…':'Confirm, save order & email invoice'}</button></div>{manualError&&<p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{manualError}</p>}</div> : <form id="manual-order-form" onSubmit={reviewManualOrder} className="space-y-6">
        <section><h3 className="mb-3 font-semibold">Client details</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Saved client<select className="form-control mt-1" value="" onChange={event=>{const client=customers.find(item=>item.id===event.target.value);if(client)setManual(current=>({...current,name:client.company_name?.trim()||client.display_name,email:client.email,phone:client.phone}));}}><option value="">Choose company or individual</option>{[...customers].sort((a,b)=>Number(Boolean(b.company_name?.trim()))-Number(Boolean(a.company_name?.trim()))).map(client=><option key={client.id} value={client.id}>{client.company_name?.trim()||client.display_name}{client.company_name?.trim()?` · ${client.display_name}`:''}</option>)}</select></label><label className="text-sm font-medium">Company or client name *<input required className="form-control mt-1" value={manual.name} onChange={event=>setManual(current=>({...current,name:event.target.value}))}/></label><label className="text-sm font-medium">Email address *<input required type="email" className="form-control mt-1" value={manual.email} onChange={event=>setManual(current=>({...current,email:event.target.value}))}/></label><label className="text-sm font-medium">Phone number *<input required className="form-control mt-1" value={manual.phone} onChange={event=>setManual(current=>({...current,phone:event.target.value}))}/></label></div></section>
        <section className="border-t border-line pt-5"><h3 className="mb-3 font-semibold">Service and order requirements</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Service *<select required className="form-control mt-1" value={manual.serviceSlug} onChange={event=>{setManual(current=>({...current,serviceSlug:event.target.value,amount:''}));setConfiguration({});}}><option value="">Select a service</option>{catalog.filter(service=>service.is_active).map(service=><option key={service.slug} value={service.slug}>{service.name}</option>)}</select></label>
          {selectedService&&<><label className="text-sm font-medium">Quantity *<input required type="number" min="1" step="1" className="form-control mt-1" value={manual.quantity} onChange={event=>setManual(current=>({...current,quantity:event.target.value}))}/></label>{visibleManualFields.map(field=><div key={field.name} className={field.type==='textarea'?'sm:col-span-2':''}><label className="text-sm font-medium" htmlFor={`manual-${field.name}`}>{field.label}{field.required?' *':''}</label>{field.type==='select'?<select id={`manual-${field.name}`} required={field.required} className="form-control mt-1" value={String(configuration[field.name]??'')} onChange={event=>changeConfiguration(field.name,event.target.value)}><option value="">Select an option</option>{field.options?.map(option=><option key={option} value={option}>{option}{Number(field.optionPrices?.[option]??0)>0?` — +KES ${Number(field.optionPrices?.[option]).toLocaleString('en-KE')}`:''}</option>)}</select>:field.type==='textarea'?<textarea id={`manual-${field.name}`} required={field.required} className="form-control mt-1 min-h-24" value={String(configuration[field.name]??'')} placeholder={field.help??''} onChange={event=>changeConfiguration(field.name,event.target.value)}/>:field.type==='checkbox'?<input id={`manual-${field.name}`} type="checkbox" className="ml-2 mt-3 size-4 accent-brand-600" required={field.required} checked={Boolean(configuration[field.name])} onChange={event=>changeConfiguration(field.name,event.target.checked)}/>:<input id={`manual-${field.name}`} type={field.type==='number'?'number':'text'} min={field.min} step={field.step} required={field.required} className="form-control mt-1" value={String(configuration[field.name]??'')} placeholder={field.help??''} onChange={event=>changeConfiguration(field.name,field.type==='number'?Number(event.target.value):event.target.value)}/>}{field.help&&<p className="mt-1 text-xs text-slate-500">{field.help}</p>}</div>)}<p className="sm:col-span-2 rounded-lg border border-dashed border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">File upload questions are skipped here. Record the preferences the client has already shared; their files are not requested again.</p></>}
        </div></section>
        <section className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2"><h3 className="sm:col-span-2 font-semibold">Invoice and fulfilment</h3><label className="text-sm font-medium">Agreed amount (KES) *<input required type="number" min="0" step="0.01" className="form-control mt-1" value={manual.amount} onChange={event=>setManual(current=>({...current,amount:event.target.value}))}/><span className="mt-1 block text-xs font-normal text-slate-500">Instant pricing fills this from active rates; review or enter the amount agreed with the client.</span></label><label className="text-sm font-medium">Delivery fee (KES)<input type="number" min="0" step="0.01" disabled={manual.deliveryMethod==='collection'} className="form-control mt-1" value={manual.deliveryMethod==='collection'?'0':manual.deliveryFee} onChange={event=>setManual(current=>({...current,deliveryFee:event.target.value}))}/><span className="mt-1 block text-xs font-normal text-slate-500">Shows separately below subtotal on the invoice.</span></label><label className="text-sm font-medium">Preferred payment method<select className="form-control mt-1" value={manual.paymentMethod} onChange={event=>setManual(current=>({...current,paymentMethod:event.target.value}))}><option value="mpesa">M-Pesa</option><option value="bank">Bank</option></select></label><label className="text-sm font-medium">Delivery or collection<select className="form-control mt-1" value={manual.deliveryMethod} onChange={event=>setManual(current=>({...current,deliveryMethod:event.target.value,deliveryFee:event.target.value==='collection'?'0':current.deliveryFee}))}><option value="collection">Collect from us</option><option value="local_delivery">Local delivery</option><option value="courier">Courier</option></select></label>{manual.deliveryMethod!=='collection'&&<label className="text-sm font-medium">Delivery address *<input required className="form-control mt-1" value={manual.deliveryAddress} onChange={event=>setManual(current=>({...current,deliveryAddress:event.target.value}))}/></label>}<label className="text-sm font-medium sm:col-span-2">Order notes<textarea className="form-control mt-1 min-h-20" value={manual.notes} onChange={event=>setManual(current=>({...current,notes:event.target.value}))}/></label>{manualError&&<p role="alert" className="sm:col-span-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-800">{manualError}</p>}</section>
        <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" className="btn-outline" disabled={manualSaving} onClick={()=>setManualOpen(false)}>Cancel</button><button type="submit" form="manual-order-form" disabled={manualSaving||!selectedService} className="btn-primary">Preview invoice <ArrowRight size={16}/></button></div>
      </form>}
    </Modal>

    {(selectedId || detailLoading) && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchParams({}); }}>
      <section role="dialog" aria-modal="true" aria-label="Order details" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-line bg-slate-50 shadow-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-brand-700">Order details</p><h3 className="mt-1 text-lg font-bold">{selected?.order.reference ?? 'Loading…'}</h3></div><button type="button" onClick={() => setSearchParams({})} className="btn-outline btn-sm">Close</button></header>
        <div className="p-4 sm:p-7">{detailLoading ? <div className="p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin text-brand-600" size={22} />Loading client order information…</div> : selected ? <><div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-line bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><UserRound size={15} />Client</div><p className="mt-2 font-semibold">{selected.order.customer_name}</p><p className="break-all text-xs text-slate-500">{selected.order.customer_email}</p><p className="mt-1 text-xs text-slate-500">{selected.order.customer_phone}</p></div><div className="rounded-xl border border-line bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPin size={15} />Delivery preference</div><p className="mt-2 font-semibold">{humanize(selected.order.delivery_method)}</p><p className="mt-1 text-sm text-slate-600">{selected.order.delivery_address || 'Collection from us'}</p>{selected.order.delivery_instructions && <p className="mt-2 text-xs text-slate-500">{selected.order.delivery_instructions}</p>}</div><div className="rounded-xl border border-line bg-white p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FileText size={15} />Order notes</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.order.customer_notes || 'No additional order notes.'}</p></div></div><OrderArtworkShare order={selected.order}/><div className="mt-5"><OrderDetail bundle={selected} catalog={catalog} /></div></> : <p className="p-10 text-center text-sm text-slate-500">Order could not be loaded.</p>}</div>
      </section>
    </div>}
  </div>;
}

const origins = new Set(['https://nexxacrafts.co.ke','https://www.nexxacrafts.co.ke','https://nexxacrafts.vercel.app','http://localhost:5173','http://localhost:5174']);
const cors = (origin: string | null) => ({ ...(origin && origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary':'Origin' });
const json = (body: Record<string,unknown>, status=200, origin: string|null=null) => new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json','Cache-Control':'no-store'}});
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
const text=(s:unknown,n=200)=>typeof s==='string'?s.trim().slice(0,n):'';

async function sendEmail(to:string,subject:string,html:string,plain:string){
  const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
  if(!key||!from||!to) throw new Error('Email delivery is not configured.');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],reply_to:Deno.env.get('RESEND_REPLY_TO')||from,subject,html,text:plain})});
  if(!r.ok) throw new Error(`Resend rejected email (${r.status}): ${(await r.text()).slice(0,400)}`);
}
function emailFrame(title:string,body:string){return `<!doctype html><html><body style="margin:0;background:#edf2fa;font-family:Arial,sans-serif;color:#17243a;padding:28px 12px"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="100%" style="max-width:620px;background:white;border:1px solid #dce5f2;border-radius:16px;overflow:hidden"><tr><td style="height:5px;background:#0341fc"></td></tr><tr><td style="padding:22px 28px;background:#101b34;color:white;font-size:23px;font-weight:bold">Nexxa<span style="color:#ef4444">CRAFT</span></td></tr><tr><td style="padding:28px"><p style="font-size:11px;color:#0341fc;font-weight:bold;letter-spacing:1.5px">${title.toUpperCase()}</p>${body}</td></tr><tr><td style="padding:16px;text-align:center;background:#f7f9fc;color:#76839a;font-size:11px">NexxaCraft · Design · Print · Build</td></tr></table></td></tr></table></body></html>`;}
async function rest(url:string,key:string,path:string,init:RequestInit={}){const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(init.headers||{})}});const body=await r.text();if(!r.ok)throw new Error(`Database request failed (${r.status}): ${body.slice(0,500)}`);return body?JSON.parse(body):null;}
const money=(v:unknown)=>`KES ${Number(v).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function normalizePhone(input:string){const d=input.replace(/\D/g,'');if(/^0[71]\d{8}$/.test(d))return `254${d.slice(1)}`;if(/^254[71]\d{8}$/.test(d))return d;if(/^[71]\d{8}$/.test(d))return `254${d}`;throw new Error('Enter a valid Kenyan M-Pesa phone number.');}

async function deliverPendingEmails(url:string,service:string,paymentId:unknown){
  const id=String(paymentId);const rows=await rest(url,service,`payment_email_outbox?select=*&payment_id=eq.${encodeURIComponent(id)}&limit=1`) as Array<Record<string,unknown>>,row=rows[0];if(!row)return;
  const receipt=text(row.transaction_reference,100),amount=Number(row.payment_amount),balance=Number(row.invoice_total)-Number(row.prior_amount_paid),money=(v:unknown)=>`KES ${Number(v).toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  if(!row.customer_email_sent_at){await sendEmail(text(row.customer_email,254),`Payment receipt · ${text(row.invoice_number,80)}`,emailFrame('Payment receipt',`<h1 style="margin:0 0 12px">Payment received</h1><p>Hello ${esc(row.customer_name)}, your M-Pesa payment has been confirmed.</p><div style="padding:16px;background:#f0f4ff;border-radius:10px"><p>Invoice: <b>${esc(row.invoice_number)}</b></p><p>Amount paid: <b>${money(amount)}</b></p><p>Receipt: <b>${esc(receipt||'Confirmed')}</b></p><p>Balance due: <b>${money(balance)}</b></p></div><p>Thank you for choosing NexxaCraft.</p>`),`Payment received for invoice ${text(row.invoice_number,80)}. Amount ${money(amount)}. M-Pesa receipt ${receipt}.`);await rest(url,service,`payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({customer_email_sent_at:new Date().toISOString()})});await rest(url,service,`payments?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({receipt_sent_at:new Date().toISOString()})});}
  if(!row.admin_email_sent_at){await sendEmail(Deno.env.get('PAYMENT_ADMIN_EMAIL')||'nexxacrafts@gmail.com',`Payment received · ${text(row.invoice_number,80)}`,emailFrame('Payment notification',`<h1>Successful payment</h1><p>${esc(row.customer_name)} paid <b>${money(amount)}</b> for invoice <b>${esc(row.invoice_number)}</b>.</p><p>M-Pesa receipt: <b>${esc(receipt||'Confirmed')}</b></p><p>Customer email: ${esc(row.customer_email)}</p>`),`Payment received: ${money(amount)}, invoice ${text(row.invoice_number,80)}, M-Pesa receipt ${receipt}.`);await rest(url,service,`payment_email_outbox?payment_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({admin_email_sent_at:new Date().toISOString()})});}
}
async function notifyAdmins(url:string,service:string,paymentId:unknown){
  const id=String(paymentId),rows=await rest(url,service,`payment_admin_notifications?select=payment_id,dashboard_notified_at&payment_id=eq.${encodeURIComponent(id)}&limit=1`) as Array<Record<string,unknown>>;if(!rows[0]||rows[0].dashboard_notified_at)return;
  const paymentRows=await rest(url,service,`payments?select=invoice_id,amount,transaction_reference&id=eq.${encodeURIComponent(id)}`) as Array<Record<string,unknown>>,payment=paymentRows[0];if(!payment)return;
  const invoiceRows=await rest(url,service,`invoices?select=invoice_number,order_id&id=eq.${encodeURIComponent(String(payment.invoice_id))}`) as Array<Record<string,unknown>>,invoice=invoiceRows[0];if(!invoice)return;
  const orderRows=await rest(url,service,`orders?select=customer_name&id=eq.${encodeURIComponent(String(invoice.order_id))}`) as Array<Record<string,unknown>>,order=orderRows[0];
  const profiles=await rest(url,service,'profiles?select=id&role=eq.admin') as Array<{id:string}>;
  if(profiles.length){
    const message=`${text(order?.customer_name,120)||'A customer'} paid ${money(payment.amount)} for invoice ${text(invoice.invoice_number,80)}${payment.transaction_reference?` (M-Pesa ${text(payment.transaction_reference,50)})`:''}.`;
    const notifications=profiles.map(profile=>({user_id:profile.id,title:'Payment received',message,link:'/admin/payments'}));
    await rest(url,service,'notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(notifications)});
  }
  await rest(url,service,`payment_admin_notifications?payment_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({dashboard_notified_at:new Date().toISOString()})});
}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin');if(req.method==='OPTIONS')return new Response('ok',{headers:cors(origin)});if(req.method!=='POST')return json({error:'Method not allowed.'},405,origin);
  const queryAction=new URL(req.url).searchParams.get('action');
  const payload=await req.json().catch(()=>({})) as Record<string,unknown>;const action=queryAction==='callback'?'callback':text(payload.action,30);
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!service)return json({error:'Payment service is not configured.'},503,origin);

  if(action==='callback'){
    const response=(payload.response&&typeof payload.response==='object'?payload.response:payload) as Record<string,unknown>;
    const ref=text(response.ExternalReference??payload.user_reference,100),status=text(response.Status,30).toLowerCase(),success=payload.status===true&&status==='success'&&Number(response.ResultCode)===0;
    if(!ref)return json({received:true},200,origin);
    try{
      const query=new URLSearchParams({select:'id,invoice_id,amount,status,order_id,provider_reference',provider:'eq.payhero',provider_reference:`eq.${ref}`,limit:'1'});
      const rows=await rest(url,service,`payments?${query}`) as Array<Record<string,unknown>>,payment=rows[0];if(!payment)return json({received:true},200,origin);
      if(!success){if(payment.status==='initiated')await rest(url,service,`payments?id=eq.${payment.id}&status=eq.initiated`,{method:'PATCH',body:JSON.stringify({status:'failed',failure_reason:text(response.ResultDesc,300)||'Payment was not completed.'})});return json({received:true},200,origin);}
      const amount=Number(response.Amount);if(!Number.isFinite(amount)||amount<=0)return json({received:true},200,origin);
      const claimed=await rest(url,service,'rpc/confirm_payhero_payment',{method:'POST',body:JSON.stringify({p_external_reference:ref,p_provider_reference:text(response.PayHeroReference??response.reference,100),p_transaction_reference:text(response.MpesaReceiptNumber,100),p_paid_amount:amount,p_phone:text(response.Phone,40)})}) as Array<Record<string,unknown>>;
      const paid=claimed?.[0];if(!paid)return json({received:true},200,origin);
      try{await notifyAdmins(url,service,paid.payment_id);}catch(e){console.error('Admin dashboard notification failed',e);}
      try{await deliverPendingEmails(url,service,paid.payment_id);}catch(e){console.error('Payment was recorded, but email delivery is pending retry',e);}
      return json({received:true},200,origin);
    }catch(e){console.error('PayHero callback processing failed',e);return json({received:true},200,origin);}
  }

  if(action!=='invoice'&&action!=='initiate'&&action!=='status'&&action!=='retry-notifications')return json({error:'Unknown payment action.'},400,origin);
  if(action==='retry-notifications'){
    const authorization=req.headers.get('authorization');if(!authorization||!anon)return json({error:'Please sign in to retry payment notifications.'},401,origin);
    const userResponse=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization}});if(!userResponse.ok)return json({error:'Your sign-in session has expired.'},401,origin);
    const authUser=await userResponse.json() as {id:string};
    const profiles=await rest(url,service,`profiles?select=role&id=eq.${authUser.id}&limit=1`) as Array<{role:string}>;
    if(!profiles[0]||!['admin','finance'].includes(profiles[0].role))return json({error:'Admin access is required.'},403,origin);
    const paymentId=text(payload.paymentId,50);if(!/^[0-9a-f-]{36}$/i.test(paymentId))return json({error:'A valid payment ID is required.'},400,origin);
    try{await notifyAdmins(url,service,paymentId);await deliverPendingEmails(url,service,paymentId);return json({ok:true},200,origin);}catch(e){return json({error:e instanceof Error?e.message:'Could not resend notifications.'},502,origin);}
  }
  if(action==='invoice'){
    const invoiceId=text(payload.invoiceId,50);if(!/^[0-9a-f-]{36}$/i.test(invoiceId))return json({error:'Invalid invoice.'},400,origin);
    try{
      const iq=new URLSearchParams({select:'id,invoice_number,customer_name,customer_email,total,amount_paid,status,order_id',id:`eq.${invoiceId}`,limit:'1'}),invoices=await rest(url,service,`invoices?${iq}`) as Array<Record<string,unknown>>,invoice=invoices[0];
      if(!invoice||!invoice.order_id||invoice.status==='draft'||invoice.status==='void')return json({error:'This invoice is not available for payment.'},404,origin);
      const oq=new URLSearchParams({select:'id,customer_id,customer_phone,reference',id:`eq.${invoice.order_id}`,limit:'1'}),orders=await rest(url,service,`orders?${oq}`) as Array<Record<string,unknown>>,order=orders[0];
      if(!order)return json({error:'Invoice order details are unavailable.'},404,origin);
      return json({invoice:{id:invoice.id,invoice_number:invoice.invoice_number,customer_name:invoice.customer_name,customer_email:invoice.customer_email,order_reference:order.reference,total:invoice.total,amount_due:Math.max(0,Number(invoice.total)-Number(invoice.amount_paid)),status:invoice.status},phone:order.customer_phone},200,origin);
    }catch(e){return json({error:e instanceof Error?e.message:'Could not load invoice.'},500,origin);}
  }
  if(action==='status'){
    const invoiceId=text(payload.invoiceId,50);if(!/^[0-9a-f-]{36}$/i.test(invoiceId))return json({error:'Invalid invoice.'},400,origin);
    try{
      const query=new URLSearchParams({select:'status,amount,transaction_reference,confirmed_at,receipt_sent_at,created_at',invoice_id:`eq.${invoiceId}`,provider:'eq.payhero',order:'created_at.desc',limit:'1'});
      const rows=await rest(url,service,`payments?${query}`) as Array<Record<string,unknown>>;
      const payment=rows[0];if(!payment)return json({payment:null},200,origin);
      return json({payment:{status:payment.status,amount:payment.amount,transaction_reference:payment.transaction_reference,confirmed_at:payment.confirmed_at,receipt_sent_at:payment.receipt_sent_at}},200,origin);
    }catch(e){return json({error:e instanceof Error?e.message:'Could not check payment status.'},500,origin);}
  }
  if(action==='initiate'){
    const invoiceId=text(payload.invoiceId,50);let phone='';try{phone=normalizePhone(text(payload.phone,40));}catch(e){return json({error:e instanceof Error?e.message:'Invalid phone number.'},400,origin);}
    const username=Deno.env.get('PAYHERO_API_USERNAME')?.trim(),password=Deno.env.get('PAYHERO_API_PASSWORD')?.trim(),basicToken=Deno.env.get('PAYHERO_BASIC_AUTH_TOKEN')?.trim(),channel=Number(Deno.env.get('PAYHERO_CHANNEL_ID')||6751);
    const authorization=basicToken?(basicToken.startsWith('Basic ')?basicToken:`Basic ${basicToken}`):(username&&password?`Basic ${btoa(`${username}:${password}`)}`:'');
    if(!authorization||!Number.isInteger(channel))return json({error:'PayHero is not fully configured. Set PAYHERO_BASIC_AUTH_TOKEN or both PAYHERO_API_USERNAME and PAYHERO_API_PASSWORD, plus a valid channel ID.'},503,origin);
    try{
    const iq=new URLSearchParams({select:'id,invoice_number,customer_name,customer_email,total,amount_paid,status,order_id',id:`eq.${invoiceId}`,limit:'1'}),invoices=await rest(url,service,`invoices?${iq}`) as Array<Record<string,unknown>>,invoice=invoices[0];if(!invoice||!invoice.order_id||['draft','void','paid'].includes(text(invoice.status)))return json({error:'This invoice cannot be paid.'},400,origin);
      const oq=new URLSearchParams({select:'id,customer_name,customer_phone',id:`eq.${invoice.order_id}`,limit:'1'}),orders=await rest(url,service,`orders?${oq}`) as Array<Record<string,unknown>>,order=orders[0];if(!order)return json({error:'Invoice order details are unavailable.'},404,origin);
      const amount=Math.ceil(Number(invoice.total)-Number(invoice.amount_paid));if(!Number.isFinite(amount)||amount<1)return json({error:'Invoice has no balance due.'},400,origin);
      const activeQuery=new URLSearchParams({select:'id',invoice_id:`eq.${invoice.id}`,provider:'eq.payhero',status:'in.(pending,initiated)',limit:'1'}),activeRows=await rest(url,service,`payments?${activeQuery}`) as Array<{id:string}>;
      if(activeRows.length)return json({error:'There is already an M-Pesa request awaiting a response. Complete or wait for it before requesting another prompt.'},409,origin);
      const externalRef=`${text(invoice.invoice_number,60)}-${crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()}`;
      let payment:Record<string,unknown>|undefined;
      try{const paymentInit=await rest(url,service,'payments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_id:order.id,invoice_id:invoice.id,method:'mpesa',amount,currency:'KES',status:'initiated',provider:'payhero',provider_reference:externalRef})}) as Array<Record<string,unknown>>;payment=paymentInit[0];}
      catch(error){
        if(error instanceof Error&&error.message.includes('already awaiting a result'))return json({error:'Another M-Pesa request was started for this invoice. Refresh to check its status.'},409,origin);
        throw error;
      }
      if(!payment?.id)return json({error:'Could not start an M-Pesa request.'},502,origin);
      const callbackUrl=`${url}/functions/v1/payhero-payments?action=callback`;
      const response=await fetch('https://backend.payhero.co.ke/api/v2/payments',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({amount,phone_number:phone,channel_id:channel,provider:'m-pesa',external_reference:externalRef,customer_name:text(invoice.customer_name,120),callback_url:callbackUrl})});
      const responseBody=await response.text();let data:Record<string,unknown>={};try{data=JSON.parse(responseBody) as Record<string,unknown>;}catch{/* Provider may return an empty or non-JSON response. */}
      if(!response.ok||data.success!==true){
        const providerMessage=text(data.message??data.error??data.detail??data.description,300);
        const failureReason=`PayHero HTTP ${response.status}${providerMessage?`: ${providerMessage}`:''}`;
        console.error('PayHero rejected the STK push request',{status:response.status,channel,providerMessage,externalReference:externalRef});
        await rest(url,service,`payments?id=eq.${payment.id}`,{method:'PATCH',body:JSON.stringify({status:'failed',failure_reason:failureReason})});
        return json({error:`PayHero rejected the M-Pesa request (HTTP ${response.status}).${providerMessage?` ${providerMessage}`:''}`},502,origin);
      }
      if(typeof data.reference==='string')await rest(url,service,`payments?id=eq.${payment.id}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({transaction_reference:`PayHero ${data.reference}`})});
      return json({ok:true,paymentId:payment.id,reference:externalRef,status:data.status||'QUEUED'},200,origin);
    }catch(e){console.error('Could not initiate PayHero payment',e);return json({error:e instanceof Error?e.message:'Could not start M-Pesa payment.'},500,origin);}
  }
});

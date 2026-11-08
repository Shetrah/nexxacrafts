import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, Mail, MapPin, MessageCircle, Phone, Send, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompanySettings } from '../context/CompanySettingsContext';
import { company } from '../content/company';
import { services } from '../lib/catalog';
import ScrollReveal from './ScrollReveal';

interface FormData { name: string; email: string; phone: string; service: string; message: string }
const initialFormData: FormData = { name: '', email: '', phone: '', service: '', message: '' };

const ContactSection: React.FC = () => {
  const settings = useCompanySettings();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [emailNoticeSent, setEmailNoticeSent] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [contactCheck, setContactCheck] = useState('');
  const serviceOptions = [...services.map((service) => service.name), 'I’m not sure yet'];
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.location)}`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setSubmitError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      if (!supabase) throw new Error('The enquiry form is temporarily unavailable. Please contact us directly by phone or email.');
      const { data, error } = await supabase.functions.invoke('contact-email', {
        body: {
          ...formData,
          name: formData.name.trim(), email: formData.email.trim(), phone: formData.phone.trim(),
          message: formData.message.trim(), contactCheck,
        },
      });
      if (error) throw error;
      if (data?.ignored) throw new Error('We could not verify this submission. Please refresh the page and try again.');
      setEmailNoticeSent(data?.notificationSent === true);
      setSubmitSuccess(true);
      setFormData(initialFormData);
      setContactCheck('');
    } catch (error) {
      setSubmitError(error instanceof Error && error.message.includes('verify this submission')
        ? error.message
        : 'We couldn’t send your enquiry just now. Please try again, or reach us using the phone and email details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <>
    <section className="contact-page-hero"><div className="container-shell relative z-10 grid items-end gap-8 py-16 md:py-20 lg:grid-cols-[1fr_.6fr]"><div><div className="eyebrow eyebrow-light"><Sparkles size={14}/> GET IN TOUCH</div><h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">Tell us what you’re<br/><span className="text-brand-300">looking to make.</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Share a few details about your idea. We’ll help you identify the right service and what happens next.</p></div><div className="contact-promise"><span className="font-mono text-xs uppercase tracking-[.18em] text-brand-300">A good place to start</span><p className="mt-3 text-xl font-bold leading-snug text-white">Your goal, your timeline, and anything you already have.</p><p className="mt-3 text-sm leading-6 text-slate-300">A rough brief is enough. You can include reference files when our team follows up.</p></div></div></section>

    <section id="contact" className="container-shell grid items-start gap-7 py-12 md:py-16 lg:grid-cols-[.78fr_1.22fr]">
      <ScrollReveal><aside className="contact-info-panel"><div className="eyebrow">CONTACT DETAILS</div><h2 className="mt-2 text-2xl font-bold">We’re ready to listen.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Choose the way that works best for you. Our team can help with a new project, a quote or a question about an existing order.</p>
        <div className="mt-7 space-y-3"><a className="contact-method" href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}><span className="contact-method-icon"><Phone size={18}/></span><span><span className="contact-method-label">Call us</span><span className="contact-method-value">{settings.phone}</span></span><ArrowUpRight size={16} className="ml-auto text-slate-400"/></a><a className="contact-method" href={`mailto:${settings.public_email}`}><span className="contact-method-icon"><Mail size={18}/></span><span><span className="contact-method-label">Email</span><span className="contact-method-value">{settings.public_email}</span></span><ArrowUpRight size={16} className="ml-auto text-slate-400"/></a><a className="contact-method" href={company.whatsappHref} target="_blank" rel="noreferrer"><span className="contact-method-icon contact-whatsapp-icon"><MessageCircle size={18}/></span><span><span className="contact-method-label">WhatsApp</span><span className="contact-method-value">Message our team</span></span><ArrowUpRight size={16} className="ml-auto text-slate-400"/></a><a className="contact-method" href={mapUrl} target="_blank" rel="noreferrer"><span className="contact-method-icon"><MapPin size={18}/></span><span><span className="contact-method-label">Location</span><span className="contact-method-value">{settings.location}</span></span><ArrowUpRight size={16} className="ml-auto text-slate-400"/></a></div>
        <div className="contact-hours"><div className="flex items-center gap-2 font-bold text-slate-900"><Clock3 size={17} className="text-brand-600"/> Usual business hours</div><div className="mt-3 space-y-2">{company.hours.map((slot)=><div key={slot.days} className="flex justify-between gap-3 text-xs text-slate-600"><span>{slot.days}</span><span className="text-right font-semibold text-slate-800">{slot.time}</span></div>)}</div></div>
        <div className="contact-location-card"><div className="contact-map-mark"><MapPin size={20}/></div><div><p className="font-bold text-slate-900">Serving customers across Kenya</p><p className="mt-1 text-xs leading-5 text-slate-600">{company.serviceArea}</p></div><a href={mapUrl} target="_blank" rel="noreferrer" className="contact-map-link" aria-label="Open nexxacrafts location in Google Maps"><ArrowUpRight size={16}/></a></div>
      </aside></ScrollReveal>

      <ScrollReveal delay={90}><div className="contact-form-panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="eyebrow">PROJECT ENQUIRY</span><h2 className="mt-2 text-2xl font-bold md:text-3xl">Request a conversation</h2><p className="mt-2 text-sm leading-6 text-slate-600">A few details help us direct your request to the right people.</p></div><span className="contact-form-mark"><Send size={19}/></span></div>
        {submitSuccess&&<div role="status" aria-live="polite" className="contact-success mt-6"><CheckCircle2 size={20}/><div><p className="font-bold">Your enquiry has been received.</p><p className="mt-1 text-sm">{emailNoticeSent ? 'We’ll follow up using the contact details you provided.' : 'Your request was saved, but our email alert could not be sent. We’ll follow up using the contact details you provided.'}</p></div></div>}
        {submitError&&<div role="alert" className="contact-error mt-6">{submitError}</div>}
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label htmlFor="contact-reference-check">Leave this field empty</label><input id="contact-reference-check" name="contact_reference_check" type="text" tabIndex={-1} autoComplete="new-password" value={contactCheck} onChange={(event) => setContactCheck(event.target.value)}/></div>
          <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="name" className="form-label">Full name <span aria-hidden="true">*</span></label><input autoComplete="name" type="text" id="name" name="name" value={formData.name} onChange={handleChange} required maxLength={120} placeholder="Your name" className="form-control"/></div><div><label htmlFor="email" className="form-label">Email address <span aria-hidden="true">*</span></label><input autoComplete="email" type="email" id="email" name="email" value={formData.email} onChange={handleChange} required maxLength={254} placeholder="you@example.com" className="form-control"/></div><div><label htmlFor="phone" className="form-label">Phone number</label><input autoComplete="tel" type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} maxLength={40} placeholder="+254…" className="form-control"/></div><div><label htmlFor="service" className="form-label">Service you’re interested in <span aria-hidden="true">*</span></label><select id="service" name="service" value={formData.service} onChange={handleChange} required className="form-control"><option value="" disabled>Select a service</option>{serviceOptions.map((service)=><option key={service} value={service}>{service}</option>)}</select></div></div>
          <div><div className="mb-1 flex items-center justify-between gap-3"><label htmlFor="message" className="form-label !mb-0">Project details <span aria-hidden="true">*</span></label><span className="text-xs text-slate-400">{formData.message.length}/2000</span></div><textarea id="message" name="message" rows={6} value={formData.message} onChange={handleChange} required minLength={10} maxLength={2000} placeholder="What are you hoping to create? Include key sizes, quantities, timing or any details you already know." className="form-control min-h-36 resize-y"/></div>
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-sm text-xs leading-5 text-slate-500">By sending this request, you agree that nexxacrafts may contact you about this enquiry.</p><button type="submit" disabled={isSubmitting} className="btn-primary btn-lg shrink-0 disabled:cursor-not-allowed disabled:opacity-60"><Send size={16}/>{isSubmitting?'Sending…':'Send enquiry'}</button></div>
        </form>
      </div></ScrollReveal>
    </section>
  </>;
};

export default ContactSection;

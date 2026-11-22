import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Headphones, Keyboard, Loader2, MessageCircle, Mic, Mic2, Plus, Send, Volume2, VolumeX, X } from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { supabase } from '@/lib/supabase';
import './chat-assistant.css';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; serviceSlug?: string; imageServiceSlug?: string; kind?: 'voice' };
const HISTORY_KEY = 'nexxacrafts-support-chat-v2';
const WELCOME_VOICE = 'Welcome to NexxaCraft. I’m Levine from the customer support team. I’m here to help you find the right design, print, or digital service. Open the chat whenever you’re ready.';
const GREETING = "Hello, I'm Levine from NexxaCraft customer support. Tell me what you have in mind and I’ll help you find the right service, understand the next steps, and get to the right order form.";
const quickPrompts = ['I need a banner printed', 'Help me choose a service', 'I need a website', 'Track an order'];

function readMessages(): ChatMessage[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(saved) && saved.length) return saved.slice(-16) as ChatMessage[];
  } catch { /* Storage may be blocked; start with a fresh chat. */ }
  return [{ id: 'welcome', role: 'assistant', text: GREETING }];
}

function speak(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-KE';
  utterance.rate = 0.94;
  utterance.pitch = 1.08;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(voice => /female|zira|samantha|aria|jenny|google uk english/i.test(voice.name))
    ?? voices.find(voice => /^en(-|_)(KE|GB|US)/i.test(voice.lang));
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

function formatVoiceDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      const comma = value.indexOf(',');
      if (comma < 0) reject(new Error('Could not prepare the voice message. Please try again.'));
      else resolve(value.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Could not prepare the voice message. Please try again.'));
    reader.readAsDataURL(blob);
  });
}

function findSuggestedService(text: string, services: ReturnType<typeof useCatalog>) {
  const marker = text.match(/\[\[SERVICE:([a-z0-9-]+)\]\]/i)?.[1];
  if (marker && services.some(service => service.slug === marker)) return marker;
  const query = text.toLowerCase();
  const cues: Record<string, string[]> = {
    'banner-printing': ['banner', 'backdrop', 'roll-up', 'large format', 'signage'],
    'sticker-printing': ['sticker', 'label', 'vinyl decal'],
    'photo-mounting': ['photo mount', 'mount a photo', 'mounting photos', 'mounted photo'],
    'graphic-design': ['logo', 'brand identity', 'graphic design', 'poster design', 'brochure design'],
    'website-software': ['website', 'web app', 'software', 'online store', 'e-commerce'],
    'tshirt-branding': ['t-shirt', 'tshirt', 'hoodie', 'uniform', 'apparel'],
    'mug-branding': ['mug', 'merchandise', 'corporate gift'],
    'laser-cutting': ['laser', 'engraving', 'acrylic cut'],
  };
  const found = Object.entries(cues).find(([, terms]) => terms.some(term => query.includes(term)));
  return found && services.some(service => service.slug === found[0]) ? found[0] : undefined;
}

export default function ChatAssistant() {
  const services = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(readMessages);
  const [draft, setDraft] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const welcomeHandledRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntentRef = useRef(false);
  const recordingCancelRef = useRef(false);
  const recordingStartYRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef<number | null>(null);
  const serviceBySlug = useMemo(() => new Map(services.map(service => [service.slug, service])), [services]);

  function toggleSpeech(text: string, messageId: string) {
    if (!('speechSynthesis' in window)) return;
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    setSpeakingMessageId(messageId);
    const utterance = speak(text, undefined, () => setSpeakingMessageId(current => current === messageId ? null : current));
    if (!utterance) setSpeakingMessageId(null);
  }

  function toggleAutomaticVoice() {
    if (voiceOn && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }
    setVoiceOn(!voiceOn);
  }

  useEffect(() => {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-16))); } catch { /* Chat still works without storage. */ }
  }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => {
    if (draft) { setPlaceholder(''); return; }
    const suggestions = [
      'Ask Levine about a service…',
      'Need help choosing a print option?…',
      'Ask about pricing or your order…',
    ];
    let phraseIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer = 0;
    const step = () => {
      const phrase = suggestions[phraseIndex];
      characterIndex += deleting ? -1 : 1;
      setPlaceholder(phrase.slice(0, characterIndex));
      let delay = deleting ? 34 : 72;
      if (!deleting && characterIndex >= phrase.length) {
        deleting = true;
        delay = 1350;
      } else if (deleting && characterIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % suggestions.length;
        delay = 300;
      }
      timer = window.setTimeout(step, delay);
    };
    timer = window.setTimeout(step, 450);
    return () => window.clearTimeout(timer);
  }, [draft]);
  useEffect(() => {
    if (location.pathname !== '/' || welcomeHandledRef.current) return;
    welcomeHandledRef.current = true;
    let seen = false;
    try { seen = localStorage.getItem('nexxacrafts-first-visit-welcome-v2') === '1'; } catch { /* Use session state when persistent storage is disabled. */ }
    if (seen) return;
    try { localStorage.setItem('nexxacrafts-first-visit-welcome-v2', '1'); } catch { /* Mark this visit in component state. */ }
    setMessages(current => current.some(message => message.id === 'welcome') ? current : [{ id: 'welcome', role: 'assistant', text: GREETING }, ...current]);
  }, [location.pathname]);
  useEffect(() => () => {
    abortRef.current?.abort();
    recordingCancelRef.current = true;
    recordingIntentRef.current = false;
    mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  async function sendMessage(value = draft, voiceRecording?: { blob: Blob; durationSeconds: number }) {
    const text = voiceRecording ? '' : value.trim();
    if ((!text && !voiceRecording) || busy) return;
    setError('');
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: voiceRecording ? `Voice message · ${formatVoiceDuration(voiceRecording.durationSeconds)}` : text, ...(voiceRecording ? { kind: 'voice' as const } : {}) };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage].slice(-12);
    setMessages([...history, { id: assistantId, role: 'assistant', text: '' }]);
    setDraft('');
    setBusy(true);
    if (!supabase) {
      setMessages(current => current.map(message => message.id === assistantId ? { ...message, text: 'Customer support chat is not connected here right now. Browse our services and choose the one you need: nexxacrafts.co.ke/services.' } : message));
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const audio = voiceRecording ? { data: await blobToBase64(voiceRecording.blob), mimeType: voiceRecording.blob.type.split(';')[0] || 'audio/webm' } : undefined;
      const response = await fetch(`${supabaseUrl}/functions/v1/gemini-assistant`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${session?.access_token || supabaseKey}` },
        body: JSON.stringify({ messages: (audio ? messages.slice(-10) : history).map(message => ({ role: message.role, text: message.text.replace(/\[\[SERVICE:[a-z0-9-]+\]\]/gi, '').slice(0, 1200) })), ...(audio ? { audio } : {}), services: services.map(({ slug, name, category, description, pricingMode }) => ({ slug, name, category, description, pricingMode })) }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(typeof detail.error === 'string' ? detail.error : `Assistant request failed (${response.status}).`);
      }
      if (!response.body) throw new Error('Customer support chat could not connect. Please try again.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      const handleFrame = (frame: string) => {
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
        if (!data || data === '[DONE]') return;
        try {
          const event = JSON.parse(data) as { text?: string; error?: string };
          if (event.error) throw new Error(event.error);
          if (event.text) {
            fullText += event.text;
            setMessages(current => current.map(message => message.id === assistantId ? { ...message, text: fullText.replace(/\[\[(?:SERVICE|IMAGE):[a-z0-9-]*$/i, '') } : message));
          }
        } catch (parseError) { if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError; }
      };
      while (true) {
        const { value: bytes, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(bytes, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) handleFrame(frame);
      }
      if (buffer.trim()) handleFrame(buffer);
      if (!fullText.trim()) throw new Error('No reply came through. Please try again.');
      const serviceSlug = findSuggestedService(fullText, services);
      const imageServiceSlug = fullText.match(/\[\[IMAGE:([a-z0-9-]+)\]\]/i)?.[1];
      const cleanText = fullText.replace(/\s*\[\[(?:SERVICE|IMAGE):[a-z0-9-]+\]\]\s*/gi, '').trim();
      setMessages(current => current.map(message => message.id === assistantId ? { ...message, text: cleanText, serviceSlug, ...(imageServiceSlug && serviceBySlug.has(imageServiceSlug) ? { imageServiceSlug } : {}) } : message));
      if (voiceOn && cleanText) toggleSpeech(cleanText, assistantId);
    } catch (sendError) {
      if (sendError instanceof DOMException && sendError.name === 'AbortError') return;
      const message = sendError instanceof Error ? sendError.message : 'Customer support chat is temporarily unavailable.';
      setError(message);
      setMessages(current => current.filter(item => item.id !== assistantId));
    } finally { setBusy(false); abortRef.current = null; }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void sendMessage(); }
  function resetChat() { abortRef.current?.abort(); setBusy(false); setError(''); setMessages([{ id: 'welcome', role: 'assistant', text: GREETING }]); }

  async function beginRecording(event: PointerEvent<HTMLButtonElement>) {
    if (busy || recordingIntentRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    recordingStartYRef.current = event.clientY;
    recordingCancelRef.current = false;
    recordingIntentRef.current = true;
    setCancelRecording(false);
    setRecordingSeconds(0);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Voice recording is not supported in this browser. Please type your message instead.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!recordingIntentRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = mediaEvent => { if (mediaEvent.data.size) audioChunksRef.current.push(mediaEvent.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const elapsedMs = Date.now() - recordingStartedAtRef.current;
        const durationSeconds = Math.max(1, Math.min(90, Math.round(elapsedMs / 1000)));
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        recordingIntentRef.current = false;
        setRecording(false);
        if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        if (!recordingCancelRef.current && blob.size > 0) {
          if (elapsedMs < 700) { setError('Hold the voice button a little longer to record your message.'); return; }
          if (blob.size > 5 * 1024 * 1024) { setError('That voice message is too large to send. Please record a shorter message.'); return; }
          void sendMessage('', { blob, durationSeconds });
        }
      };
      recorder.start(250);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 90) stopRecording(true);
      }, 250);
    } catch (recordError) {
      recordingIntentRef.current = false;
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      const message = recordError instanceof Error ? recordError.message : 'Could not access the microphone. Check browser permission and try again.';
      setError(message);
    }
  }

  function stopRecording(send: boolean) {
    recordingCancelRef.current = !send;
    setCancelRecording(!send);
    recordingIntentRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    else {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setRecording(false);
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function moveRecordingPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!recordingIntentRef.current) return;
    const shouldCancel = recordingCancelRef.current || recordingStartYRef.current - event.clientY > 72;
    recordingCancelRef.current = shouldCancel;
    setCancelRecording(shouldCancel);
  }

  return <div className="nc-chat-widget">
    {open && <section className="nc-chat-panel" aria-label="NexxaCraft customer support chat" aria-modal="false">
      <header className="nc-chat-header"><div className="nc-chat-brand"><div className="nc-chat-avatar"><Headphones size={19}/></div><div><strong>NexxaCraft customer support</strong><span><i/> Here to help · usually replies quickly</span></div></div><div className="nc-chat-head-actions"><button type="button" aria-label={voiceOn ? 'Turn automatic voice replies off' : 'Turn automatic voice replies on'} title={voiceOn ? 'Voice replies on' : 'Voice replies off'} onClick={toggleAutomaticVoice}>{voiceOn ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button><button type="button" aria-label="New conversation" title="New conversation" onClick={resetChat}><Plus size={18}/></button><button type="button" aria-label="Minimize chat" title="Minimize" onClick={() => setOpen(false)}><ChevronDown size={19}/></button></div></header>
      <div className="nc-chat-intro"><span className="nc-chat-intro-tag"><Headphones size={13}/> HERE TO HELP</span><h2>What can we help you make?</h2><p>Ask about our services, pricing, files, or how to get started.</p></div>
      <div className="nc-chat-messages" ref={scrollRef} aria-live="polite" aria-relevant="additions text">
        {messages.map(message => { const service = message.serviceSlug ? serviceBySlug.get(message.serviceSlug) : undefined; const imageService = message.imageServiceSlug ? serviceBySlug.get(message.imageServiceSlug) : undefined; return <article key={message.id} className={`nc-chat-message nc-chat-message-${message.role}`}><div className="nc-chat-message-avatar">{message.role === 'assistant' ? <Headphones size={14}/> : <span>You</span>}</div><div className="nc-chat-message-content">{message.kind === 'voice' ? <div className="nc-chat-voice-message"><Mic size={15}/><span className="nc-chat-voice-bars"><i/><i/><i/><i/><i/><i/><i/></span><strong>{message.text.replace('Voice message · ', '')}</strong></div> : <p>{message.text || <span className="nc-chat-caret" aria-label="Levine is replying"/>}</p>}{imageService?.image&&<figure className="nc-chat-shared-image"><img src={imageService.image} alt={`${imageService.name} example`} loading="lazy"/><figcaption>{imageService.name}</figcaption></figure>}{service&&<button type="button" className="nc-chat-service-card" onClick={()=>{setOpen(false);navigate(`/order/${service.slug}`);}}>{service.image&&<img src={service.image} alt="" loading="lazy"/>}<span className="nc-chat-service-copy"><small>RECOMMENDED SERVICE</small><strong>{service.name}</strong><em>Open order form</em></span><ArrowRight size={16}/></button>}{message.role==='assistant'&&message.text&&<button type="button" className="nc-chat-hear" onClick={()=>toggleSpeech(message.text,message.id)}>{speakingMessageId===message.id?<VolumeX size={13}/>:<Volume2 size={13}/>} {speakingMessageId===message.id?'Stop listening':'Listen to reply'}</button>}</div></article>; })}
        {messages.length===1&&!busy&&<div className="nc-chat-quick-prompts">{quickPrompts.map(prompt=><button type="button" key={prompt} onClick={()=>void sendMessage(prompt)}>{prompt}<ArrowRight size={13}/></button>)}</div>}
        {busy&&messages.at(-1)?.text===''&&<div className="nc-chat-thinking"><span/><span/><span/> Finding the right help…</div>}
        {error&&<div className="nc-chat-error" role="alert">{error} {messages.filter(message=>message.role==='user').at(-1)?.kind!=='voice'&&<button type="button" onClick={()=>void sendMessage(messages.filter(message=>message.role==='user').at(-1)?.text||'Can you help me choose a service?')}>Retry</button>}</div>}
      </div>
      {recording&&<div className={`nc-chat-recording-status ${cancelRecording?'is-cancel':''}`}><span className="nc-chat-recording-dot"/><strong>{cancelRecording?'Release to cancel':'Recording voice message'}</strong><span>{formatVoiceDuration(recordingSeconds)}</span><small>{cancelRecording?'Let go to discard':'Slide up to cancel'}</small></div>}
      {voiceMode ? <div className="nc-chat-compose nc-chat-voice-compose"><button type="button" className="nc-chat-mode-toggle" aria-label="Switch to typing" onClick={()=>setVoiceMode(false)}><Keyboard size={18}/></button><button type="button" className={`nc-chat-ptt ${recording?'is-recording':''} ${cancelRecording?'is-cancel':''}`} disabled={busy} onPointerDown={event=>void beginRecording(event)} onPointerUp={()=>stopRecording(!recordingCancelRef.current)} onPointerMove={moveRecordingPointer} onPointerCancel={()=>stopRecording(false)} aria-label={recording?(cancelRecording?'Release to cancel recording':'Release to send voice message'):'Hold to talk'}>{recording?<><Mic size={17}/>{cancelRecording?'Release to cancel':`Release to send · ${formatVoiceDuration(recordingSeconds)}`}</>:<>Hold to talk <Mic size={17}/></>}</button></div> : <form className="nc-chat-compose" onSubmit={onSubmit}><button type="button" className="nc-chat-mode-toggle" aria-label="Switch to voice recording" onClick={()=>setVoiceMode(true)}><Mic size={18}/></button><label className="sr-only" htmlFor="nc-chat-input">Message NexxaCraft customer support</label><input id="nc-chat-input" ref={inputRef} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={placeholder || 'Ask Levine a question…'} maxLength={1200} disabled={busy}/><button type="submit" disabled={busy||!draft.trim()} aria-label="Send message">{busy?<Loader2 size={18} className="animate-spin"/>:<Send size={17}/>}</button></form>}
      <div className="nc-chat-footer"><span><i/> Secure service guidance</span><button type="button" onClick={()=>navigate('/contact')}><Mic2 size={12}/> Talk to our team</button></div>
    </section>}
    <button type="button" className={`nc-chat-launcher ${open?'is-open':''}`} onClick={()=>{if(!open){setOpen(true);window.setTimeout(()=>inputRef.current?.focus(),120);if(voiceOn)toggleSpeech(WELCOME_VOICE,'welcome');}else{setOpen(false);if('speechSynthesis'in window)window.speechSynthesis.cancel();setSpeakingMessageId(null);}}} aria-label={open?'Close customer support chat':'Chat with NexxaCraft customer support'} aria-expanded={open}>{open?<X size={22}/>:<><span className="nc-chat-launcher-icon"><MessageCircle size={22}/><i/></span><span className="nc-chat-launcher-copy"><strong>Need a hand?</strong><small>Chat with Levine</small></span></>}<span className="nc-chat-launcher-glow"/></button>
  </div>;
}

import { useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { Archive, CheckCircle2, FileText, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MagneticDropZoneProps = {
  accept?: string;
  className?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onFilesChange?: (files: File[]) => void;
};

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** unit).toFixed(unit > 0 ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`;
}

function matchesAccept(file: File, accept: string) {
  if (!accept.trim()) return true;
  return accept.split(',').map((rule) => rule.trim().toLowerCase()).some((rule) => {
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
    return file.type.toLowerCase() === rule;
  });
}

function fileIcon(file: File) {
  if (file.type.startsWith('image/')) return ImageIcon;
  if (file.type === 'application/pdf') return FileText;
  if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) return Archive;
  return FileText;
}

export function MagneticDropZone({ accept = 'image/*,.pdf,.zip', className, maxSize = 100 * 1024 * 1024, multiple = false, disabled = false, busy = false, onFilesChange }: MagneticDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });
  const inactive = disabled || busy;

  function acceptFiles(incoming: File[]) {
    if (inactive) return;
    const chosen = multiple ? incoming : incoming.slice(0, 1);
    const invalid = chosen.find((file) => !matchesAccept(file, accept));
    const oversized = chosen.find((file) => file.size > maxSize);
    if (invalid || oversized) {
      const message = invalid ? `${invalid.name} is not a supported file type.` : `${oversized!.name} is larger than ${formatBytes(maxSize)}.`;
      setFiles([]); setError(message); onFilesChange?.([]); return;
    }
    if (chosen.length) { setFiles(chosen); setError(''); onFilesChange?.(chosen); }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    acceptFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!inactive) acceptFiles(Array.from(event.dataTransfer.files));
    setDragging(false); setMagnet({ x: 0, y: 0 });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (inactive || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width / 2, 1);
    const y = (event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height / 2, 1);
    setMagnet({ x: Math.max(-4, Math.min(4, x * 4)), y: Math.max(-4, Math.min(4, y * 4)) });
  }

  function clearFiles() { setFiles([]); setError(''); onFilesChange?.([]); }
  const firstFile = files[0];
  const FileIconComponent = firstFile ? fileIcon(firstFile) : UploadCloud;
  const imageOnly = accept.trim().toLowerCase() === 'image/*';

  return <div ref={zoneRef} className={cn('magnetic-dropzone', dragging && 'is-dragging', inactive && 'is-disabled', className)} style={{ '--magnet-x': `${magnet.x}px`, '--magnet-y': `${magnet.y}px` } as CSSProperties}
    onPointerMove={handlePointerMove} onPointerLeave={()=>setMagnet({x:0,y:0})} onDragEnter={(event)=>{event.preventDefault();if(!inactive){setDragging(true);}}} onDragOver={(event)=>{event.preventDefault();if(!inactive)event.dataTransfer.dropEffect='copy';}} onDragLeave={(event)=>{if(event.currentTarget===event.target)setDragging(false);}} onDrop={handleDrop}>
    <input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} disabled={inactive} onChange={handleInput}/>
    {files.length ? <div className="magnetic-dropzone-ready"><span className="magnetic-dropzone-icon success"><CheckCircle2 size={21}/></span><div className="magnetic-dropzone-copy"><strong>{files.length===1?'Ready to upload':`${files.length} files ready`}</strong><span>{firstFile?.name}{files.length>1?` +${files.length-1}`:''}</span><small>{firstFile?formatBytes(firstFile.size):''}{files.length>1?' · files checked':''}</small></div><div className="magnetic-dropzone-actions"><button type="button" disabled={inactive} onClick={()=>inputRef.current?.click()}>Replace</button><button type="button" disabled={inactive} onClick={clearFiles} aria-label="Remove selected files"><X size={15}/> Remove</button></div></div> : <button type="button" className="magnetic-dropzone-prompt" disabled={inactive} onClick={()=>inputRef.current?.click()}>
      <span className="magnetic-dropzone-icon">{busy?<Loader2 className="animate-spin" size={22}/>:<FileIconComponent size={22}/>}</span><span><strong>{busy?'Uploading…':dragging?'Drop files to add them':'Drop files here or click to browse'}</strong><small>{multiple?`Select one or more ${imageOnly?'images':'files'}`:`Select a ${imageOnly?'image':'file'}`} · up to {formatBytes(maxSize)}</small></span>
    </button>}
    {error&&<p role="alert" className="magnetic-dropzone-error">{error}</p>}
  </div>;
}

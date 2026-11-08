import type { ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  File,
  FileArchive,
  FileAudio,
  FileBox,
  FileCode,
  FileImage,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  FileVideo,
  HardDrive,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';
import { Spinner } from './Spinner';

export type FileItemStatus = 'uploaded' | 'uploading' | 'error' | 'pending' | 'local';

export interface FileItemProps {
  /** File name, e.g. "banner-final.pdf" (the extension picks the icon). */
  name: string;
  /** Extra details: size, page count, uploader… */
  meta?: ReactNode;
  /** uploaded · uploading · error · pending (queued) · local (kept in this browser only). */
  status?: FileItemStatus;
  /** Error detail shown for `status="error"`. */
  error?: string;
  /** Upload progress 0–100 (shown while uploading). */
  progress?: number;
  /** Shows a remove button. */
  onRemove?: () => void;
  /** Accessible name of the remove button (default "Remove <name>"). */
  removeLabel?: string;
  /** Opens the file in a new tab (e.g. a signed URL). */
  href?: string;
  /** Makes the name a button (e.g. open a preview). */
  onOpen?: () => void;
  className?: string;
}

const ICONS: Array<[LucideIcon, string[]]> = [
  [FileImage, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'tif', 'tiff', 'bmp', 'heic', 'avif']],
  [FilePenLine, ['ai', 'eps', 'psd', 'indd', 'cdr', 'fig', 'sketch', 'xd', 'afdesign']],
  [FileBox, ['dxf', 'dwg', 'stl', 'step', 'stp', 'obj', '3mf']],
  [FileArchive, ['zip', 'rar', '7z', 'tar', 'gz']],
  [FileSpreadsheet, ['xls', 'xlsx', 'csv', 'ods', 'numbers']],
  [FileVideo, ['mp4', 'mov', 'avi', 'webm', 'mkv']],
  [FileAudio, ['mp3', 'wav', 'ogg', 'm4a']],
  [FileCode, ['html', 'css', 'js', 'ts', 'tsx', 'json', 'xml', 'php', 'py']],
  [FileText, ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md', 'pages']],
];

function extensionOf(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : '';
}

function iconFor(extension: string): LucideIcon {
  for (const [Icon, extensions] of ICONS) {
    if (extensions.includes(extension)) return Icon;
  }
  return File;
}

const STATUS: Record<FileItemStatus, { label: string; className: string }> = {
  uploaded: { label: 'Uploaded', className: 'text-success-700' },
  uploading: { label: 'Uploading…', className: 'text-brand-700' },
  error: { label: 'Upload failed', className: 'text-danger-700' },
  pending: { label: 'Waiting to upload', className: 'text-slate-500' },
  local: { label: 'Saved in this browser only', className: 'text-slate-500' },
};

function StatusIcon({ status }: { status: FileItemStatus }) {
  const className = 'size-3.5 shrink-0';
  switch (status) {
    case 'uploaded':
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case 'uploading':
      return <Spinner size="xs" />;
    case 'error':
      return <AlertCircle aria-hidden="true" className={className} />;
    case 'pending':
      return <Clock aria-hidden="true" className={className} />;
    default:
      return <HardDrive aria-hidden="true" className={className} />;
  }
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-slate-300">
      ·
    </span>
  );
}

/**
 * A file row: type icon, name, extension + meta, upload status and an optional remove button.
 *
 * @example <FileItem name="banner-final.pdf" meta="2.4 MB" status="uploaded" onRemove={() => remove(id)} />
 */
export function FileItem({
  name,
  meta,
  status,
  error,
  progress,
  onRemove,
  removeLabel,
  href,
  onOpen,
  className,
}: FileItemProps) {
  const extension = extensionOf(name);
  const Icon = iconFor(extension);
  const nameClass =
    'block max-w-full truncate text-left text-sm font-medium leading-5 text-slate-900 underline-offset-2';
  const showProgress = status === 'uploading' && typeof progress === 'number';
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));

  let nameElement: ReactNode;
  if (href) {
    nameElement = (
      <a href={href} target="_blank" rel="noopener noreferrer" title={name} className={cn(nameClass, 'hover:text-brand-700 hover:underline')}>
        {name}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  } else if (onOpen) {
    nameElement = (
      <button type="button" onClick={onOpen} title={name} className={cn(nameClass, 'hover:text-brand-700 hover:underline')}>
        {name}
      </button>
    );
  } else {
    nameElement = (
      <p title={name} className={nameClass}>
        {name}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5',
        status === 'error' ? 'border-danger-200 bg-danger-50/40' : 'border-line bg-white',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md ring-1 ring-inset [&>svg]:size-[18px]',
          status === 'error' ? 'bg-white text-danger-600 ring-danger-200' : 'bg-slate-50 text-slate-500 ring-line',
        )}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        {nameElement}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5 text-slate-500">
          {extension && <span className="font-mono uppercase tracking-wide">{extension}</span>}
          {meta && (
            <>
              {extension && <Separator />}
              <span className="tabular-nums">{meta}</span>
            </>
          )}
          {status && (
            <>
              {(extension || meta) && <Separator />}
              <span className={cn('inline-flex items-center gap-1', STATUS[status].className)}>
                <StatusIcon status={status} />
                {status === 'error' && error ? error : STATUS[status].label}
              </span>
            </>
          )}
        </div>
        {showProgress && (
          <div
            role="progressbar"
            aria-label={`Uploading ${name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedProgress)}
            className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        )}
      </div>
      {onRemove && (
        <IconButton
          size="sm"
          label={removeLabel ?? `Remove ${name}`}
          icon={<X />}
          onClick={onRemove}
          className="-mr-1"
        />
      )}
    </div>
  );
}

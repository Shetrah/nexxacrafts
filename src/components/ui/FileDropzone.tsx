import { useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import { isAriaInvalid, joinIds } from './internal/aria';

export interface FileDropzoneProps {
  /** Receives the chosen or dropped files. The dropzone does not validate them — callers do. */
  onFiles: (files: File[]) => void;
  /** Native accept list, e.g. ".pdf,.ai,.png,image/*". */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Upload in progress: spinner, aria-busy, input disabled. */
  busy?: boolean;
  /** Main line. Defaults to "Drop files here or browse" ("Choose files" on touch screens). */
  title?: ReactNode;
  /** Secondary line, e.g. accepted formats and size limit. */
  hint?: ReactNode;
  invalid?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  /** Smaller, horizontal layout for tight spaces. */
  compact?: boolean;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  className?: string;
}

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * File picker with drag-and-drop. The real control is a visually hidden `<input type="file">`
 * (keyboard: Tab to focus, Enter/Space to open); the visible zone is its label.
 *
 * @example
 * <Field label="Artwork" hint="PDF, AI, PNG or JPG · up to 50 MB">
 *   <FileDropzone multiple accept=".pdf,.ai,.png,.jpg" onFiles={addFiles} busy={uploading} />
 * </Field>
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  busy = false,
  title,
  hint,
  invalid,
  id,
  name,
  required,
  compact = false,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  'aria-invalid': ariaInvalid,
  className,
}: FileDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}files`;
  const hintId = hint ? `${inputId}-zone-hint` : undefined;
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const inactive = disabled || busy;
  const isInvalid = invalid ?? isAriaInvalid(ariaInvalid);

  const deliver = (list: FileList | null | undefined) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    deliver(event.target.files);
    // Reset so choosing the same file again still fires a change.
    event.target.value = '';
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (inactive) return;
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    // Always prevent the browser from opening the file in the tab.
    event.preventDefault();
    event.dataTransfer.dropEffect = inactive ? 'none' : 'copy';
  };

  const handleDragLeave = () => {
    if (inactive) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!inactive) deliver(event.dataTransfer.files);
  };

  let stateClass: string;
  if (disabled) stateClass = 'cursor-not-allowed border-line-strong bg-slate-50 opacity-60';
  else if (busy) stateClass = 'cursor-progress border-brand-300 bg-brand-50/40';
  else if (dragging) stateClass = 'cursor-copy border-brand-500 bg-brand-50 ring-4 ring-brand-600/10';
  else if (isInvalid) stateClass = 'cursor-pointer border-danger-400 bg-danger-50/40 hover:border-danger-500';
  else stateClass = 'cursor-pointer border-line-strong bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/40';

  let titleContent: ReactNode;
  if (busy) titleContent = 'Uploading…';
  else if (dragging) titleContent = multiple ? 'Release to add the files' : 'Release to add the file';
  else if (title) titleContent = title;
  else
    titleContent = (
      <>
        <span className="hidden [@media(hover:hover)]:inline">
          Drop {multiple ? 'files' : 'a file'} here or <span className="text-brand-600 underline decoration-brand-600/30 underline-offset-[3px]">browse</span>
        </span>
        <span className="text-brand-600 [@media(hover:hover)]:hidden">Choose {multiple ? 'files' : 'a file'}</span>
      </>
    );

  return (
    <div
      className={cn('relative min-w-0', className)}
      aria-busy={busy || undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={inactive}
        required={required}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={joinIds(ariaDescribedBy, hintId)}
        aria-invalid={isInvalid || undefined}
        onChange={handleChange}
        className="peer sr-only"
      />
      <label
        htmlFor={inputId}
        className={cn(
          'flex rounded-xl border border-dashed text-center transition-[background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none',
          // Keyboard focus on the hidden input draws the standard focus outline around the zone.
          'peer-focus-visible:border-brand-500 peer-focus-visible:[outline-offset:2px] peer-focus-visible:[outline:2px_solid_var(--nc-focus)]',
          compact ? 'items-center gap-3 px-4 py-3 text-left' : 'flex-col items-center justify-center gap-3 px-6 py-8',
          stateClass,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-white shadow-xs ring-1 ring-line [&>svg]:size-5',
            compact ? 'size-9' : 'size-11',
            dragging || busy ? 'text-brand-600' : 'text-slate-600',
          )}
        >
          {busy ? <Spinner size="md" /> : <UploadCloud />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-5 text-slate-900">{titleContent}</span>
          {hint && (
            <span id={hintId} className="mt-1 block text-xs leading-5 text-slate-500">
              {hint}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}

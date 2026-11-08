import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useControllableState } from './internal/useControllableState';

export interface DisclosureProps {
  title: ReactNode;
  /** Secondary line under the title (always visible). */
  description?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (pair with onOpenChange). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** plain (default): hairline-separated rows (FAQ) · card: bordered panel. */
  tone?: 'plain' | 'card';
  /** Wrap the toggle in a heading for document outline (FAQ pages). */
  headingAs?: 'h2' | 'h3' | 'h4';
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Show/hide section (`aria-expanded` / `aria-controls`). Content animates height and is removed
 * from the accessibility tree and tab order while closed.
 *
 * @example <Disclosure title="What file formats can I upload?">PDF, AI, EPS, PNG…</Disclosure>
 */
export function Disclosure({
  title,
  description,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  tone = 'plain',
  headingAs,
  id,
  className,
  children,
}: DisclosureProps) {
  const generatedId = useId();
  const baseId = id ?? `${generatedId}disclosure`;
  const panelId = `${baseId}-panel`;
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const card = tone === 'card';

  const toggle = (
    <button
      type="button"
      id={`${baseId}-button`}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen(!open)}
      className={cn(
        'group flex w-full items-start justify-between gap-4 text-left',
        card ? 'rounded-xl px-4 py-3.5 sm:px-5 sm:py-4' : 'rounded-md py-4',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-6 text-slate-900 transition-colors duration-150 group-hover:text-brand-700">
          {title}
        </span>
        {description && <span className="mt-0.5 block text-sm leading-5 text-slate-600">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-slate-500 transition-[transform,color] duration-200 ease-out group-hover:text-slate-900 motion-reduce:transition-none',
          open && 'rotate-180',
        )}
      >
        <ChevronDown className="size-4" />
      </span>
    </button>
  );

  const Heading = headingAs;

  return (
    <div
      className={cn(
        card ? 'surface-light rounded-xl border border-line bg-white shadow-xs' : 'border-b border-line',
        className,
      )}
    >
      {Heading ? <Heading className="font-sans text-base tracking-normal">{toggle}</Heading> : toggle}
      <div
        id={panelId}
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none',
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={cn('text-sm leading-6 text-slate-600', card ? 'px-4 pb-4 sm:px-5 sm:pb-5' : 'pb-5 pr-9')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

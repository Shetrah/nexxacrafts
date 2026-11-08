import { cn } from '@/lib/cn';

export type TabVariant = 'underline' | 'pills';

/** Classes shared by <Tabs> (buttons) and <NavTabs> (links) so both look identical. */
export function tabListClasses(variant: TabVariant) {
  return variant === 'underline'
    ? '-mb-px flex gap-x-6 overflow-x-auto scrollbar-none'
    : 'flex gap-1 overflow-x-auto scrollbar-none';
}

export function tabClasses(variant: TabVariant, selected: boolean) {
  const base =
    'relative inline-flex shrink-0 select-none items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 ease-out focus-visible:[outline-offset:-2px] motion-reduce:transition-none [&_svg]:size-4';
  if (variant === 'underline') {
    return cn(
      base,
      'h-11 rounded-t-md px-0.5',
      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:content-['']",
      selected
        ? 'text-slate-900 after:bg-brand-600'
        : 'text-slate-600 after:bg-transparent hover:text-slate-900 hover:after:bg-line-strong',
    );
  }
  return cn(
    base,
    'h-9 rounded-lg px-3',
    selected ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );
}

export function tabCountClasses(variant: TabVariant, selected: boolean) {
  return cn(
    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums',
    selected
      ? variant === 'underline'
        ? 'bg-brand-50 text-brand-700'
        : 'bg-white text-brand-700 ring-1 ring-inset ring-brand-600/15'
      : 'bg-slate-100 text-slate-600',
  );
}

export function tabIconClasses(selected: boolean) {
  return cn('inline-flex shrink-0', selected ? 'text-brand-600' : 'text-slate-500');
}

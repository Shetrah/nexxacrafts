import type { MouseEvent, ReactNode } from 'react';

export interface SkipLinkProps {
  /** Target of the skip link (default "#main-content"). */
  href?: string;
  /** Default "Skip to main content". */
  children?: ReactNode;
}

/**
 * First focusable element on every page: hidden until focused, then jumps to the main content and
 * moves focus there (the target gets tabIndex=-1 if needed).
 *
 * @example <SkipLink /> … <main id="main-content">…</main>
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#')) return;
    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-lg focus:ring-1 focus:ring-line"
    >
      {children}
    </a>
  );
}

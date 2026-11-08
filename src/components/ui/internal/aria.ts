import type { AriaAttributes } from 'react';

/** True when an `aria-invalid` value means "invalid". */
export function isAriaInvalid(value: AriaAttributes['aria-invalid']): boolean {
  return value === true || value === 'true' || value === 'grammar' || value === 'spelling';
}

/** Joins id references for aria-describedby / aria-labelledby, dropping empty values. */
export function joinIds(...ids: Array<string | false | null | undefined>): string | undefined {
  const joined = ids.filter(Boolean).join(' ').trim();
  return joined || undefined;
}

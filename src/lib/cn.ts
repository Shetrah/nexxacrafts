/**
 * Joins class name parts, skipping falsy values.
 *
 * Intentionally tiny and dependency-free: it does not de-duplicate or resolve conflicting Tailwind
 * utilities, so components expose props (variant, size, tone…) instead of relying on overrides.
 *
 * @example cn('px-4', isActive && 'text-brand-700', className)
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  let result = '';
  for (const part of parts) {
    if (!part) continue;
    result = result ? `${result} ${part}` : part;
  }
  return result;
}

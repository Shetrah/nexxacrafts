import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AvatarProps {
  /** Person or organisation name: drives the initials, colour and accessible label. */
  name?: string | null;
  /** Photo URL. Falls back to initials if it fails to load. */
  src?: string;
  /** xs 24px · sm 32px · md 40px (default) · lg 48px */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Hide from assistive technology when the name is already shown next to the avatar. */
  decorative?: boolean;
  className?: string;
}

const SIZES = {
  xs: 'size-6 text-[10px] [&>svg]:size-3.5',
  sm: 'size-8 text-xs [&>svg]:size-4',
  md: 'size-10 text-sm [&>svg]:size-5',
  lg: 'size-12 text-base [&>svg]:size-6',
} as const;

/** Subtle, readable tints; picked deterministically from the name. */
const PALETTE = [
  'bg-brand-100 text-brand-800',
  'bg-info-100 text-info-800',
  'bg-success-100 text-success-800',
  'bg-warning-100 text-warning-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
  'bg-slate-200 text-slate-700',
] as const;

function initialsOf(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

function hashOf(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Round avatar: photo, or initials on a deterministic tint, or a person icon when no name.
 *
 * @example <Avatar name={profile.full_name} size="sm" decorative />
 */
export function Avatar({ name, src, size = 'md', decorative = false, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const cleanName = name?.trim() ?? '';
  const initials = cleanName ? initialsOf(cleanName) : '';
  const tone = cleanName ? PALETTE[hashOf(cleanName.toLowerCase()) % PALETTE.length] : 'bg-slate-100 text-slate-500';
  const showImage = Boolean(src) && failedSrc !== src;
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': cleanName || 'User' };

  return (
    <span
      {...a11y}
      className={cn(
        'relative inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-semibold leading-none ring-1 ring-inset ring-black/5',
        SIZES[size],
        showImage ? 'bg-slate-100' : tone,
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src ?? null)}
          className="size-full object-cover"
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <User aria-hidden="true" />
      )}
    </span>
  );
}

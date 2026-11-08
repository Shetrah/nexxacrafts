import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CropFrameProps {
  children: ReactNode;
  className?: string;
  /** Mark colour: ink (default, on light) · inverse (on dark) · brand */
  tone?: 'ink' | 'inverse' | 'brand';
}

const TONES = {
  ink: '[--nc-crop-color:rgb(11_18_32_/_0.38)]',
  inverse: '[--nc-crop-color:rgb(255_255_255_/_0.5)]',
  brand: '[--nc-crop-color:theme(colors.brand.600)]',
} as const;

/**
 * Print-registration crop marks at the four corners of featured media (signature motif — use
 * sparingly). The frame adds 18px of padding for the marks; the marks are decorative.
 *
 * @example <CropFrame><img src={…} alt="Large-format banner on the press" className="aspect-[16/10] rounded-2xl object-cover" /></CropFrame>
 */
export function CropFrame({ children, className, tone = 'ink' }: CropFrameProps) {
  return (
    <div className={cn('crop-frame', TONES[tone], className)}>
      <div className="relative">
        {children}
        <span aria-hidden="true" className="crop-mark crop-mark-tl" />
        <span aria-hidden="true" className="crop-mark crop-mark-tr" />
        <span aria-hidden="true" className="crop-mark crop-mark-bl" />
        <span aria-hidden="true" className="crop-mark crop-mark-br" />
      </div>
    </div>
  );
}

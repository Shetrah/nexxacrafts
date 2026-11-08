export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';

export interface FloatingPosition {
  top: number;
  left: number;
  side: Side;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/**
 * Viewport (position: fixed) coordinates for a floating element next to `anchor`. Flips to the
 * opposite side when the preferred side does not fit, then clamps inside the viewport padding.
 */
export function computePosition(
  anchor: DOMRect,
  floating: { width: number; height: number },
  side: Side,
  align: Align,
  offset = 6,
  padding = 8,
): FloatingPosition {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;

  const fits = (candidate: Side) => {
    switch (candidate) {
      case 'bottom':
        return anchor.bottom + offset + floating.height <= viewportHeight - padding;
      case 'top':
        return anchor.top - offset - floating.height >= padding;
      case 'right':
        return anchor.right + offset + floating.width <= viewportWidth - padding;
      case 'left':
        return anchor.left - offset - floating.width >= padding;
      default:
        return true;
    }
  };

  const finalSide = fits(side) || !fits(OPPOSITE[side]) ? side : OPPOSITE[side];
  let top: number;
  let left: number;

  if (finalSide === 'top' || finalSide === 'bottom') {
    top = finalSide === 'bottom' ? anchor.bottom + offset : anchor.top - offset - floating.height;
    if (align === 'start') left = anchor.left;
    else if (align === 'end') left = anchor.right - floating.width;
    else left = anchor.left + anchor.width / 2 - floating.width / 2;
  } else {
    left = finalSide === 'right' ? anchor.right + offset : anchor.left - offset - floating.width;
    if (align === 'start') top = anchor.top;
    else if (align === 'end') top = anchor.bottom - floating.height;
    else top = anchor.top + anchor.height / 2 - floating.height / 2;
  }

  return {
    top: clamp(top, padding, viewportHeight - floating.height - padding),
    left: clamp(left, padding, viewportWidth - floating.width - padding),
    side: finalSide,
  };
}

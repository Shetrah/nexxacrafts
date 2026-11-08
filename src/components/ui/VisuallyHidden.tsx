import type { ElementType, ReactNode } from 'react';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Element to render (default 'span'). */
  as?: ElementType;
  id?: string;
}

/**
 * Content for assistive technology only (screen-reader text), e.g. extra context for an icon or a
 * heading that the visual design omits.
 */
export function VisuallyHidden({ children, as: Component = 'span', id }: VisuallyHiddenProps) {
  return (
    <Component id={id} className="sr-only">
      {children}
    </Component>
  );
}

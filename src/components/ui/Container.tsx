import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ContainerOwnProps {
  /** default 1240px · narrow 832px (articles, forms) · wide 1440px (staff portal) */
  size?: 'default' | 'narrow' | 'wide';
  className?: string;
  children?: ReactNode;
}

export type ContainerProps<C extends ElementType = 'div'> = ContainerOwnProps & {
  /** Element to render (default 'div'). */
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof ContainerOwnProps | 'as'>;

const SIZES = {
  default: 'max-w-[1240px]',
  narrow: 'max-w-[52rem]',
  wide: 'max-w-[1440px]',
} as const;

/**
 * Centred page column with responsive gutters (16 / 24 / 32px).
 *
 * @example <Section><Container>…</Container></Section>
 */
export function Container<C extends ElementType = 'div'>({
  as,
  size = 'default',
  className,
  children,
  ...rest
}: ContainerProps<C>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component {...rest} className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', SIZES[size], className)}>
      {children}
    </Component>
  );
}

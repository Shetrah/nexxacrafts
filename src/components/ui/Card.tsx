import {
  createContext,
  useContext,
  type ComponentPropsWithoutRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardTone = 'default' | 'muted' | 'brand' | 'ink';

interface CardOwnProps {
  /**
   * Inner padding. Use 'none' with CardHeader / CardBody / CardFooter for a sectioned card with
   * dividers; with any other padding those parts only add spacing.
   */
  padding?: CardPadding;
  /** Hover elevation for clickable cards (pair with `as={Link}` or an onClick). */
  interactive?: boolean;
  /** default (white) · muted (slate-50) · brand (blue tint) · ink (dark) */
  tone?: CardTone;
  className?: string;
  children?: ReactNode;
}

/** Card props: own props plus the props of the rendered element (`as`). */
export type CardProps<C extends ElementType = 'div'> = CardOwnProps & {
  /** Element or component to render (e.g. 'section', 'article', Link). Default 'div'. */
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof CardOwnProps | 'as'>;

const CardContext = createContext<{ sectioned: boolean; tone: CardTone }>({ sectioned: false, tone: 'default' });

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const TONES: Record<CardTone, string> = {
  default: 'surface-light border-line bg-white text-slate-700 shadow-xs',
  muted: 'surface-light border-line bg-slate-50 text-slate-700',
  brand: 'surface-light border-brand-100 bg-brand-50 text-slate-700',
  ink: 'surface-inverse border-ink-700 bg-ink-900 text-slate-300',
};

/**
 * Bordered surface (12px radius). Polymorphic via `as`.
 *
 * @example <Card><CardHeader title="Order summary" />…</Card>
 * @example <Card as={Link} to="/services/banners" interactive>…</Card>
 */
export function Card<C extends ElementType = 'div'>({
  as,
  padding = 'md',
  interactive = false,
  tone = 'default',
  className,
  children,
  ...rest
}: CardProps<C>) {
  const Component: ElementType = as ?? 'div';
  return (
    <CardContext.Provider value={{ sectioned: padding === 'none', tone }}>
      <Component
        {...rest}
        className={cn(
          'relative block min-w-0 rounded-xl border',
          TONES[tone],
          PADDING[padding],
          interactive &&
            'cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:border-line-strong hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none',
          className,
        )}
      >
        {children}
      </Component>
    </CardContext.Provider>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or menus on the right. */
  actions?: ReactNode;
  /** Icon tile on the left (40px, brand tint). */
  icon?: ReactNode;
  /** Heading element for the title (default h3). */
  titleAs?: 'h2' | 'h3' | 'h4';
}

/** Card title row: optional icon tile, title, description and actions. */
export function CardHeader({
  title,
  description,
  actions,
  icon,
  titleAs: Title = 'h3',
  className,
  ...rest
}: CardHeaderProps) {
  const { sectioned, tone } = useContext(CardContext);
  const inverse = tone === 'ink';
  return (
    <div
      {...rest}
      className={cn(
        'flex items-start gap-3',
        sectioned ? cn('border-b px-5 py-4', inverse ? 'border-ink-700' : 'border-line') : 'mb-4',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg [&>svg]:size-5',
            inverse ? 'bg-white/10 text-white' : 'bg-brand-50 text-brand-700',
          )}
        >
          {icon}
        </span>
      )}
      <div className={cn('min-w-0 flex-1', Boolean(icon) && !description && 'self-center')}>
        <Title className="text-base font-bold leading-6">{title}</Title>
        {description && (
          <p className={cn('mt-0.5 text-sm leading-5', inverse ? 'text-slate-400' : 'text-slate-600')}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="-my-1 flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

/** Main card content (padded when the card uses padding="none"). */
export function CardBody({ className, ...rest }: CardBodyProps) {
  const { sectioned } = useContext(CardContext);
  return <div {...rest} className={cn(sectioned && 'px-5 py-4', className)} />;
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/** Footer row for actions or meta, separated by a hairline. */
export function CardFooter({ className, ...rest }: CardFooterProps) {
  const { sectioned, tone } = useContext(CardContext);
  const inverse = tone === 'ink';
  return (
    <div
      {...rest}
      className={cn(
        'flex flex-wrap items-center gap-2 border-t',
        inverse ? 'border-ink-700' : 'border-line',
        sectioned ? cn('rounded-b-xl px-5 py-3.5', inverse ? 'bg-white/[0.03]' : 'bg-slate-50/70') : 'mt-5 pt-4',
        className,
      )}
    />
  );
}

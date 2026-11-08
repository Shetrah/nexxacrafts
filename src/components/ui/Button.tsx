import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { BUTTON_ICON, buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { Spinner } from './Spinner';

/** Visual props shared by Button and ButtonLink. */
export interface ButtonVisualProps {
  /** primary (default) · secondary · ghost · subtle · danger · inverse · inverse-outline · link */
  variant?: ButtonVariant;
  /** sm 32px · md 40px (default) · lg 48px */
  size?: ButtonSize;
  /** Icon before the label (sized automatically: 16px small, 18px otherwise). */
  leftIcon?: ReactNode;
  /** Icon after the label. */
  rightIcon?: ReactNode;
  /** Stretch to the container width. */
  fullWidth?: boolean;
}

export interface ButtonProps extends ButtonVisualProps, ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Shows a centred spinner, sets `aria-busy` and ignores clicks. The button stays focusable
   * (it uses `aria-disabled`), so keyboard focus is not lost while an action runs.
   */
  loading?: boolean;
}

interface ButtonContentProps {
  size: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

function hasContent(node: ReactNode) {
  return node !== null && node !== undefined && node !== false && node !== '';
}

function ButtonContent({ size, loading = false, leftIcon, rightIcon, children }: ButtonContentProps) {
  const iconClass = cn('inline-flex shrink-0', BUTTON_ICON[size]);
  return (
    <>
      <span
        className={cn(
          'inline-flex min-w-0 items-center justify-center gap-[inherit]',
          loading && 'opacity-0',
        )}
      >
        {hasContent(leftIcon) && (
          <span aria-hidden="true" className={iconClass}>
            {leftIcon}
          </span>
        )}
        {hasContent(children) && <span className="min-w-0 truncate">{children}</span>}
        {hasContent(rightIcon) && (
          <span aria-hidden="true" className={iconClass}>
            {rightIcon}
          </span>
        )}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={size === 'lg' ? 'md' : 'sm'} />
        </span>
      )}
    </>
  );
}

/**
 * The primary action element. Defaults to `type="button"`.
 *
 * @example <Button leftIcon={<Plus />} onClick={create}>New order</Button>
 * @example <Button variant="secondary" loading={saving} type="submit">Save</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled = false,
    type = 'button',
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      // Also cancels implicit form submission while busy.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={buttonClasses({ variant, size, fullWidth, disabled, loading, className })}
    >
      <ButtonContent size={size} loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </button>
  );
});

/** ButtonLink rendering a react-router <Link>. */
export type RouterButtonLinkProps = ButtonVisualProps & LinkProps & { href?: undefined };

/** ButtonLink rendering a plain <a href> (external or non-router URLs). */
export type AnchorButtonLinkProps = ButtonVisualProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined };

export type ButtonLinkProps = RouterButtonLinkProps | AnchorButtonLinkProps;

function isAnchorProps(props: ButtonLinkProps): props is AnchorButtonLinkProps {
  return typeof (props as AnchorButtonLinkProps).href === 'string';
}

function safeRel(target: string | undefined, rel: string | undefined) {
  if (target !== '_blank') return rel;
  const tokens = new Set((rel ?? '').split(/\s+/).filter(Boolean));
  tokens.add('noopener');
  tokens.add('noreferrer');
  return Array.from(tokens).join(' ');
}

/**
 * A link that looks like a Button. Pass `to` for in-app navigation (react-router) or `href` for a
 * plain anchor; `target="_blank"` links automatically get `rel="noopener noreferrer"`.
 *
 * @example <ButtonLink to="/services" rightIcon={<ArrowRight />}>Explore services</ButtonLink>
 * @example <ButtonLink href="https://wa.me/254795333004" target="_blank" variant="secondary">WhatsApp</ButtonLink>
 */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(props, ref) {
  if (isAnchorProps(props)) {
    const {
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      target,
      rel,
      ...anchorProps
    } = props;
    return (
      <a
        {...anchorProps}
        ref={ref}
        target={target}
        rel={safeRel(target, rel)}
        className={buttonClasses({ variant, size, fullWidth, className })}
      >
        <ButtonContent size={size} leftIcon={leftIcon} rightIcon={rightIcon}>
          {children}
        </ButtonContent>
      </a>
    );
  }

  const {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    target,
    rel,
    ...linkProps
  } = props;
  return (
    <Link
      {...linkProps}
      ref={ref}
      target={target}
      rel={safeRel(target, rel)}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      <ButtonContent size={size} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </ButtonContent>
    </Link>
  );
});

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import { Kbd } from './Kbd';
import { mergeRefs } from './internal/mergeRefs';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Called after the clear button (or Escape) empties the field. */
  onClear?: () => void;
  /** Called on Enter. */
  onSubmit?: (value: string) => void;
  size?: 'sm' | 'md';
  autoFocus?: boolean;
  /**
   * Single-key shortcut that focuses the field from anywhere on the page (ignored while typing in
   * another field), shown as a <Kbd> hint, e.g. "/".
   */
  shortcut?: string;
  /** Accessible name (defaults to the placeholder, then "Search"). */
  ariaLabel?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Search field with icon, clear button and an optional keyboard shortcut. Escape clears it.
 *
 * @example <SearchInput value={query} onChange={setQuery} placeholder="Search orders" shortcut="/" />
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    placeholder = 'Search',
    onClear,
    onSubmit,
    size = 'md',
    autoFocus,
    shortcut,
    ariaLabel,
    id,
    name,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    className,
  },
  ref,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const setRefs = useMemo(() => mergeRefs(innerRef, ref), [ref]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!shortcut || disabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== shortcut || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      event.preventDefault();
      innerRef.current?.focus();
      innerRef.current?.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcut, disabled]);

  const clear = () => {
    onChange('');
    onClear?.();
    innerRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && value !== '') {
      // Handled here, so an enclosing dialog stays open.
      event.preventDefault();
      clear();
    } else if (event.key === 'Enter' && onSubmit) {
      event.preventDefault();
      onSubmit(value);
    }
  };

  let addon = null;
  if (value !== '' && !disabled) {
    addon = (
      <button
        type="button"
        aria-label="Clear search"
        title="Clear search"
        onClick={clear}
        className="tap-target grid size-6 place-items-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 [&>svg]:size-3.5"
      >
        <X aria-hidden="true" />
      </button>
    );
  } else if (shortcut && !focused) {
    addon = (
      <Kbd aria-hidden="true" className="hidden sm:inline-flex">
        {shortcut}
      </Kbd>
    );
  }

  return (
    <Input
      ref={setRefs}
      id={id}
      name={name}
      type="search"
      role="searchbox"
      enterKeyHint="search"
      autoComplete="off"
      spellCheck={false}
      size={size}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabelledBy ? undefined : ariaLabel ?? placeholder}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-keyshortcuts={shortcut}
      leftIcon={<Search />}
      rightAddon={addon}
      className={className}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
});

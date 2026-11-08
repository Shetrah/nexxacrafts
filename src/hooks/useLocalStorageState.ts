import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

interface StoredState<T> {
  key: string;
  value: T;
  /** `true` once the value was set through the hook and must be persisted. */
  dirty: boolean;
}

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    // Accessing localStorage throws when storage is disabled (e.g. some privacy modes).
    return false;
  }
}

function resolve<T>(initial: T | (() => T)): T {
  return typeof initial === 'function' ? (initial as () => T)() : initial;
}

function readStorage<T>(key: string, initial: T | (() => T)): T {
  if (!hasStorage()) return resolve(initial);
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? resolve(initial) : (JSON.parse(raw) as T);
  } catch {
    return resolve(initial);
  }
}

function writeStorage(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    if (value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded, storage disabled or value not serialisable: keep the in-memory value.
  }
}

/**
 * `useState` persisted to `localStorage` as JSON. Reads and writes are wrapped in try/catch, so a
 * full, disabled or corrupted store falls back to `initial` instead of crashing. Changes made in
 * other tabs are picked up through the `storage` event.
 *
 * Only the values you set are written (the initial value is not persisted until changed).
 * `T` must be JSON-serialisable.
 *
 * @example const [view, setView] = useLocalStorageState<'table' | 'board'>('nexxacrafts-jobs-view', 'table');
 */
export function useLocalStorageState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<StoredState<T>>(() => ({ key, value: readStorage(key, initial), dirty: false }));
  const initialRef = useRef(initial);

  useEffect(() => {
    initialRef.current = initial;
  });

  // A different key is a different value: re-read synchronously instead of showing the old one.
  let current = state;
  if (state.key !== key) {
    current = { key, value: readStorage(key, initial), dirty: false };
    setState(current);
  }

  useEffect(() => {
    if (state.dirty) writeStorage(state.key, state.value);
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (!hasStorage() || event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== key) return;
      setState({ key, value: readStorage(key, initialRef.current), dirty: false });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setState((previous) => ({
      key: previous.key,
      value: typeof next === 'function' ? (next as (value: T) => T)(previous.value) : next,
      dirty: true,
    }));
  }, []);

  return [current.value, setValue];
}

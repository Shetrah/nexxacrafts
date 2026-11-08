import type { MutableRefObject, Ref, RefCallback } from 'react';

/** Combines several refs (callback or object) into one callback ref. */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref) (ref as MutableRefObject<T | null>).current = value;
    }
  };
}

/** Reads the `ref` attached to a React 18 element (used when cloning triggers). */
export function getElementRef<T>(element: unknown): Ref<T> | undefined {
  if (element && typeof element === 'object' && 'ref' in element) {
    return (element as { ref?: Ref<T> }).ref ?? undefined;
  }
  return undefined;
}

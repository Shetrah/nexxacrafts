import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { measureText } from './format';
import type { TextMeasure } from './format';

/** Measured content-box size of an element, in whole CSS pixels. */
export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's size with a ResizeObserver so charts stay responsive without window
 * listeners. Widths are floored so an SVG drawn at the measured width can never overflow.
 *
 * @returns a callback ref to attach and the latest size (0 × 0 until first measured)
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>(): [
  (node: T | null) => void,
  ElementSize,
] {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!node) return undefined;
    const update = (width: number, height: number) => {
      const next = { width: Math.max(0, Math.floor(width)), height: Math.max(0, Math.floor(height)) };
      setSize((previous) =>
        previous.width === next.width && previous.height === next.height ? previous : next,
      );
    };
    const rect = node.getBoundingClientRect();
    update(rect.width, rect.height);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) update(box.width, box.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, size];
}

function fontsSettled(): boolean {
  return typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded';
}

/**
 * `true` once web fonts have loaded. Charts measure label widths with the page font, so they
 * include this in memo dependencies to re-measure when Inter arrives.
 */
export function useFontsReady(): boolean {
  const [ready, setReady] = useState(fontsSettled);

  useEffect(() => {
    if (ready || typeof document === 'undefined' || !document.fonts) return undefined;
    let active = true;
    document.fonts.ready.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [ready]);

  return ready;
}

/**
 * A text measurer bound to the current font-load state. Its identity changes once web fonts
 * load, so memoised layouts that depend on it re-measure their labels with Inter.
 */
export function useTextMeasure(): TextMeasure {
  const fontsLoaded = useFontsReady();
  return useCallback(
    (text: string, fontSize?: number, fontWeight?: number) =>
      measureText(text, fontSize, fontWeight, fontsLoaded),
    [fontsLoaded],
  );
}

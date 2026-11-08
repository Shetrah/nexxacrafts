/**
 * Returns the index reached by moving `step` positions from `from`, wrapping around and skipping
 * disabled entries. Returns -1 when every entry is disabled.
 */
export function moveIndex(
  count: number,
  from: number,
  step: 1 | -1,
  isDisabled: (index: number) => boolean,
): number {
  if (count === 0) return -1;
  let index = from;
  for (let attempt = 0; attempt < count; attempt += 1) {
    index = (index + step + count) % count;
    if (!isDisabled(index)) return index;
  }
  return -1;
}

/** First (or last) enabled index, or -1. */
export function edgeIndex(count: number, edge: 'first' | 'last', isDisabled: (index: number) => boolean): number {
  if (edge === 'first') {
    for (let index = 0; index < count; index += 1) if (!isDisabled(index)) return index;
  } else {
    for (let index = count - 1; index >= 0; index -= 1) if (!isDisabled(index)) return index;
  }
  return -1;
}

/**
 * Maps a keydown to a roving-focus target for horizontal/vertical groups (radio groups, tabs,
 * segmented controls). Returns null for keys the group does not handle.
 */
export function rovingTarget(
  key: string,
  count: number,
  current: number,
  isDisabled: (index: number) => boolean,
  orientation: 'horizontal' | 'both' = 'both',
): number | null {
  const next = orientation === 'both' ? ['ArrowRight', 'ArrowDown'] : ['ArrowRight'];
  const previous = orientation === 'both' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowLeft'];
  if (next.includes(key)) return moveIndex(count, current, 1, isDisabled);
  if (previous.includes(key)) return moveIndex(count, current, -1, isDisabled);
  if (key === 'Home') return edgeIndex(count, 'first', isDisabled);
  if (key === 'End') return edgeIndex(count, 'last', isDisabled);
  return null;
}

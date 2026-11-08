/** Joins truthy class names (local to the chart library to keep it dependency-free). */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

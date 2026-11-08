/**
 * File roles for customer uploads.
 *
 * Customers can attach, per order line:
 *   - general artwork / supporting files  → `<user-id>/drafts/<timestamp>-<name>`     (original scheme)
 *   - a sketch of what they want          → `<user-id>/sketches/<timestamp>-<name>`
 *   - reference illustrations of the desired end product
 *                                          → `<user-id>/references/<timestamp>-<name>`
 * Staff proofs live in `<staff-id>/proofs/<timestamp>-<name>`.
 *
 * The role is encoded in the storage folder, so no database change is needed: `order_items.files`
 * stays a plain `text[]`, and the existing storage RLS (first folder must be the uploader's user id;
 * staff can read customer files) already covers every folder. In browser-only demo mode, entries are
 * stored as `DEMO FILE — <folder>/<name>` for sketches/references and `DEMO FILE — <name>` for artwork.
 */

export type FileRole = 'sketch' | 'reference' | 'artwork' | 'proof';

/** Storage folder (second path segment) for each role. */
export const FILE_ROLE_FOLDERS: Record<FileRole, string> = {
  sketch: 'sketches',
  reference: 'references',
  artwork: 'drafts',
  proof: 'proofs',
};

export const FILE_ROLE_META: Record<FileRole, { label: string; staffLabel: string; description: string }> = {
  sketch: {
    label: 'Your sketch',
    staffLabel: 'Customer sketch',
    description: 'A rough drawing or photo of a hand sketch showing what you have in mind.',
  },
  reference: {
    label: 'Reference illustrations',
    staffLabel: 'Reference illustrations',
    description: 'Examples or illustrations of what you would like the finished product to look like.',
  },
  artwork: {
    label: 'Artwork & supporting files',
    staffLabel: 'Artwork & supporting files',
    description: 'Print-ready artwork, logos, fonts, copy or technical files.',
  },
  proof: {
    label: 'Proofs',
    staffLabel: 'Proofs',
    description: 'Design proofs prepared by the nexxacrafts team.',
  },
};

/** Display order when grouping files. */
export const FILE_ROLE_ORDER: FileRole[] = ['sketch', 'reference', 'artwork', 'proof'];

const DEMO_PREFIX = 'DEMO FILE — ';

/** Infers the role of an uploaded file from its storage path (or demo-mode label). Unknown → artwork. */
export function fileRoleFromPath(path: string): FileRole {
  const clean = path.startsWith(DEMO_PREFIX) ? path.slice(DEMO_PREFIX.length) : path;
  const segments = clean.split('/');
  // Live paths: <user-id>/<folder>/<file>. Demo paths: <folder>/<file>.
  const folder = segments.length >= 3 ? segments[1] : segments.length === 2 ? segments[0] : '';
  const match = (Object.keys(FILE_ROLE_FOLDERS) as FileRole[]).find((role) => FILE_ROLE_FOLDERS[role] === folder);
  return match ?? 'artwork';
}

/** Groups file paths by role, in FILE_ROLE_ORDER, omitting empty groups. */
export function groupFilesByRole(paths: readonly string[]): Array<{ role: FileRole; files: string[] }> {
  const groups = new Map<FileRole, string[]>();
  for (const path of paths) {
    const role = fileRoleFromPath(path);
    groups.set(role, [...(groups.get(role) ?? []), path]);
  }
  return FILE_ROLE_ORDER.filter((role) => groups.has(role)).map((role) => ({ role, files: groups.get(role) ?? [] }));
}

/** True for raster/vector image formats that can be previewed in an <img>. */
export function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(path);
}

/** True when the configurator should offer the sketch + reference-illustration uploads for this line. */
export function wantsDesignDirection(serviceSlug: string, configuration: Record<string, unknown>): boolean {
  if (serviceSlug === 'graphic-design') return true;
  return configuration.artwork === 'Need design assistance';
}

/** Demo-mode label for a file that could not be uploaded (no Supabase): keeps the role recoverable. */
export function demoFileLabel(role: FileRole, fileName: string): string {
  return role === 'artwork' ? `${DEMO_PREFIX}${fileName}` : `${DEMO_PREFIX}${FILE_ROLE_FOLDERS[role]}/${fileName}`;
}

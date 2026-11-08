/**
 * Private customer files in the `customer-files` storage bucket.
 *
 * Storage RLS: a user may upload only under their own folder (`<user-id>/…`) and read their own
 * folder; staff (all roles except finance) can read every folder; only super_admin/admin may
 * update or delete other users' files. The bucket rejects files over 20 MB and file types outside
 * its allow-list (PNG, JPEG, WEBP, SVG, PDF, PostScript/AI, DXF, ZIP, DOCX, octet-stream).
 */
import { getClient } from './client';
import { toApiError } from './errors';

export const CUSTOMER_FILES_BUCKET = 'customer-files';

/** Per-file upload limit (matches the bucket's `file_size_limit`). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Prefix of the file references recorded in browser demo mode (no file is uploaded). */
export const DEMO_FILE_PREFIX = 'DEMO FILE — ';

/** Folders listed by {@link listUserFiles}. */
export type UserFileFolder = 'drafts' | 'proofs';

export const USER_FILE_FOLDERS: readonly UserFileFolder[] = ['drafts', 'proofs'];

/** A file in a user's storage folder. */
export interface StoredFile {
  /** Full storage path, e.g. `'<user-id>/drafts/1730967000000-logo.pdf'`. */
  path: string;
  /** Display name without folders or the upload timestamp, e.g. `'logo.pdf'`. */
  name: string;
  /** Size in bytes, when reported by storage. */
  size: number | null;
  createdAt: string | null;
  folder: UserFileFolder;
  mimeType: string | null;
}

/** `true` for `DEMO FILE — name` references recorded without Supabase. */
export function isDemoFilePath(path: string | null | undefined): boolean {
  return typeof path === 'string' && path.startsWith(DEMO_FILE_PREFIX);
}

/**
 * Human-readable name for a stored path: strips the folders and the leading `<timestamp>-` added
 * on upload (and the demo-mode prefix), e.g. `'u/drafts/1730967000000-logo.pdf'` → `'logo.pdf'`.
 */
export function displayFileName(path: string | null | undefined): string {
  if (!path) return '';
  if (isDemoFilePath(path)) return path.slice(DEMO_FILE_PREFIX.length).trim() || path;
  const base = path.split('/').pop() || path;
  return base.replace(/^\d{10,}-/, '') || base;
}

/**
 * Uploads a file to `<userId>/<folder>/<Date.now()>-<sanitised name>` (the same path scheme as the
 * service configurator; never overwrites) and returns the storage path to save with the record.
 *
 * Access (storage RLS): `userId` must be the signed-in user's id — users can upload only into their
 * own folder.
 */
export async function uploadUserFile(userId: string, file: File, folder = 'drafts'): Promise<string> {
  const client = getClient();
  if (!userId) throw new Error('Please sign in before uploading files.');
  if (!/^[A-Za-z0-9_-]+$/.test(folder)) throw new Error('Choose a valid upload folder.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} exceeds the 20 MB per-file limit.`);

  const path = `${userId}/${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { error } = await client.storage.from(CUSTOMER_FILES_BUCKET).upload(path, file, { upsert: false });
  if (error) throw toApiError(error);
  return path;
}

export interface SignedUrlOptions {
  /** Ask the browser to download instead of display; a string sets the download file name. */
  download?: boolean | string;
}

/**
 * A temporary URL for a private file (default validity 10 minutes).
 *
 * Access (storage RLS): files in your own folder; staff except finance can sign any file. Customers
 * therefore cannot open files stored under a staff member's folder (e.g. proofs a designer uploaded).
 */
export async function createSignedFileUrl(
  path: string,
  expiresInSeconds = 600,
  options: SignedUrlOptions = {},
): Promise<string> {
  const client = getClient();
  if (isDemoFilePath(path)) throw new Error('This is a demo file reference. No file was uploaded.');
  const signOptions = options.download !== undefined ? { download: options.download } : undefined;
  const { data, error } = await client.storage
    .from(CUSTOMER_FILES_BUCKET)
    .createSignedUrl(path, expiresInSeconds, signOptions);
  if (error) throw toApiError(error);
  return data.signedUrl;
}

/**
 * Files in a user's `drafts` and `proofs` folders, newest first.
 *
 * Access (storage RLS): your own folders; staff except finance can list any user's folders.
 */
export async function listUserFiles(userId: string): Promise<StoredFile[]> {
  const client = getClient();
  const lists = await Promise.all(
    USER_FILE_FOLDERS.map(async (folder) => {
      const prefix = `${userId}/${folder}`;
      const { data, error } = await client.storage
        .from(CUSTOMER_FILES_BUCKET)
        .list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw toApiError(error);
      return data
        .filter((entry) => entry.id !== null && entry.name !== '.emptyFolderPlaceholder')
        .map<StoredFile>((entry) => ({
          path: `${prefix}/${entry.name}`,
          name: displayFileName(entry.name),
          size: typeof entry.metadata?.size === 'number' ? entry.metadata.size : null,
          createdAt: entry.created_at,
          folder,
          mimeType: typeof entry.metadata?.mimetype === 'string' ? entry.metadata.mimetype : null,
        }));
    }),
  );
  return lists.flat().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

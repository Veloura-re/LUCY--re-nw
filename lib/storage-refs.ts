/**
 * Pure helpers for stored-file references (no server dependencies, so scripts can import them).
 *
 * Uploaded files live in private buckets. The database stores a stable reference
 * (`/api/files/<bucket>/<path>`); a short-lived signed URL is created only when someone opens it.
 * Stable references mean no cache ever holds an expired link.
 */

export const FILE_BUCKETS = ['school-assets', 'books'] as const;
export type FileBucket = (typeof FILE_BUCKETS)[number];

const FILE_PREFIX = '/api/files/';

/** Upload names are generated server-side (timestamp, short id, extension) under ids and fixed folders. */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,200}$/;

export function isFileBucket(value: string): value is FileBucket {
    return (FILE_BUCKETS as readonly string[]).includes(value);
}

export function fileRef(bucket: FileBucket, path: string): string {
    return `${FILE_PREFIX}${bucket}/${path}`;
}

/** Splits a stored `/api/files/<bucket>/<path>` reference. Returns null for anything else. */
export function parseFileRef(ref: string): { bucket: FileBucket; path: string } | null {
    if (!ref.startsWith(FILE_PREFIX)) return null;
    const [bucket, ...rest] = ref.slice(FILE_PREFIX.length).split('/');
    if (!isFileBucket(bucket) || rest.length === 0) return null;
    return { bucket, path: rest.join('/') };
}

// Matches a Supabase public object URL anywhere inside a string (the book description embeds one in JSON).
const LEGACY_PUBLIC_URL = /https?:\/\/[^\s"'<>\\/]+\/storage\/v1\/object\/public\/(school-assets|books)\/([^\s"'<>\\?#]+)/g;

/** Rewrites legacy public Supabase URLs inside a string to stable references; other text is untouched. */
export function rewriteLegacyUrlsInString(value: string): string {
    return value.replace(LEGACY_PUBLIC_URL, (_match, bucket: FileBucket, path: string) => fileRef(bucket, path));
}

/** Same rewrite applied through strings, arrays and plain objects (JSON columns). */
export function rewriteLegacyUrls<T>(value: T): T {
    if (typeof value === 'string') return rewriteLegacyUrlsInString(value) as unknown as T;
    if (Array.isArray(value)) return value.map(rewriteLegacyUrls) as unknown as T;
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, rewriteLegacyUrls(entry)])
        ) as unknown as T;
    }
    return value;
}

export interface FileViewer {
    id: string;
    role: string;
    schoolId: string | null;
}

/**
 * Whether a viewer may open an object. The first path segment is the owning school (or
 * `unscoped/<userId>` for users without one); every segment must be a plain generated name.
 */
export function canReadStoragePath(viewer: FileViewer, path: string): boolean {
    const segments = path.split('/');
    if (segments.length < 2 || segments.some((segment) => segment === '..' || !SAFE_SEGMENT.test(segment))) return false;
    if (viewer.role === 'SUPERADMIN') return true;
    if (segments[0] === 'unscoped') return segments[1] === viewer.id;
    if (!viewer.schoolId || segments[0] !== viewer.schoolId) return false;

    // Payment receipts are finance records; a student's coursework is for its author and the school's teaching staff.
    if (segments[1] === 'receipts') return FINANCE_VIEWERS.includes(viewer.role);
    if (segments[1] === 'student-submissions') return segments[2] === viewer.id || TEACHING_VIEWERS.includes(viewer.role);
    return true;
}

const FINANCE_VIEWERS = ['OWNER', 'PRINCIPAL', 'ACCOUNTANT'];
const TEACHING_VIEWERS = ['OWNER', 'PRINCIPAL', 'TEACHER', 'HOMEROOM'];

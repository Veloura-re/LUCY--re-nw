/**
 * Server-side upload validation shared by every upload route.
 *
 * Client-supplied `file.type` and `file.name` are untrusted. A file is accepted only when its
 * declared MIME type is on the route's allowlist, its leading bytes match that type, and it is
 * within the size cap. The stored extension is derived from the verified type, never the name.
 * SVG and HTML are deliberately not allowlisted: they can carry script and the target buckets
 * are public.
 */

export type UploadKind = 'jpeg' | 'png' | 'webp' | 'gif' | 'pdf' | 'doc' | 'docx' | 'txt';

const KINDS: Record<UploadKind, { mime: string; ext: string }> = {
    jpeg: { mime: 'image/jpeg', ext: 'jpg' },
    png: { mime: 'image/png', ext: 'png' },
    webp: { mime: 'image/webp', ext: 'webp' },
    gif: { mime: 'image/gif', ext: 'gif' },
    pdf: { mime: 'application/pdf', ext: 'pdf' },
    doc: { mime: 'application/msword', ext: 'doc' },
    docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
    txt: { mime: 'text/plain', ext: 'txt' },
};

export const IMAGE_KINDS: UploadKind[] = ['jpeg', 'png', 'webp', 'gif'];
export const DOCUMENT_KINDS: UploadKind[] = ['pdf', 'doc', 'docx', 'txt'];

const MB = 1024 * 1024;

export interface UploadRules {
    kinds: UploadKind[];
    /** Maximum size in bytes. */
    maxBytes: number;
}

export const IMAGE_RULES: UploadRules = { kinds: IMAGE_KINDS, maxBytes: 5 * MB };
export const GENERAL_RULES: UploadRules = { kinds: [...IMAGE_KINDS, ...DOCUMENT_KINDS], maxBytes: 15 * MB };
export const MESSAGE_RULES: UploadRules = { kinds: [...IMAGE_KINDS, ...DOCUMENT_KINDS], maxBytes: 10 * MB };
export const BOOK_FILE_RULES: UploadRules = { kinds: ['pdf'], maxBytes: 50 * MB };

/**
 * Flat result type (rather than a discriminated union) so it narrows correctly regardless of the
 * project's `strict` setting. On failure `error` is set; on success `extension` and `mimeType` are.
 */
export interface UploadValidation {
    ok: boolean;
    error: string;
    extension: string;
    mimeType: string;
    kind: UploadKind | null;
}

const fail = (error: string): UploadValidation => ({ ok: false, error, extension: '', mimeType: '', kind: null });

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
    return signature.every((value, index) => bytes[offset + index] === value);
}

/** Returns true when the leading bytes are consistent with the claimed kind. */
export function matchesSignature(kind: UploadKind, bytes: Uint8Array): boolean {
    switch (kind) {
        case 'jpeg':
            return startsWith(bytes, [0xff, 0xd8, 0xff]);
        case 'png':
            return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        case 'gif':
            return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
        case 'webp':
            return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
        case 'pdf':
            return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
        case 'doc':
            return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
        case 'docx':
            return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
        case 'txt':
            return !bytes.includes(0);
    }
}

export async function validateUpload(file: unknown, rules: UploadRules): Promise<UploadValidation> {
    if (!file || typeof file !== 'object' || typeof (file as File).arrayBuffer !== 'function') {
        return fail('Missing file');
    }
    const upload = file as File;

    if (upload.size <= 0) return fail('File is empty');
    if (upload.size > rules.maxBytes) {
        return fail(`File is too large. Maximum size is ${Math.floor(rules.maxBytes / MB)} MB.`);
    }

    const declared = (upload.type || '').toLowerCase();
    const kind = rules.kinds.find((k) => KINDS[k].mime === declared);
    if (!kind) return fail('Unsupported file format.');

    const head = new Uint8Array(await upload.slice(0, 512).arrayBuffer());
    if (!matchesSignature(kind, head)) {
        return fail('File content does not match its declared type.');
    }

    return { ok: true, error: '', extension: KINDS[kind].ext, mimeType: KINDS[kind].mime, kind };
}

/** Folder names the generic upload route may write into. */
export const ALLOWED_UPLOAD_FOLDERS = ['avatars', 'logos', 'materials', 'submissions'] as const;

export function resolveUploadFolder(value: unknown): (typeof ALLOWED_UPLOAD_FOLDERS)[number] {
    return ALLOWED_UPLOAD_FOLDERS.find((folder) => folder === value) ?? 'avatars';
}

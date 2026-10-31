import {
    canReadStoragePath,
    fileRef,
    parseFileRef,
    rewriteLegacyUrls,
    rewriteLegacyUrlsInString,
} from '@/lib/storage-refs';
import { sanitizeRestoreRow } from '@/lib/backup-restore';

const PUBLIC = 'https://abc.supabase.co/storage/v1/object/public';

describe('stored file references', () => {
    test('round-trips a reference', () => {
        const ref = fileRef('books', 'school-1/pdfs/1-ab.pdf');
        expect(ref).toBe('/api/files/books/school-1/pdfs/1-ab.pdf');
        expect(parseFileRef(ref)).toEqual({ bucket: 'books', path: 'school-1/pdfs/1-ab.pdf' });
    });

    test('rejects unknown buckets and non-references', () => {
        expect(parseFileRef('/api/files/messages/room/x.png')).toBeNull();
        expect(parseFileRef('https://example.com/a.png')).toBeNull();
        expect(parseFileRef('/api/files/books')).toBeNull();
    });
});

describe('legacy URL rewrite', () => {
    test('rewrites public URLs for both buckets', () => {
        expect(rewriteLegacyUrlsInString(`${PUBLIC}/school-assets/s1/avatars/a.jpg`)).toBe('/api/files/school-assets/s1/avatars/a.jpg');
        expect(rewriteLegacyUrlsInString(`${PUBLIC}/books/s1/pdfs/b.pdf`)).toBe('/api/files/books/s1/pdfs/b.pdf');
    });

    test('leaves external links and other buckets alone', () => {
        const drive = 'https://drive.google.com/file/d/xyz/view';
        expect(rewriteLegacyUrlsInString(drive)).toBe(drive);
        const other = `${PUBLIC}/avatars/x.png`;
        expect(rewriteLegacyUrlsInString(other)).toBe(other);
    });

    test('rewrites inside the JSON text of a book description', () => {
        const description = JSON.stringify({ text: 'Algebra', coverUrl: `${PUBLIC}/books/s1/covers/c.jpg` });
        expect(JSON.parse(rewriteLegacyUrlsInString(description)).coverUrl).toBe('/api/files/books/s1/covers/c.jpg');
    });

    test('rewrites nested JSON values and is idempotent', () => {
        const input = [{ name: 'work.pdf', url: `${PUBLIC}/school-assets/s1/submissions/w.pdf` }];
        const once = rewriteLegacyUrls(input);
        expect(once).toEqual([{ name: 'work.pdf', url: '/api/files/school-assets/s1/submissions/w.pdf' }]);
        expect(rewriteLegacyUrls(once)).toEqual(once);
        expect(rewriteLegacyUrls(null)).toBeNull();
    });

    test('backup restore rewrites a legacy photo URL', () => {
        const row = sanitizeRestoreRow('Student', { id: 's', photoUrl: `${PUBLIC}/school-assets/s1/avatars/a.jpg` }, 's1');
        expect(row?.photoUrl).toBe('/api/files/school-assets/s1/avatars/a.jpg');
    });
});

describe('canReadStoragePath', () => {
    const teacher = { id: 'u1', role: 'TEACHER', schoolId: 'school-a' };

    test('allows the owning school and denies others', () => {
        expect(canReadStoragePath(teacher, 'school-a/avatars/1-ab.jpg')).toBe(true);
        expect(canReadStoragePath(teacher, 'school-b/avatars/1-ab.jpg')).toBe(false);
    });

    test('unscoped paths belong to their user only', () => {
        const loose = { id: 'u9', role: 'PARENT', schoolId: null };
        expect(canReadStoragePath(loose, 'unscoped/u9/avatars/1-ab.jpg')).toBe(true);
        expect(canReadStoragePath(loose, 'unscoped/u1/avatars/1-ab.jpg')).toBe(false);
        expect(canReadStoragePath(loose, 'school-a/avatars/1-ab.jpg')).toBe(false);
    });

    test('superadmin can read any school', () => {
        expect(canReadStoragePath({ id: 'x', role: 'SUPERADMIN', schoolId: null }, 'school-b/logos/1-ab.png')).toBe(true);
    });

    test('rejects traversal and unsafe segments', () => {
        expect(canReadStoragePath(teacher, 'school-a/../school-b/a.jpg')).toBe(false);
        expect(canReadStoragePath(teacher, 'school-a/a b.jpg')).toBe(false);
        expect(canReadStoragePath(teacher, 'school-a')).toBe(false);
        expect(canReadStoragePath({ id: 'x', role: 'SUPERADMIN', schoolId: null }, 'a/../b/c.jpg')).toBe(false);
    });
});

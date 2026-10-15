import { NextResponse } from 'next/server';
import { requireRole, publicErrorMessage, isValidEmail } from '@/lib/security';
import { createClient as createSupabaseAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { sendInviteEmail } from '@/lib/email';
import { reportServerError } from '@/lib/error-capture';
import { logActivity } from '@/lib/audit';
import {
    sanitizeRestoreRow,
    resolveRestorableRole,
    chunk,
    MAX_RESTORE_ROWS_PER_TABLE,
    type RestoreTable,
} from '@/lib/backup-restore';

const ID_CHUNK = 200;

/**
 * Returns the ids from `ids` that already exist and are owned by `schoolId`.
 * Rows that exist but belong to another tenant are deliberately not returned, so callers can
 * tell "new", "ours" and "foreign" apart: foreign = existing minus owned.
 */
async function loadExisting(
    admin: SupabaseClient,
    table: string,
    ids: string[],
    columns: string
): Promise<any[]> {
    const rows: any[] = [];
    for (const part of chunk(ids, ID_CHUNK)) {
        if (part.length === 0) continue;
        const { data } = await admin.from(table).select(columns).in('id', part);
        if (data) rows.push(...data);
    }
    return rows;
}

function asRows(value: unknown): unknown[] {
    return Array.isArray(value) ? value.slice(0, MAX_RESTORE_ROWS_PER_TABLE) : [];
}

function cleanRows(table: RestoreTable, value: unknown, schoolId: string) {
    return asRows(value)
        .map((row) => sanitizeRestoreRow(table, row, schoolId))
        .filter((row): row is Record<string, unknown> => row !== null);
}

export async function POST(request: Request) {
    try {
        const adminUser = await requireRole(['OWNER', 'PRINCIPAL', 'SUPERADMIN']);
        if (!adminUser.schoolId) return NextResponse.json({ error: 'No school linked' }, { status: 400 });
        const schoolId = adminUser.schoolId;

        const backupData = await request.json() as any;

        if (!backupData || !backupData.metadata || backupData.metadata.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Invalid backup file or backup belongs to another school' }, { status: 400 });
        }

        const { data } = backupData;
        if (!data || typeof data !== 'object') return NextResponse.json({ error: 'No data found in backup' }, { status: 400 });

        const admin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const counts = {
            restoredUsers: 0,
            restoredStudents: 0,
            restoredClasses: 0,
            restoredGrades: 0,
            restoredSubjects: 0,
            restoredInvoices: 0,
            restoredPayments: 0,
            skipped: 0,
        };

        // ---- 1. Users: only previously missing users are restored; existing users are never modified.
        // The role in the file is a request only, validated by resolveRestorableRole. File-supplied
        // schoolId is ignored and the caller's school is always used.
        const userRows = cleanRows('User', data.users, schoolId);
        const requestedRoles = new Map<string, unknown>();
        for (const raw of asRows(data.users)) {
            if (raw && typeof raw === 'object') requestedRoles.set((raw as any).id, (raw as any).role);
        }
        const existingUsers = new Set(
            (await loadExisting(admin, 'User', userRows.map((u) => u.id as string), 'id')).map((u) => u.id)
        );

        const { data: schoolData } = await admin.from('School').select('name').eq('id', schoolId).single();

        for (const user of userRows) {
            if (existingUsers.has(user.id as string)) {
                counts.skipped++;
                continue;
            }
            const role = resolveRestorableRole(requestedRoles.get(user.id as string), adminUser.role);
            if (!role || !isValidEmail(user.email)) {
                counts.skipped++;
                continue;
            }

            const { error: insertError } = await admin.from('User').insert({
                ...user,
                role,
                schoolId,
                verified: false, // must re-verify through an invite token
            });
            if (insertError) {
                counts.skipped++;
                continue;
            }

            if (['TEACHER', 'HOMEROOM', 'PRINCIPAL'].includes(role)) {
                const token = `inv_${globalThis.crypto.randomUUID().replace(/-/g, '')}`;
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                await admin.from('InviteToken').insert({
                    id: globalThis.crypto.randomUUID(),
                    token,
                    email: user.email,
                    role,
                    schoolId,
                    expiresAt: expiresAt.toISOString(),
                    createdAt: new Date().toISOString()
                });

                const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://5-cn.net'}/invite/${token}`;
                await sendInviteEmail(user.email as string, inviteUrl, schoolData?.name || 'Institution', token, role, schoolId);
            }
            counts.restoredUsers++;
        }

        // ---- 2. Grades and subjects: upsert only rows that are new or already owned by this school.
        const upsertOwned = async (
            table: 'Grade' | 'Subject',
            value: unknown,
            counter: 'restoredGrades' | 'restoredSubjects'
        ) => {
            const rows = cleanRows(table, value, schoolId);
            if (rows.length === 0) return;
            const existing = await loadExisting(admin, table, rows.map((r) => r.id as string), 'id, schoolId');
            const foreign = new Set(existing.filter((e) => e.schoolId !== schoolId).map((e) => e.id));
            const writable = rows.filter((r) => !foreign.has(r.id as string));
            counts.skipped += rows.length - writable.length;
            if (writable.length > 0) {
                const { error } = await admin.from(table).upsert(writable);
                if (!error) counts[counter] += writable.length;
            }
        };
        await upsertOwned('Grade', data.grades, 'restoredGrades');
        await upsertOwned('Subject', data.subjects, 'restoredSubjects');

        // Grade ids that belong to this school (after the restore above).
        const { data: schoolGrades } = await admin.from('Grade').select('id').eq('schoolId', schoolId);
        const schoolGradeIds = new Set((schoolGrades || []).map((g: any) => g.id));

        // ---- 3. Classes: must reference a grade of this school; existing classes must be ours.
        {
            const rows = cleanRows('Class', data.classes, schoolId).filter((c) => schoolGradeIds.has(c.gradeId as string));
            const existing = await loadExisting(admin, 'Class', rows.map((r) => r.id as string), 'id, schoolId, gradeId');
            const existingById = new Map(existing.map((e) => [e.id, e]));
            const writable = rows.filter((r) => {
                const current = existingById.get(r.id as string);
                if (!current) return true;
                return current.schoolId === schoolId || (current.schoolId == null && schoolGradeIds.has(current.gradeId));
            });
            counts.skipped += asRows(data.classes).length - writable.length;

            // The homeroom teacher must be a member of this school; otherwise drop the link.
            const teacherIds = Array.from(new Set(writable.map((c) => c.homeroomTeacherId).filter((v): v is string => typeof v === 'string')));
            const teachers = await loadExisting(admin, 'User', teacherIds, 'id, schoolId');
            const schoolTeachers = new Set(teachers.filter((t) => t.schoolId === schoolId).map((t) => t.id));
            for (const cls of writable) {
                if (cls.homeroomTeacherId && !schoolTeachers.has(cls.homeroomTeacherId as string)) {
                    cls.homeroomTeacherId = null;
                }
            }

            if (writable.length > 0) {
                const { error } = await admin.from('Class').upsert(writable);
                if (!error) counts.restoredClasses += writable.length;
            }
        }

        const { data: schoolClasses } = await admin.from('Class').select('id').eq('schoolId', schoolId);
        const schoolClassIds = new Set((schoolClasses || []).map((c: any) => c.id));

        // ---- 4. Students: must reference a grade of this school. The user link is never restored.
        {
            const rows = cleanRows('Student', data.students, schoolId).filter((s) => schoolGradeIds.has(s.gradeId as string));
            const existing = await loadExisting(admin, 'Student', rows.map((r) => r.id as string), 'id, schoolId');
            const foreign = new Set(existing.filter((e) => e.schoolId !== schoolId).map((e) => e.id));
            const writable = rows.filter((r) => !foreign.has(r.id as string));
            counts.skipped += asRows(data.students).length - writable.length;
            for (const student of writable) {
                if (student.classId && !schoolClassIds.has(student.classId as string)) student.classId = null;
            }
            if (writable.length > 0) {
                const { error } = await admin.from('Student').upsert(writable);
                if (!error) counts.restoredStudents += writable.length;
            }
        }

        // ---- 5. Invoices: the student must belong to this school; existing invoices must be ours.
        const ownedInvoiceIds = new Set<string>();
        {
            const rows = cleanRows('Invoice', data.invoices, schoolId);
            const studentIds = Array.from(new Set(rows.map((r) => r.studentId).filter((v): v is string => typeof v === 'string')));
            const students = await loadExisting(admin, 'Student', studentIds, 'id, schoolId');
            const schoolStudents = new Set(students.filter((s) => s.schoolId === schoolId).map((s) => s.id));
            const existing = await loadExisting(admin, 'Invoice', rows.map((r) => r.id as string), 'id, schoolId');
            const foreign = new Set(existing.filter((e) => e.schoolId !== schoolId).map((e) => e.id));
            const writable = rows.filter((r) => schoolStudents.has(r.studentId as string) && !foreign.has(r.id as string));
            counts.skipped += asRows(data.invoices).length - writable.length;
            if (writable.length > 0) {
                const { error } = await admin.from('Invoice').upsert(writable);
                if (!error) {
                    counts.restoredInvoices += writable.length;
                    writable.forEach((r) => ownedInvoiceIds.add(r.id as string));
                }
            }
        }

        // ---- 6. Payments: the invoice must be owned by this school (restored or pre-existing).
        {
            const rows = cleanRows('Payment', data.payments, schoolId);
            const invoiceIds = Array.from(new Set(rows.map((r) => r.invoiceId).filter((v): v is string => typeof v === 'string')));
            const invoices = await loadExisting(admin, 'Invoice', invoiceIds, 'id, schoolId');
            invoices.filter((i) => i.schoolId === schoolId).forEach((i) => ownedInvoiceIds.add(i.id));

            const existing = await loadExisting(admin, 'Payment', rows.map((r) => r.id as string), 'id, invoiceId');
            const existingInvoiceIds = Array.from(new Set(existing.map((e) => e.invoiceId)));
            const existingInvoices = await loadExisting(admin, 'Invoice', existingInvoiceIds, 'id, schoolId');
            const ownedExistingInvoices = new Set(existingInvoices.filter((i) => i.schoolId === schoolId).map((i) => i.id));
            const foreign = new Set(existing.filter((e) => !ownedExistingInvoices.has(e.invoiceId)).map((e) => e.id));

            const writable = rows.filter((r) => ownedInvoiceIds.has(r.invoiceId as string) && !foreign.has(r.id as string));
            counts.skipped += asRows(data.payments).length - writable.length;
            if (writable.length > 0) {
                const { error } = await admin.from('Payment').upsert(writable);
                if (!error) counts.restoredPayments += writable.length;
            }
        }

        await logActivity({
            userId: adminUser.id,
            schoolId,
            action: 'RESTORE_BACKUP',
            resourceType: 'BACKUP',
            ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('cf-connecting-ip') || undefined,
            after: counts
        });

        return NextResponse.json({
            success: true,
            message: `Restored ${counts.restoredUsers} missing users, ${counts.restoredStudents} students, ${counts.restoredClasses} classes, ${counts.restoredGrades} grades, ${counts.restoredSubjects} subjects, ${counts.restoredInvoices} invoices and ${counts.restoredPayments} payments. ${counts.skipped} records were skipped because they were invalid or belong to another institution.`,
            counts
        });

    } catch (error: any) {
        console.error("Backup Restore Error:", error);
        void reportServerError(error, { status: 500 });
        return NextResponse.json({ error: publicErrorMessage(error, 'Failed to restore backup') }, { status: 500 });
    }
}

#!/usr/bin/env ts-node
/**
 * Rewrites legacy public Supabase storage URLs stored in the database to stable
 * /api/files/<bucket>/<path> references. Dry run by default; pass --apply to write.
 * Idempotent: a second run reports zero changes.
 *
 * Run BEFORE storage-private-files.sql flips the buckets to private.
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-file-urls.ts [--apply]
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { rewriteLegacyUrls } from '../lib/storage-refs';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

interface Target {
    label: string;
    findMany: () => Promise<Array<{ id: string } & Record<string, unknown>>>;
    update: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    fields: string[];
}

// Json columns hold arrays of { name, url }; string columns hold a URL, or JSON text for Book.description.
const targets: Target[] = [
    { label: 'User.photoUrl', fields: ['photoUrl'], findMany: () => prisma.user.findMany({ where: { photoUrl: { not: null } }, select: { id: true, photoUrl: true } }), update: (id, data) => prisma.user.update({ where: { id }, data }) },
    { label: 'Student.photoUrl', fields: ['photoUrl'], findMany: () => prisma.student.findMany({ where: { photoUrl: { not: null } }, select: { id: true, photoUrl: true } }), update: (id, data) => prisma.student.update({ where: { id }, data }) },
    { label: 'School.logoUrl', fields: ['logoUrl'], findMany: () => prisma.school.findMany({ where: { logoUrl: { not: null } }, select: { id: true, logoUrl: true } }), update: (id, data) => prisma.school.update({ where: { id }, data }) },
    { label: 'Book.fileUrl/description', fields: ['fileUrl', 'description'], findMany: () => prisma.book.findMany({ select: { id: true, fileUrl: true, description: true } }), update: (id, data) => prisma.book.update({ where: { id }, data }) },
    { label: 'Assignment.materials', fields: ['materials'], findMany: () => prisma.assignment.findMany({ where: { materials: { not: null } }, select: { id: true, materials: true } }) as never, update: (id, data) => prisma.assignment.update({ where: { id }, data }) },
    { label: 'AssignmentSubmission.attachments', fields: ['attachments'], findMany: () => prisma.assignmentSubmission.findMany({ where: { attachments: { not: null } }, select: { id: true, attachments: true } }) as never, update: (id, data) => prisma.assignmentSubmission.update({ where: { id }, data }) },
    { label: 'Lesson.materials', fields: ['materials'], findMany: () => prisma.lesson.findMany({ where: { materials: { not: null } }, select: { id: true, materials: true } }) as never, update: (id, data) => prisma.lesson.update({ where: { id }, data }) },
    { label: 'BillingReceipt.receiptUrl', fields: ['receiptUrl'], findMany: () => prisma.billingReceipt.findMany({ select: { id: true, receiptUrl: true } }), update: (id, data) => prisma.billingReceipt.update({ where: { id }, data }) },
    { label: 'InstitutionalExpense.receiptUrl', fields: ['receiptUrl'], findMany: () => prisma.institutionalExpense.findMany({ where: { receiptUrl: { not: null } }, select: { id: true, receiptUrl: true } }), update: (id, data) => prisma.institutionalExpense.update({ where: { id }, data }) },
];

async function main() {
    console.log(apply ? 'APPLY mode: writing changes' : 'DRY RUN: no changes written (pass --apply to write)');
    let total = 0;

    for (const target of targets) {
        const rows = await target.findMany();
        let changed = 0;

        for (const row of rows) {
            const data: Record<string, unknown> = {};
            for (const field of target.fields) {
                const before = JSON.stringify(row[field] ?? null);
                const after = rewriteLegacyUrls(row[field]);
                if (JSON.stringify(after ?? null) !== before) data[field] = after;
            }
            if (Object.keys(data).length === 0) continue;
            changed++;
            if (apply) await target.update(row.id, data);
        }

        total += changed;
        console.log(`${target.label.padEnd(36)} scanned ${String(rows.length).padStart(6)}  ${apply ? 'updated' : 'would update'} ${changed}`);
    }

    console.log(`Total ${apply ? 'updated' : 'to update'}: ${total}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());

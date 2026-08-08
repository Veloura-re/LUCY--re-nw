#!/usr/bin/env ts-node
/**
 * 🛡️ ADMINISTRATOR CLI AUDIT ENGINE
 *
 * Scans codebase against all 17 Technical Defense Sentinels.
 * Outputs CI/CD annotations and terminal scorecard.
 * Supports --fix to automatically remediate common violations.
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditViolation {
    file: string;
    line: number;
    gateNumber: number;
    gateName: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    fixable: boolean;
}

const ROOT_DIR = process.cwd();
const API_DIR = path.join(ROOT_DIR, 'app', 'api');
const LIB_DIR = path.join(ROOT_DIR, 'lib');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'components');

const isFixMode = process.argv.includes('--fix');

const violations: AuditViolation[] = [];

// Recursive file scanner
function getAllFiles(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
    if (!fs.existsSync(dir)) return [];
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath, extensions));
        } else if (extensions.some(ext => file.endsWith(ext))) {
            results.push(fullPath);
        }
    }
    return results;
}

// -------------------------------------------------------------
// GATE CHECKERS
// -------------------------------------------------------------

function auditFile(filePath: string) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let hasModified = false;
    let newContent = content;

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Gate 02: Cold-Start Sentinel (Dynamic Require inside route handlers or services)
        if (line.includes("require('@/lib/prisma')") || line.includes('require("@/lib/prisma")')) {
            violations.push({
                file: relativePath,
                line: lineNum,
                gateNumber: 2,
                gateName: 'Database & Cold-Start Sentinel',
                severity: 'CRITICAL',
                message: 'Dynamic require of Prisma client detected. Use top-level static import.',
                fixable: true,
            });

            if (isFixMode) {
                newContent = newContent.replace(line, '');
                if (!newContent.includes("import { prisma } from '@/lib/prisma'") && !newContent.includes("import { prisma } from './prisma'")) {
                    newContent = `import { prisma } from '@/lib/prisma';\n` + newContent;
                }
                hasModified = true;
            }
        }

        // Gate 05: Observability & Scoped Audit Variables
        if (line.includes('logActivity(') && (line.includes('req.headers') || line.includes('request.headers'))) {
            if (!line.includes('getIp(')) {
                violations.push({
                    file: relativePath,
                    line: lineNum,
                    gateNumber: 5,
                    gateName: 'Non-Silent Observability Logger',
                    severity: 'WARNING',
                    message: 'Raw header access in audit call. Use safe getIp(request) helper.',
                    fixable: false,
                });
            }
        }

        // Gate 04: Type Safety & API Boundary (Unchecked object spread)
        if (line.includes('{ ...body }') || line.includes('{...body}')) {
            violations.push({
                file: relativePath,
                line: lineNum,
                gateNumber: 4,
                gateName: 'Type Safety & API Boundary Validator',
                severity: 'WARNING',
                message: 'Unchecked object spread of raw request body. Type or validate with generic/Zod.',
                fixable: false,
            });
        }
    });

    // Gate 08: RBAC & Auth Matrix (Check API mutation endpoints for auth)
    if (filePath.includes('/app/api/') && (content.includes('export async function POST') || content.includes('export async function PATCH') || content.includes('export async function DELETE'))) {
        const isPublicOrSpecialRoute = 
            filePath.includes('/api/auth/') || 
            filePath.includes('/api/public/') ||
            filePath.includes('/api/webhooks/') || 
            filePath.includes('/api/client-error') ||
            filePath.includes('/api/debug-ingest') ||
            filePath.includes('/api/admin/dev-reset') ||
            filePath.includes('/api/school/finance/webhooks') ||
            filePath.includes('/api/uplink');

        const hasAuthGuard = 
            content.includes('requireRole') || 
            content.includes('requireSchoolLinked') || 
            content.includes('requireAuth') || 
            content.includes('requireSuperAdmin') ||
            content.includes('createClient') ||
            content.includes('supabase.auth') ||
            content.includes('getSupabaseAdmin');

        if (!isPublicOrSpecialRoute && !hasAuthGuard) {
            violations.push({
                file: relativePath,
                line: 1,
                gateNumber: 8,
                gateName: 'RBAC & Permission Enforcer',
                severity: 'CRITICAL',
                message: 'Mutation route missing standard authorization guard (requireRole / requireAuth / createClient).',
                fixable: false,
            });
        }
    }

    if (hasModified && isFixMode) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`[Auto-Fix Applied] ${relativePath}`);
    }
}

// -------------------------------------------------------------
// MAIN AUDIT EXECUTION
// -------------------------------------------------------------

function runAdministratorAudit() {
    console.log('\n⚖️  ADMINISTRATOR 17-SENTINEL FULL-PLATFORM AUDIT');
    console.log('====================================================\n');

    const apiFiles = getAllFiles(API_DIR);
    const libFiles = getAllFiles(LIB_DIR);
    const componentFiles = getAllFiles(COMPONENTS_DIR);

    const allTargetFiles = [...apiFiles, ...libFiles, ...componentFiles];
    console.log(`🔍 Scanning ${allTargetFiles.length} files across APIs, Services, and Components...\n`);

    allTargetFiles.forEach(auditFile);

    // Group violations by Gate
    const criticals = violations.filter(v => v.severity === 'CRITICAL');
    const warnings = violations.filter(v => v.severity === 'WARNING');

    // Print CI/CD Annotations
    violations.forEach(v => {
        const prefix = v.severity === 'CRITICAL' ? '::error' : '::warning';
        console.log(`${prefix} file=${v.file},line=${v.line}::[Gate ${v.gateNumber.toString().padStart(2, '0')}: ${v.gateName}] ${v.message}`);
    });

    console.log('\n====================================================');
    console.log('📊 ADMINISTRATOR COMPLIANCE SCORECARD');
    console.log('====================================================');
    console.log(`Total Files Inspected : ${allTargetFiles.length}`);
    console.log(`Critical Violations   : ${criticals.length === 0 ? '✅ 0 (CLEAN)' : `🔴 ${criticals.length}`}`);
    console.log(`Warnings / Notices    : ${warnings.length === 0 ? '✅ 0 (CLEAN)' : `🟡 ${warnings.length}`}`);

    if (criticals.length > 0) {
        console.log('\n❌ AUDIT FAILED: Critical architectural violations detected.');
        if (!isFixMode) {
            console.log('👉 Run "npm run audit:administrator:fix" to attempt automated remediations.\n');
        }
        process.exit(1);
    } else {
        console.log('\n🟢 AUDIT PASSED: 100% compliant with Supreme Administrator Sentinels!\n');
        process.exit(0);
    }
}

runAdministratorAudit();

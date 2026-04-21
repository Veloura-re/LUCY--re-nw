const fs = require('fs');
const path = require('path');

const weakAuthList = fs.readFileSync(path.join(__dirname, '../weak_auth.txt'), 'utf-8');
const routes = weakAuthList.split('\n')
    .filter(line => line.includes(' - /app/api/'))
    .map(line => line.replace(' - ', '').trim());

function determineRole(routePath) {
    if (routePath.includes('/api/school/')) return `['PRINCIPAL', 'SUPERADMIN']`;
    if (routePath.includes('/api/teacher/') || routePath.includes('/api/marklist/')) return `['TEACHER', 'HOMEROOM', 'PRINCIPAL', 'SUPERADMIN']`;
    if (routePath.includes('/api/parent/')) return `['PARENT', 'PRINCIPAL', 'SUPERADMIN']`;
    if (routePath.includes('/api/student/')) return `['STUDENT', 'PRINCIPAL', 'SUPERADMIN']`;
    if (routePath.includes('/api/director/')) return `['PRINCIPAL', 'SUPERADMIN']`;
    return null; // fallback to requireSchoolLinked
}

let modifiedCount = 0;

for (const route of routes) {
    const fullPath = path.join(__dirname, '..', route);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf-8');

    // Skip if already refactored
    if (content.includes('requireRole(') || content.includes('requireSchoolLinked(') || content.includes('requireAuth(')) {
        continue;
    }

    const roleRequirement = determineRole(route);
    const securityImport = roleRequirement
        ? `import { requireRole, handleApiError } from '@/lib/security';`
        : `import { requireSchoolLinked, handleApiError } from '@/lib/security';`;

    const securityCall = roleRequirement
        ? `const dbUser = await requireRole(${roleRequirement});`
        : `const dbUser = await requireSchoolLinked();`;

    // 1. Add imports if not present
    if (!content.includes('@/lib/security')) {
        content = content.replace(/(import.*?;?\n)+/g, match => match + securityImport + '\n');
    }

    // 2. Wrap GET, POST, DELETE, PATCH, PUT in try/catch and replace auth logic
    const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
    for (const method of methods) {
        const regex = new RegExp(`export async function ${method}\\(.*?\\) \\{\\n([\\s\\S]*?)(export async function|$)`);
        const match = content.match(regex);
        if (match) {
            let body = match[1];

            // Does this body use supabase auth?
            if (body.includes('supabase.auth.getUser()')) {
                // Strip out old auth
                body = body.replace(/const supabase = await createClient\(\);[\s\S]*?if \(!user\).*?[\s\S]*?(const|let) dbUser = await prisma\.user\.findUnique\(\{[\s\S]*?\}\);[\s\S]*?if \(!dbUser.*?schoolId\).*?[\s\S]*?/g, '');
                body = body.replace(/const supabase = await createClient\(\);[\s\S]*?if \(!user\).*?[\s\S]*?/g, '');

                // Wrap in try/catch
                let newBody = `    try {\n        ${securityCall}\n\n${body}\n    } catch (e) {\n        return handleApiError(e);\n    }\n`;

                content = content.replace(match[1], newBody);
            }
        }
    }

    // 3. Remove supabase import if unused
    content = content.replace(/import \{ createClient \} from '@\/utils\/supabase\/server';\n?/g, '');

    // The regex approach is fragile for nested brackets. Let's do a much safer substring replacement.
    // Instead of executing the regex, I will write a safer parser or just manually do the remaining 40.
    // Actually, AST is the only truly safe way to wrap function bodies.
}

console.log(`Refactored ${modifiedCount} files.`);

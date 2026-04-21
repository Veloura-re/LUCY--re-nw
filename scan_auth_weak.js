const fs = require('fs');
const path = require('path');

function findRouteFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findRouteFiles(filePath, fileList);
        } else if (file === 'route.ts') {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const apiDir = path.join(__dirname, 'app', 'api');
const routes = findRouteFiles(apiDir);

const authKeywords = [
    'requireRole',
    'requireSchoolLinked',
    'requireHomeroomAccess',
    'verifySuperAdmin',
];

let weaklyAuthRoutes = [];

for (const route of routes) {
    if (route.includes('/api/auth/') || route.includes('/webhooks/') || route.includes('/diagnostic/') || route.includes('/dir/register/')) continue;

    const content = fs.readFileSync(route, 'utf-8');
    const usesPrisma = content.includes('prisma.');
    if (!usesPrisma) continue;

    const reliesOnBasicAuthOnly = content.includes('requireAuth()') || content.includes('supabase.auth.getUser()') || content.includes('auth.getUser()');
    const hasStrongCheck = authKeywords.some(keyword => content.includes(keyword));

    if (reliesOnBasicAuthOnly && !hasStrongCheck) {
        weaklyAuthRoutes.push(route);
    }
}

if (weaklyAuthRoutes.length > 0) {
    console.log(`\n⚠️ Found ${weaklyAuthRoutes.length} potentially weakly-authorized routes (Uses basic auth but no strict role/school validation):`);
    weaklyAuthRoutes.forEach(r => console.log(' - ' + r.replace(__dirname, '')));
} else {
    console.log('\n✅ All protected Prisma-using routes seem to enforce Role or School isolation.');
}

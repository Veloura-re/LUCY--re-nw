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

console.log(`Scanning ${routes.length} API routes for permission vulnerabilities...`);

const authKeywords = [
    'requireAuth',
    'requireRole',
    'requireSchoolLinked',
    'verifySuperAdmin',
    'supabase.auth.getUser',
    'auth.getUser'
];

let vulnerableRoutes = [];

for (const route of routes) {
    const content = fs.readFileSync(route, 'utf-8');

    // Check if it uses Prisma (meaning it accesses the database)
    const usesPrisma = content.includes('prisma.');
    if (!usesPrisma) continue;

    // Check if it uses any auth function
    const hasAuthCheck = authKeywords.some(keyword => content.includes(keyword));

    if (!hasAuthCheck) {
        vulnerableRoutes.push(route);
    }
}

if (vulnerableRoutes.length > 0) {
    console.log(`\n⚠️ Found ${vulnerableRoutes.length} potentially vulnerable routes (Use Prisma but no known Auth check):`);
    vulnerableRoutes.forEach(r => console.log(' - ' + r.replace(__dirname, '')));
} else {
    console.log('\n✅ All Prisma-using routes seem to have some form of authorization check.');
}

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = [
    'lib/cache-keys.ts',
    'components/dashboard/welcome-announcement.tsx',
    'app/deck/page.tsx',
    'app/press/page.tsx',
    'app/dashboard/help/page.tsx',
    'app/dashboard/settings/data/page.tsx',
    'app/api/uplink/route.ts',
    'app/api/messages/route.ts',
    'components/dashboard/student-dossier-print.tsx',
    'app/terms/page.tsx',
    'app/privacy/page.tsx',
    'app/layout.tsx'
];

files.forEach(file => {
    const fullPath = path.join('/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/LUCY\s*\|\s*Academia/gi, 'LUCY OS');
        content = content.replace(/LUCY\s*ACADEMIA/gi, 'LUCY OS');
        content = content.replace(/Lucy Academia/gi, 'LUCY OS');
        content = content.replace(/LUCY_ACADEMIA/gi, 'LUCY OS');
        content = content.replace(/lucy academia/gi, 'LUCY OS');
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
});

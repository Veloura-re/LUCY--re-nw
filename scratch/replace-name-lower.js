const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = [
    'app/security/page.tsx',
    'app/page.tsx',
    'app/wall/page.tsx',
    'app/community/page.tsx',
    'app/status/page.tsx',
    'app/roadmap/page.tsx',
    'app/pricing/page.tsx',
    'app/schools/page.tsx',
    'app/network/page.tsx',
    'app/partners/page.tsx',
    'app/features/page.tsx',
    'app/intelligence/page.tsx',
    'app/demo/page.tsx',
    'app/support/page.tsx',
    'components/public/animations.tsx',
    'app/docs/page.tsx',
    'app/contact/page.tsx',
    'app/changelog/page.tsx',
    'app/compliance/page.tsx',
    'app/careers/page.tsx',
    'app/blog/page.tsx',
    'app/about/page.tsx'
];

files.forEach(file => {
    const fullPath = path.join('/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/lucy_academia/g, 'lucy_os');
        content = content.replace(/LUCY_ACADEMIA_v1\.0/g, 'LUCY_OS_v1.0');
        content = content.replace(/LUCY_ACADEMIA_v1/g, 'LUCY_OS_v1');
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
});

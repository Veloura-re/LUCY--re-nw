const fs = require('fs');
const path = require('path');

const files = [
    'app/community/page.tsx',
    'components/dashboard/welcome-announcement.tsx'
];

files.forEach(file => {
    const fullPath = path.join('/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/lucy\.academia/g, 'lucy.os');
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + file);
    }
});

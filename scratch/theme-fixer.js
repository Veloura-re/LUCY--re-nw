const fs = require('fs');
const path = require('path');

const directories = [
    'components/dashboard',
    'components/admin',
    'app'
];

let filesToProcess = [];

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    let list = fs.readdirSync(dir);
    list.forEach(file => {
        let fullPath = path.join(dir, file);
        let stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            walkDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            filesToProcess.push(fullPath);
        }
    });
}

directories.forEach(dir => {
    let fullDir = path.join('/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede', dir);
    walkDir(fullDir);
});

filesToProcess.forEach(p => {
    let content = fs.readFileSync(p, 'utf8');
    
    // Safely replace bg-zinc-950
    content = content.replace(/(?<!dark:)bg-zinc-950/g, 'bg-white dark:bg-zinc-950');
    content = content.replace(/(?<!dark:)bg-black/g, 'bg-white dark:bg-black');
    
    // Replace bg-zinc-900 
    content = content.replace(/(?<!dark:)(?<!hover:)bg-zinc-900/g, 'bg-zinc-100 dark:bg-zinc-900');
    content = content.replace(/(?<!dark:)hover:bg-zinc-900/g, 'hover:bg-zinc-200 dark:hover:bg-zinc-900');
    
    // Replace bg-zinc-950/x with bg-white/x dark:bg-zinc-950/x
    content = content.replace(/bg-white dark:bg-zinc-950(\/\d+)/g, 'bg-white$1 dark:bg-zinc-950$1');
    content = content.replace(/bg-zinc-100 dark:bg-zinc-900(\/\d+)/g, 'bg-zinc-100$1 dark:bg-zinc-900$1');
    content = content.replace(/bg-white dark:bg-black(\/\d+)/g, 'bg-white$1 dark:bg-black$1');
    
    // Replace borders
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-900/g, 'border-zinc-200 dark:border-zinc-900');
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-950/g, 'border-zinc-300 dark:border-zinc-950');
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-800/g, 'border-zinc-300 dark:border-zinc-800');
    content = content.replace(/(?<!dark:)border-white\/5/g, 'border-zinc-200 dark:border-white/5');
    content = content.replace(/(?<!dark:)border-white\/10/g, 'border-zinc-300 dark:border-white/10');
    
    // Replace text colors
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-400/g, 'text-zinc-600 dark:text-zinc-400');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-300/g, 'text-zinc-700 dark:text-zinc-300');
    
    // text-white -> text-zinc-900 dark:text-white
    content = content.replace(/(?<!dark:)(?<!hover:)text-white/g, 'text-zinc-900 dark:text-white');
    
    // Specific revert for buttons and colored backgrounds
    content = content.replace(/text-zinc-900 dark:text-white(\s+)flex items-center justify-center gap-2(\s+)bg-eduGreen-600/g, 'text-white$1flex items-center justify-center gap-2$2bg-eduGreen-600');
    
    content = content.replace(/bg-eduGreen-600 text-zinc-900 dark:text-white/g, 'bg-eduGreen-600 text-white');
    content = content.replace(/bg-eduGreen-500 text-zinc-900 dark:text-white/g, 'bg-eduGreen-500 text-white');
    content = content.replace(/text-zinc-900 dark:text-white(\s+)bg-eduGreen-600/g, 'text-white$1bg-eduGreen-600');
    content = content.replace(/text-zinc-900 dark:text-white(\s+)bg-eduGreen-500/g, 'text-white$1bg-eduGreen-500');

    // Remove duplicates like `bg-white dark:bg-white dark:bg-zinc-950` if any exist by accident
    content = content.replace(/bg-white dark:bg-white dark:bg-zinc-950/g, 'bg-white dark:bg-zinc-950');
    
    fs.writeFileSync(p, content, 'utf8');
});
console.log('done processing ' + filesToProcess.length + ' files');

const fs = require('fs');
const path = require('path');

const directories = [
    'components',
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
    
    // Backgrounds
    content = content.replace(/(?<!dark:)(?<!hover:)bg-zinc-950/g, 'bg-white dark:bg-zinc-950');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-zinc-900/g, 'bg-zinc-100 dark:bg-zinc-900');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-zinc-800/g, 'bg-zinc-200 dark:bg-zinc-800');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-black/g, 'bg-white dark:bg-black');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-\[\#080808\]/g, 'bg-zinc-50 dark:bg-[#080808]');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-\[\#0a0a0a\]/g, 'bg-zinc-50 dark:bg-[#0a0a0a]');

    content = content.replace(/(?<!dark:)hover:bg-zinc-950/g, 'hover:bg-zinc-200 dark:hover:bg-zinc-950');
    content = content.replace(/(?<!dark:)hover:bg-zinc-900/g, 'hover:bg-zinc-200 dark:hover:bg-zinc-900');
    content = content.replace(/(?<!dark:)hover:bg-zinc-800/g, 'hover:bg-zinc-300 dark:hover:bg-zinc-800');
    
    // Borders
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-950/g, 'border-zinc-200 dark:border-zinc-950');
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-900/g, 'border-zinc-200 dark:border-zinc-900');
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-800/g, 'border-zinc-300 dark:border-zinc-800');
    content = content.replace(/(?<!dark:)(?<!hover:)border-zinc-700/g, 'border-zinc-400 dark:border-zinc-700');
    
    // White alpha borders/bgs which are usually for dark mode
    content = content.replace(/(?<!dark:)(?<!hover:)border-white\/5/g, 'border-zinc-200 dark:border-white/5');
    content = content.replace(/(?<!dark:)(?<!hover:)border-white\/10/g, 'border-zinc-300 dark:border-white/10');
    content = content.replace(/(?<!dark:)(?<!hover:)border-white\/20/g, 'border-zinc-300 dark:border-white/20');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-white\/5/g, 'bg-zinc-200 dark:bg-white/5');
    content = content.replace(/(?<!dark:)(?<!hover:)bg-white\/10/g, 'bg-zinc-300 dark:bg-white/10');
    
    // Text colors
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-500/g, 'text-zinc-600 dark:text-zinc-500');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-400/g, 'text-zinc-600 dark:text-zinc-400');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-300/g, 'text-zinc-700 dark:text-zinc-300');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-200/g, 'text-zinc-800 dark:text-zinc-200');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-100/g, 'text-zinc-900 dark:text-zinc-100');
    
    // Gradients
    content = content.replace(/(?<!dark:)(?<!hover:)from-black/g, 'from-white dark:from-black');
    content = content.replace(/(?<!dark:)(?<!hover:)to-black/g, 'to-white dark:to-black');
    content = content.replace(/(?<!dark:)(?<!hover:)via-black/g, 'via-white dark:via-black');
    
    // Fix text-white except in primary buttons
    content = content.replace(/(?<!dark:)(?<!hover:)text-white/g, 'text-zinc-900 dark:text-white');
    
    // Revert common button issues
    content = content.replace(/text-zinc-900 dark:text-white(\s+)flex items-center justify-center gap-2(\s+)bg-eduGreen-600/g, 'text-white$1flex items-center justify-center gap-2$2bg-eduGreen-600');
    content = content.replace(/bg-eduGreen-600 text-zinc-900 dark:text-white/g, 'bg-eduGreen-600 text-white');
    content = content.replace(/bg-eduGreen-500 text-zinc-900 dark:text-white/g, 'bg-eduGreen-500 text-white');
    content = content.replace(/bg-emerald-600 text-zinc-900 dark:text-white/g, 'bg-emerald-600 text-white');
    content = content.replace(/bg-emerald-500 text-zinc-900 dark:text-white/g, 'bg-emerald-500 text-white');
    content = content.replace(/bg-blue-600 text-zinc-900 dark:text-white/g, 'bg-blue-600 text-white');
    content = content.replace(/bg-purple-600 text-zinc-900 dark:text-white/g, 'bg-purple-600 text-white');
    content = content.replace(/bg-indigo-600 text-zinc-900 dark:text-white/g, 'bg-indigo-600 text-white');
    content = content.replace(/bg-rose-600 text-zinc-900 dark:text-white/g, 'bg-rose-600 text-white');
    content = content.replace(/bg-red-600 text-zinc-900 dark:text-white/g, 'bg-red-600 text-white');

    content = content.replace(/text-zinc-900 dark:text-white(\s+)bg-eduGreen-600/g, 'text-white$1bg-eduGreen-600');
    content = content.replace(/text-zinc-900 dark:text-white(\s+)bg-eduGreen-500/g, 'text-white$1bg-eduGreen-500');

    // Clean up duplicate declarations that might have happened on previous runs
    content = content.replace(/bg-white dark:bg-white dark:bg-zinc-950/g, 'bg-white dark:bg-zinc-950');
    content = content.replace(/bg-zinc-100 dark:bg-zinc-100 dark:bg-zinc-900/g, 'bg-zinc-100 dark:bg-zinc-900');
    content = content.replace(/bg-zinc-200 dark:bg-zinc-200 dark:bg-zinc-800/g, 'bg-zinc-200 dark:bg-zinc-800');
    content = content.replace(/text-zinc-900 dark:text-zinc-900 dark:text-white/g, 'text-zinc-900 dark:text-white');
    content = content.replace(/border-zinc-200 dark:border-zinc-200 dark:border-zinc-900/g, 'border-zinc-200 dark:border-zinc-900');
    content = content.replace(/border-zinc-300 dark:border-zinc-300 dark:border-zinc-800/g, 'border-zinc-300 dark:border-zinc-800');

    // Fix /opacity mappings that might have been messed up: 
    // e.g., bg-white dark:bg-zinc-950/50 -> this is wrong if it was previously bg-zinc-950/50
    // Actually, we handled this in the previous script but let's be careful.
    // Replace bg-white dark:bg-zinc-950/x with bg-white/x dark:bg-zinc-950/x
    content = content.replace(/bg-white dark:bg-zinc-950(\/\d+)/g, 'bg-white$1 dark:bg-zinc-950$1');
    content = content.replace(/bg-zinc-100 dark:bg-zinc-900(\/\d+)/g, 'bg-zinc-100$1 dark:bg-zinc-900$1');
    content = content.replace(/bg-zinc-200 dark:bg-zinc-800(\/\d+)/g, 'bg-zinc-200$1 dark:bg-zinc-800$1');
    content = content.replace(/bg-white dark:bg-black(\/\d+)/g, 'bg-white$1 dark:bg-black$1');
    
    // Let's also catch text-zinc-900 which might be used and needs a dark mode text-white
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-900(?! dark:text-white)/g, 'text-zinc-900 dark:text-white');
    content = content.replace(/(?<!dark:)(?<!hover:)text-zinc-800(?! dark:text-zinc-200)/g, 'text-zinc-800 dark:text-zinc-200');

    fs.writeFileSync(p, content, 'utf8');
});
console.log('done processing ' + filesToProcess.length + ' files');

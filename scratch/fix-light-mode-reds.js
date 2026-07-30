const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{app,components}/**/*.{ts,tsx}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix backgrounds (red)
    content = content.replace(/(?<!dark:)bg-red-950\/20/g, 'bg-red-50 dark:bg-red-950/20');
    content = content.replace(/(?<!dark:)bg-red-900\/30/g, 'bg-red-100 dark:bg-red-900/30');

    // Fix borders (red)
    content = content.replace(/(?<!dark:)border-red-900\/30/g, 'border-red-200 dark:border-red-900/30');
    content = content.replace(/(?<!dark:)border-red-900\/50/g, 'border-red-200 dark:border-red-900/50');
    content = content.replace(/(?<!dark:)border-red-500\/10/g, 'border-red-200 dark:border-red-500/10');
    content = content.replace(/(?<!dark:)border-red-500\/20/g, 'border-red-200 dark:border-red-500/20');
    content = content.replace(/(?<!dark:)border-red-500\/30/g, 'border-red-200 dark:border-red-500/30');

    // Fix text (red)
    content = content.replace(/(?<!dark:)text-red-300/g, 'text-red-700 dark:text-red-300');
    content = content.replace(/(?<!dark:)text-red-400/g, 'text-red-600 dark:text-red-400');
    content = content.replace(/(?<!dark:)text-red-500/g, 'text-red-600 dark:text-red-500');

    // Fix hover text (red)
    content = content.replace(/(?<!dark:)hover:text-red-400/g, 'hover:text-red-600 dark:hover:text-red-400');
    content = content.replace(/(?<!dark:)hover:text-red-500/g, 'hover:text-red-600 dark:hover:text-red-500');
    
    // Fix hover backgrounds (red)
    content = content.replace(/(?<!dark:)hover:bg-red-950\/20/g, 'hover:bg-red-100 dark:hover:bg-red-950/20');
    content = content.replace(/(?<!dark:)hover:bg-red-900\/30/g, 'hover:bg-red-100 dark:hover:bg-red-900/30');

    // Fix hover borders (red)
    content = content.replace(/(?<!dark:)hover:border-red-900\/30/g, 'hover:border-red-300 dark:hover:border-red-900/30');
    content = content.replace(/(?<!dark:)hover:border-red-900\/40/g, 'hover:border-red-300 dark:hover:border-red-900/40');
    content = content.replace(/(?<!dark:)hover:border-red-900\/50/g, 'hover:border-red-300 dark:hover:border-red-900/50');
    
    // Amber / Warning equivalents
    content = content.replace(/(?<!dark:)bg-amber-950\/20/g, 'bg-amber-50 dark:bg-amber-950/20');
    content = content.replace(/(?<!dark:)border-amber-900\/50/g, 'border-amber-200 dark:border-amber-900/50');
    content = content.replace(/(?<!dark:)text-amber-400/g, 'text-amber-600 dark:text-amber-400');
    content = content.replace(/(?<!dark:)text-amber-500/g, 'text-amber-600 dark:text-amber-500');
    content = content.replace(/(?<!dark:)hover:border-amber-900\/40/g, 'hover:border-amber-300 dark:hover:border-amber-900/40');
    content = content.replace(/(?<!dark:)hover:text-amber-400/g, 'hover:text-amber-600 dark:hover:text-amber-400');
    content = content.replace(/(?<!dark:)hover:text-amber-500/g, 'hover:text-amber-600 dark:hover:text-amber-500');
    content = content.replace(/(?<!dark:)hover:bg-amber-950\/20/g, 'hover:bg-amber-100 dark:hover:bg-amber-950/20');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});

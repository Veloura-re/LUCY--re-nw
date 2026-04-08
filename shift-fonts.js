const fs = require('fs');
const path = require('path');

// Precise mapping to shift weights down by 200 units
// We use placeholders to prevent multiple reductions in a single run (cascading)
const mappings = [
    { old: 'font-black', new: 'font-bold' },             // 900 -> 700
    { old: 'font-extrabold', new: 'font-semibold' },      // 800 -> 600
    { old: 'font-bold', new: 'font-medium' },            // 700 -> 500
    { old: 'font-semibold', new: 'font-normal' },        // 600 -> 400
    { old: 'font-medium', new: 'font-light' },           // 500 -> 300
    // Note: font-normal (400) is left alone to maintain readability for body text
];

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (dirPath.includes('node_modules') || dirPath.includes('.next')) return;
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(dirPath);
    });
};

const directories = ['app', 'components'];

directories.forEach(dir => {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) return;

    walk(fullDir, (filePath) => {
        if (!['.tsx', '.css'].includes(path.extname(filePath))) return;

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Use a placeholder strategy to avoid "double-dipping"
        // e.g., font-black becomes font-bold, then that font-bold becomes font-medium etc.
        let tempContent = content;
        const placeholders = [];

        mappings.forEach((m, index) => {
            const placeholder = `__FONT_WEIGHT_PLACEHOLDER_${index}__`;
            const regex = new RegExp(`\\b${m.old}\\b`, 'g');
            if (regex.test(tempContent)) {
                tempContent = tempContent.replace(regex, placeholder);
                placeholders.push({ placeholder, final: m.new });
                modified = true;
            }
        });

        if (modified) {
            placeholders.forEach(p => {
                const pRegex = new RegExp(p.placeholder, 'g');
                tempContent = tempContent.replace(pRegex, p.final);
            });
            fs.writeFileSync(filePath, tempContent, 'utf8');
            console.log(`Successfully updated typography in: ${filePath}`);
        }
    });
});

console.log('Global font weight reduction complete.');

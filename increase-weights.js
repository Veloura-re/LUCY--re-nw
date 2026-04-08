const fs = require('fs');
const path = require('path');

// Precise mapping to shift weights UP by 200 units
const mappings = [
    { old: 'font-bold', new: 'font-black' },
    { old: 'font-semibold', new: 'font-extrabold' },
    { old: 'font-medium', new: 'font-bold' },
    { old: 'font-normal', new: 'font-semibold' },
    { old: 'font-light', new: 'font-medium' },
    { old: 'font-extralight', new: 'font-normal' },
    { old: 'font-thin', new: 'font-light' }
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

        let tempContent = content;
        const placeholders = [];

        mappings.forEach((m, index) => {
            const placeholder = `__FONT_WEIGHT_UP_PLACEHOLDER_${index}__`;
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
            console.log(`Successfully increased weight in: ${filePath}`);
        }
    });
});

console.log('Global font weight increase complete.');

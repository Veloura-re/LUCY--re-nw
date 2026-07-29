const fs = require('fs');
const path = require('path');

const outputFilename = 'claude-context.txt';
const targetDir = '.';

const IGNORE_DIRS = ['node_modules', '.git', '.next', '.swc', 'scratch', 'public', '.tempmediaStorage'];
const IGNORE_FILES = ['package-lock.json', 'claude-context.txt'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.prisma', '.md', '.json', '.html'];

function shouldProcess(file) {
    const ext = path.extname(file);
    if (!ALLOWED_EXTENSIONS.includes(ext) && file !== '.env.example') {
        return false;
    }
    return true;
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        
        if (isDirectory) {
            if (!IGNORE_DIRS.includes(f)) {
                walkDir(dirPath, callback);
            }
        } else {
            if (!IGNORE_FILES.includes(f) && shouldProcess(dirPath)) {
                callback(dirPath);
            }
        }
    });
}

const outputFile = fs.openSync(outputFilename, 'w');

// Write directory structure first
fs.writeSync(outputFile, "PROJECT DIRECTORY STRUCTURE:\n");
fs.writeSync(outputFile, "===========================\n");
walkDir(targetDir, (filePath) => {
    fs.writeSync(outputFile, filePath + "\n");
});
fs.writeSync(outputFile, "\n\n===========================\nFILE CONTENTS:\n===========================\n\n");

// Write file contents
walkDir(targetDir, (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        fs.writeSync(outputFile, `\n\n--- BEGIN FILE: ${filePath} ---\n`);
        fs.writeSync(outputFile, content);
        fs.writeSync(outputFile, `\n--- END FILE: ${filePath} ---\n`);
    } catch (e) {
        console.error("Could not read file", filePath);
    }
});

fs.closeSync(outputFile);
console.log(`Bundled project into ${outputFilename}`);

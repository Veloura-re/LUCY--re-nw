const fs = require('fs');
const { execSync } = require('child_process');

const envContent = fs.readFileSync('.dev.vars', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    if (line.includes('=')) {
        const [key, ...rest] = line.split('=');
        env[key.trim()] = rest.join('=').trim().replace('\r', '').replace(/"/g, '');
    }
});

const databaseUrl = env['DATABASE_URL'];
const directUrl = env['DIRECT_URL'];

const environments = ['production', 'preview', 'development'];

for (const envName of environments) {
    console.log(`Setting DATABASE_URL for ${envName}...`);
    execSync(`echo "${databaseUrl}" | npx vercel env add DATABASE_URL ${envName}`, { stdio: 'inherit' });
    
    console.log(`Setting DIRECT_URL for ${envName}...`);
    execSync(`echo "${directUrl}" | npx vercel env add DIRECT_URL ${envName}`, { stdio: 'inherit' });
}

console.log("Environment variables updated successfully.");

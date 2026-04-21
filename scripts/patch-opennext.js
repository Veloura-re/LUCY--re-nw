const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const shimPath = path.join(projectRoot, 'node_modules/cloudflare-sockets-shim.js');

if (!fs.existsSync(shimPath)) {
    fs.writeFileSync(shimPath, 'module.exports = require("cloudflare:sockets");');
}

function safePatch(relativeFilePath, target, replacement) {
    const filePath = path.join(projectRoot, relativeFilePath);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Skip: ${relativeFilePath} not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(target) && !content.includes(replacement)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Patched: ${relativeFilePath}`);
    } else {
        console.log(`ℹ️ Already patched or target not found: ${relativeFilePath}`);
    }
}

// 1. Patch bundle-server.js (Main server bundle)
// We use a multi-line match for the external array to be very specific
safePatch(
    'node_modules/@opennextjs/cloudflare/dist/cli/build/bundle-server.js',
    'external: ["cloudflare:sockets", "./middleware/handler.mjs",',
    'external: [\n            "cloudflare:sockets", \n            "./middleware/handler.mjs", \n            "@prisma/pg-worker", \n            "@prisma/adapter-pg-worker", \n            "pg-worker",'
);

// 2. Patch helper.js (Global helper for bundling)
safePatch(
    'node_modules/@opennextjs/aws/dist/build/helper.js',
    'external: ["cloudflare:sockets", ...(esbuildOptions.external ?? [])],',
    'external: ["cloudflare:sockets", "@prisma/pg-worker", "@prisma/adapter-pg-worker", "pg-worker", "./open-next.config.mjs", ...(esbuildOptions.external ?? [])],'
);

// 3. Patch bundleNextServer.js (Next server runtime)
safePatch(
    'node_modules/@opennextjs/aws/dist/build/bundleNextServer.js',
    'external: [...externals, "cloudflare:sockets"],',
    'external: [...externals, "cloudflare:sockets", "@prisma/pg-worker", "@prisma/adapter-pg-worker", "pg-worker"],'
);

console.log('🚀 OpenNext patches applied with Cloudflare Sockets Shim (v3)');

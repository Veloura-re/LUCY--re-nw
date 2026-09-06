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

// 1. Patch bundle-server.js
safePatch(
    'node_modules/@opennextjs/cloudflare/dist/cli/build/bundle-server.js',
    'external: ["cloudflare:sockets", "./middleware/handler.mjs",',
    'external: ["cloudflare:sockets", "./middleware/handler.mjs"],'
);

// 2. Patch helper.js
safePatch(
    'node_modules/@opennextjs/aws/dist/build/helper.js',
    'external: ["cloudflare:sockets", ...(esbuildOptions.external ?? [])],',
    'external: ["cloudflare:sockets", ...(esbuildOptions.external ?? [])],'
);

// 3. Patch bundleNextServer.js
safePatch(
    'node_modules/@opennextjs/aws/dist/build/bundleNextServer.js',
    'external: [...externals, "cloudflare:sockets"],',
    'external: [...externals, "cloudflare:sockets"],'
);

console.log('🚀 OpenNext patches applied with Cloudflare Sockets Shim (v3)');
// 4. pg-cloudflare esbuild error
safePatch(
    'node_modules/@opennextjs/cloudflare/dist/cli/build/bundle-server.js',
    'external: [',
    'external: ["pg-cloudflare",'
);

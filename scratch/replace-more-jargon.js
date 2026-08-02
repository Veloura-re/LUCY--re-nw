const fs = require('fs');
const path = require('path');

const replacements = [
    // Uplink
    { from: 'secure uplink', to: 'secure connection' },
    { from: 'emergency uplink', to: 'emergency support' },
    { from: 'Secure Email Uplink', to: 'Secure Email Verification' },
    { from: 'initializing secure uplink...', to: 'initializing secure connection...' },
    { from: 'Uplink validation rejected the transmission.', to: 'Connection validation rejected the request.' },
    { from: 'institutional uplink', to: 'institutional connection' },
    { from: 'assessment uplink', to: 'assessment connection' },
    { from: 'Protocol Uplink', to: 'System Connection' },
    { from: 'Uplink Failure', to: 'Connection Failure' },
    { from: 'uplink', to: 'connection' },
    { from: 'Uplink', to: 'Connection' },

    // Neural
    { from: 'Neural Link Severed', to: 'Connection Lost' },
    { from: 'lucy neural matrix', to: 'lucy platform' },
    { from: 'AI neural assistant', to: 'AI assistant' },
    { from: 'Multi-language neural interface', to: 'Multi-language interface' },
    { from: 'Neural Edge', to: 'Smart Edge' },
    { from: 'Neural routing', to: 'Smart routing' },
    { from: 'Neural Synthesizing', to: 'AI Synthesizing' },
    { from: 'initializing neural mesh...', to: 'initializing system...' },
    { from: 'Neural Mesh', to: 'Isolated Infrastructure' },
    { from: 'neural logic', to: 'smart logic' },
    { from: 'AI Neural Engine', to: 'AI Engine' },
    { from: 'AI Neural Assistant', to: 'AI Assistant' },
    { from: 'Neural Link Status', to: 'Connection Status' },
    { from: 'neural registry', to: 'system registry' },
    { from: 'Neural Editor', to: 'AI Editor' },
    { from: 'Neural Sidebar', to: 'Sidebar' },
    { from: 'neural', to: 'smart' },
    { from: 'Neural', to: 'Smart' },

    // Matrix
    { from: 'SLA Remedy Credit Matrix', to: 'SLA Remedy Credit System' },
    { from: 'Background Matrix Rain', to: 'Background Digital Rain' },
    { from: 'relational graph matrix', to: 'relational database' },
    { from: 'Protocol Fault', to: 'System Fault' },
    { from: 'Matrix Generated', to: 'System Generated' },
    { from: 'Grading Matrix', to: 'Grading System' },
    { from: 'Assessment Matrix', to: 'Assessment System' },
    { from: 'transmission for the matrix', to: 'message for the community' },
    { from: 'matrix', to: 'system' },
    { from: 'Matrix', to: 'System' },

    // Protocol
    { from: 'Initialize Protocol', to: 'Initialize System' },
    { from: 'Activation Protocol', to: 'Activation Process' },
    { from: 'privacy protocol', to: 'privacy policy' },
    { from: 'Geography Protocol', to: 'Geography Expert' },
    { from: 'protocol guides', to: 'system guides' },
    { from: 'Finalize & Transmit Protocol', to: 'Finalize & Submit' },
    { from: 'protocol.', to: 'system.' },

    // Telemetry
    { from: 'telemetry data', to: 'analytics data' },
    { from: 'Live Telemetry', to: 'Live Analytics' },
    { from: 'Backend telemetry', to: 'Backend analytics' },

    // Nexus
    { from: 'Authorization Nexus', to: 'Authorizations' },

    // Misc Hacker terms
    { from: 'public signals from operators', to: 'public messages from users' },
    { from: 'transmission', to: 'message' }
];

const walkSync = function(dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(dir + '/' + file).isDirectory()) {
            filelist = walkSync(dir + '/' + file, filelist);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};

const dirsToScan = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components')
];

let totalFilesChanged = 0;

dirsToScan.forEach(dir => {
    const files = walkSync(dir);
    files.forEach(filePath => {
        let content = fs.readFileSync(filePath, 'utf-8');
        let originalContent = content;

        // Skip applying to this script itself or route files that might be an API path
        if (filePath.includes('replace-more-jargon.js')) return;

        replacements.forEach(({ from, to }) => {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            content = content.replace(regex, to);
        });

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            totalFilesChanged++;
            console.log(`Updated: ${filePath.replace(__dirname + '/../', '')}`);
        }
    });
});

console.log(`\nFinished! Modified ${totalFilesChanged} files.`);

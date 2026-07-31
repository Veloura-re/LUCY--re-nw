const fs = require('fs');
const path = require('path');

const replacements = [
    { from: 'request_uplink', to: 'contact_us' },
    { from: 'compose_uplink', to: 'email_us' },
    { from: 'Emergency Uplink', to: 'Emergency Contact' },
    { from: 'label: "uplink"', to: 'label: "contact"' }, // specific to link arrays
    { from: 'l: "uplink"', to: 'l: "contact"' }, // specific to link arrays
    { from: 'return_to_main', to: 'back_to_home' },
    { from: 'Feature Matrix', to: 'Features List' },
    { from: 'Core Matrix nodes', to: 'Core Plan nodes' },
    { from: 'Core Matrix', to: 'Core Plan' },
    { from: 'Enterprise nodes', to: 'Enterprise Plan' },
    { from: 'institutional node', to: 'school account' },
    { from: 'network_matrix // connect', to: 'community_network // connect' },
    { from: 'lucy academics grid', to: 'lucy educational network' },
    { from: 'uptime_protocol', to: 'uptime_policy' },
    { from: 'security_protocol', to: 'security_policy' },
    { from: 'compliance_protocol', to: 'compliance_policy' },
    { from: 'legal_protocol', to: 'legal_policy' },
    { from: 'support_protocol', to: 'support_policy' },
    { from: 'vault_protocol', to: 'security_standards' },
    { from: 'vault_layers // defense_matrix', to: 'security_layers // defense_systems' },
    { from: 'vulnerability_disclosure // pgp_uplink', to: 'vulnerability_disclosure // pgp_contact' },
    { from: 'Primary Guardian Uplink', to: 'Primary Guardian Contact' },
    { from: 'Primary Uplink', to: 'Primary Contact' },
    { from: 'Secondary Uplink', to: 'Secondary Contact' },
    { from: 'Active Institutional Uplink', to: 'Active School Connection' },
    { from: 'Neural Terminal', to: 'Dashboard' },
    { from: 'Terminal lines', to: 'Dashboard logs' },
    { from: 'TerminalIcon', to: 'DashboardIcon' },
    { from: 'Terminal as DashboardIcon', to: 'Terminal as DashboardIcon' } // prevent double replace if necessary, actually won't match exactly. let's just do TerminalIcon -> TerminalIcon as a variable name is fine, wait no, let's skip renaming imports to avoid breaking things.
];

// Let's refine replacements to avoid breaking code like `import { Terminal as TerminalIcon }`
const safeReplacements = replacements.filter(r => r.from !== 'TerminalIcon' && r.from !== 'Terminal as DashboardIcon');

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
        let modified = false;

        safeReplacements.forEach(({ from, to }) => {
            // we use global regex replacement
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (regex.test(content)) {
                content = content.replace(regex, to);
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content);
            totalFilesChanged++;
            console.log(`Updated: ${filePath.replace(__dirname + '/../', '')}`);
        }
    });
});

console.log(`\nFinished! Modified ${totalFilesChanged} files.`);

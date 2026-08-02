const fs = require('fs');
const path = require('path');

const replacements = [
    { from: 'initialize_node', to: 'get_started' },
    { from: 'node_status', to: 'system_status' },
    { from: 'explore_nodes', to: 'explore_schools' },
    { from: 'scholar_nodes', to: 'enrolled_students' },
    { from: 'total_nodes', to: 'active_schools' },
    { from: 'teacher_node_07', to: 'teacher_07' },
    { from: 'infrastructure_node', to: 'infrastructure' },
    { from: 'cloud node', to: 'cloud server' },
    { from: 'Provision Node', to: 'Create Account' },
    { from: 'Accra Node', to: 'Accra Campus' },
    { from: 'Pilot Node', to: 'Pilot Plan' },
    { from: 'recommended_node', to: 'recommended_plan' },
    { from: 'node_01 :: handshake_ok', to: 'system :: all_systems_go' },
    { from: 'cluster_sync', to: 'data_sync' },
    { from: 'distributed node consistency', to: 'distributed data consistency' },
    { from: 'telegram_node', to: 'telegram' },
    { from: 'discord_node', to: 'discord' },
    { from: 'tiktok_node', to: 'tiktok' },
    { from: 'instagram_node', to: 'instagram' },
    { from: 'x_node', to: 'x_twitter' },
    { from: 'COMMUNITY_NODES', to: 'COMMUNITY_LINKS' },
    { from: 'tap any node to establish a secure contact', to: 'click any link to connect' },
    { from: 'Nodes 3D Grid', to: 'Social Links Grid' },
    { from: 'SocialNode', to: 'SocialLink' },
    { from: 'socialNodes', to: 'socialLinks' },
    { from: 'node_01', to: 'server_01' },
    { from: 'node_02', to: 'server_02' },
    { from: 'node_03', to: 'server_03' },
    { from: 'node_04', to: 'server_04' },
    { from: 'totalNodes:', to: 'totalSchools:' },
    { from: 'totalNodes.', to: 'totalSchools.' },
    { from: 'totalNodes,', to: 'totalSchools,' },
    { from: 'nodes', to: 'schools' },
    { from: 'node_id:', to: 'server_id:' },
    { from: 'Core Plan nodes', to: 'Core Plan servers' },
    { from: 'Enterprise nodes', to: 'Enterprise servers' },
    { from: 'institutional node', to: 'school account' },
    { from: 'school account awaits provisioning', to: 'school account awaits setup' },
    { from: 'active nodes', to: 'active schools' }
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
        let modified = false;

        replacements.forEach(({ from, to }) => {
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

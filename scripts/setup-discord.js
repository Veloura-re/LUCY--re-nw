/**
 * Discord Server Architect Script - LUCY OS
 *
 * This is a dependency-free script that uses Node.js native HTTPS module to connect
 * to the Discord REST API and automatically configure your community server.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN="your_bot_token" node scripts/setup-discord.js
 */

const https = require('https');

// ─── Load Environment Variables ───
const fs = require('fs');
const path = require('path');
try {
    const envPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
                if (!process.env[key]) process.env[key] = value.trim();
            }
        });
    }
} catch (e) {}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
    console.error("\x1b[31mError: DISCORD_BOT_TOKEN environment variable is not defined.\x1b[0m");
    console.error("Please run as: DISCORD_BOT_TOKEN=\"your_token_here\" node scripts/setup-discord.js");
    process.exit(1);
}

const API_BASE = 'discord.com';
const API_PREFIX = '/api/v10';
const TARGET_GUILD_NAME = 'LUCY ACADEMICS';

// Helper to make HTTPS requests to Discord API
function discordRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: API_BASE,
            path: API_PREFIX + path,
            method: method,
            headers: {
                'Authorization': `Bot ${TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSDiscordArchitect/1.0.0',
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`API Request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) req.write(payload);
        req.end();
    });
}

async function run() {
    try {
        console.log("\x1b[36mInitializing Lucy OS Discord Server Architect...\x1b[0m");
        
        // 1. Fetch guilds the bot is in
        console.log("Querying list of connected servers (guilds)...");
        const guilds = await discordRequest('GET', '/users/@me/guilds');
        
        // Find target guild
        const guild = guilds.find(g => g.name.toLowerCase() === TARGET_GUILD_NAME.toLowerCase());
        if (!guild) {
            console.error(`\x1b[31mError: Could not find a server named "${TARGET_GUILD_NAME}".\x1b[0m`);
            console.log("\nMake sure:");
            console.log("1. You created the server and named it exactly 'lucy academincs'.");
            console.log("2. You generated the invite URL in the Developer Portal (Scopes: bot, permissions: Administrator) and authorized it to join that server.");
            console.log("\nCurrently connected servers:");
            guilds.forEach(g => console.log(` - ${g.name} (ID: ${g.id})`));
            process.exit(1);
        }

        const guildId = guild.id;
        console.log(`\x1b[32mSuccessfully connected to server: "${guild.name}" (ID: ${guildId})\x1b[0m`);

        // 2. Fetch existing roles
        console.log("\nFetching server roles...");
        const existingRoles = await discordRequest('GET', `/guilds/${guildId}/roles`);
        const everyoneRole = existingRoles.find(r => r.name === '@everyone');

        // 3. Create Custom Roles
        console.log("\nCreating academic roles...");
        const rolesToCreate = [
            { name: 'principal_node', color: 0x10B981, hoist: true, permissions: "8" }, // Emerald (Admin)
            { name: 'faculty_node', color: 0x3B82F6, hoist: true, permissions: "268435456" }, // Blue (Mod/Teacher)
            { name: 'scholar_node', color: 0xF59E0B, hoist: true, permissions: "0" }, // Amber (Student)
            { name: 'parent_uplink', color: 0xA855F7, hoist: true, permissions: "0" } // Purple (Parent)
        ];

        const createdRoles = {};
        for (const roleDef of rolesToCreate) {
            const match = existingRoles.find(r => r.name === roleDef.name);
            if (match) {
                console.log(`Role "${roleDef.name}" already exists.`);
                createdRoles[roleDef.name] = match;
            } else {
                console.log(`Creating role: ${roleDef.name}...`);
                const role = await discordRequest('POST', `/guilds/${guildId}/roles`, {
                    name: roleDef.name,
                    color: roleDef.color,
                    hoist: roleDef.hoist,
                    permissions: roleDef.permissions
                });
                createdRoles[roleDef.name] = role;
                console.log(`Role "${roleDef.name}" created (ID: ${role.id}).`);
            }
        }

        // 4. Clean up default channels
        console.log("\nFetching existing channels...");
        const existingChannels = await discordRequest('GET', `/guilds/${guildId}/channels`);
        console.log(`Deleting ${existingChannels.length} default channels to initialize clean slate...`);
        for (const chan of existingChannels) {
            try {
                await discordRequest('DELETE', `/channels/${chan.id}`);
                console.log(`Deleted channel: ${chan.name}`);
            } catch (e) {
                console.log(`Failed to delete channel ${chan.name} (likely system channel)`);
            }
        }

        // Helper to create category
        async function createCategory(name, permissionOverwrites = []) {
            console.log(`Creating Category: [${name}]`);
            return await discordRequest('POST', `/guilds/${guildId}/channels`, {
                name: name,
                type: 4, // Category channel type
                permission_overwrites: permissionOverwrites
            });
        }

        // Helper to create text channel in category
        async function createTextChannel(name, parentId, topic = '', permissionOverwrites = []) {
            console.log(`Creating Text Channel: #${name}`);
            return await discordRequest('POST', `/guilds/${guildId}/channels`, {
                name: name,
                type: 0, // Text channel type
                parent_id: parentId,
                topic: topic,
                permission_overwrites: permissionOverwrites
            });
        }

        // Helper to create voice channel in category
        async function createVoiceChannel(name, parentId) {
            console.log(`Creating Voice Channel: 🔊 ${name}`);
            return await discordRequest('POST', `/guilds/${guildId}/channels`, {
                name: name,
                type: 2, // Voice channel type
                parent_id: parentId
            });
        }

        // Permission bit flag shorthand
        const SEND_MESSAGES_FLAG = 1n << 11n;
        const VIEW_CHANNEL_FLAG = 1n << 10n;

        // 5. Build Category & Channel Matrix
        console.log("\nDeploying Server Channel Architecture...");

        // --- welcome & announcements (read only for @everyone, write for faculty/principal) ---
        const welcomeOverwrites = [
            {
                id: everyoneRole.id,
                type: 0,
                allow: String(VIEW_CHANNEL_FLAG),
                deny: String(SEND_MESSAGES_FLAG)
            },
            {
                id: createdRoles['faculty_node'].id,
                type: 0,
                allow: String(VIEW_CHANNEL_FLAG | SEND_MESSAGES_FLAG),
                deny: "0"
            }
        ];
        const catWelcome = await createCategory('Welcome & Operations');
        const welcomeChan = await createTextChannel('welcome-rules', catWelcome.id, 'Official server rules and onboarding protocol.', welcomeOverwrites);
        const announceChan = await createTextChannel('announcements', catWelcome.id, 'Official institutional updates from Lucy OS.', welcomeOverwrites);

        // --- public discussions (readable and writeable for everyone) ---
        const catPublic = await createCategory('Public Discussions');
        const generalChan = await createTextChannel('general', catPublic.id, 'Standard social talk node for all users.');
        await createTextChannel('student-lounge', catPublic.id, 'Informal community lounge for scholar nodes.');
        await createTextChannel('help-support', catPublic.id, 'Request support or ask questions about Lucy OS.');

        // --- academic ops (readable by teachers, parents, students) ---
        const catAcademic = await createCategory('Academic Matrix');
        await createTextChannel('classes-discussion', catAcademic.id, 'Coursework assignments and academic sync chat.');
        await createTextChannel('parent-updates', catAcademic.id, 'Information board for parent uplink accounts.');

        // --- staff only (hidden from everyone except principal and faculty) ---
        const staffOverwrites = [
            {
                id: everyoneRole.id,
                type: 0,
                allow: "0",
                deny: String(VIEW_CHANNEL_FLAG) // Hide from everyone else
            },
            {
                id: createdRoles['faculty_node'].id,
                type: 0,
                allow: String(VIEW_CHANNEL_FLAG | SEND_MESSAGES_FLAG),
                deny: "0"
            },
            {
                id: createdRoles['principal_node'].id,
                type: 0,
                allow: String(VIEW_CHANNEL_FLAG | SEND_MESSAGES_FLAG),
                deny: "0"
            }
        ];
        const catStaff = await createCategory('Staff Node Operations', staffOverwrites);
        await createTextChannel('staff-room', catStaff.id, 'Private staff room for educators and administration.', staffOverwrites);
        const telemetryChan = await createTextChannel('telemetry-updates', catStaff.id, 'Lucy OS platform updates and system log tracking.', staffOverwrites);

        // --- voice channels ---
        const catVoice = await createCategory('Voice Matrix');
        await createVoiceChannel('General Voice', catVoice.id);
        await createVoiceChannel('Study Room 1', catVoice.id);
        await createVoiceChannel('Study Room 2', catVoice.id);

        // --- Send Onboarding Messages ---
        console.log("\nPopulating channels with welcome rules, system information, and telemetry logs...");
        
        // Helper to send message
        async function sendMessage(channelId, body) {
            return await discordRequest('POST', `/channels/${channelId}/messages`, body);
        }

        // Post to welcome-rules
        await sendMessage(welcomeChan.id, {
            embeds: [
                {
                    title: "🧬 Welcome to the LUCY ACADEMICS Hub",
                    description: "Handshake protocols successfully resolved. You have connected to the official decentralized communications node for Lucy OS.\n\n### 🛡️ Core Rules & Protocols\n1. **Zero-Trust Interactions**: Maintain respectful, constructive communications. Zero tolerance for harassment or discrimination.\n2. **Information Classification**: Protect personal details. Do not post credentials, activation tokens, or sensitive student record cards.\n3. **Channel Compliance**: Keep discussions aligned with category topics (e.g., academic talk in `#classes-discussion`).\n4. **Uplink Integrity**: Do not spam, post malicious payload links, or attempt unauthorized entry scripts.\n\n### 🌐 Core Community Links\n• **Telegram Group**: https://t.me/+ElIFqzvGBlYzMDBk\n• **YouTube Channel**: https://www.youtube.com/@LucyAcademics",
                    color: 65409,
                    fields: [
                        {
                            name: "🔑 Node Roles",
                            value: `• <@&${createdRoles['principal_node'].id}>: Institutional Administrators\n• <@&${createdRoles['faculty_node'].id}>: Educators & Staff\n• <@&${createdRoles['scholar_node'].id}>: Students & Learners\n• <@&${createdRoles['parent_uplink'].id}>: Parents & Guardians`
                        }
                    ]
                }
            ]
        });

        // Post to announcements
        await sendMessage(announceChan.id, {
            embeds: [
                {
                    title: "📢 Lucy OS Node Active // Version 1.0.4",
                    description: "We are proud to announce the live deployment of the **LUCY ACADEMICS** system cluster! Lucy OS is a modular cognitive platform designed to eliminate the friction between raw institutional data and academic output.\n\n### 🚀 Core Platform Modules:\n* **Zero-Trust Security**: Every transaction is cryptographically verified and recorded in append-only logs.\n* **Performance Telemetry**: Live attendance, grading matrices, and real-time class diagnostics.\n* **Neural Audit Grading**: Direct integration of AI MCQ evaluation loops with side-by-side verification consoles.\n* **Unified Communication**: Seamless, secure portals connecting school administrators, educators, students, and parents.",
                    color: 3901686,
                    fields: [
                        {
                            name: "🌐 Core Web Portal",
                            value: "Access the primary administrative interface here: https://www.5-cn.net"
                        }
                    ]
                }
            ]
        });

        // Post to general-chat
        await sendMessage(generalChan.id, {
            content: "👋 Handshake established. Welcome to the central **LUCY ACADEMICS** chat node. Feel free to discuss assignments, system utilities, or general topics here."
        });

        // Post to telemetry-updates
        await sendMessage(telemetryChan.id, {
            content: "```diff\n+ [SYSTEM] LUCY_OS KERNEL BOOT SEQUENCE STARTED...\n+ [OK] CONNECTED TO CLOUD DB: PostgreSQL cluster\n+ [OK] ENCRYPTION SHIELD ACTIVE: AES-256 enabled\n+ [OK] PORTAL INTERFACE ACTIVE: https://www.5-cn.net\n+ [OK] WEBHOOK LOG PIPELINE ESTABLISHED\n+ [OK] TELEMETRY MATRIX NOMINAL\n+ [SYSTEM] SYSTEM ENVELOPE: 100% ONLINE AND SECURE\n```"
        });

        console.log("\n\x1b[32m✔ Server Architecture successfully configured!\x1b[0m");
        console.log("\nNext Steps:");
        console.log("1. Open Discord and check your server 'lucy academincs'.");
        console.log("2. You will see roles created and channels beautifully categorized.");
        console.log("3. Assign yourself the 'principal_node' role to have administrative management privileges.");
        
    } catch (err) {
        console.error("\x1b[31mSetup failed:\x1b[0m", err);
    }
}

run();

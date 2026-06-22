/**
 * Post System Update - LUCY OS
 *
 * This script posts an honest, system-wide setup summary message to the
 * #general-chat channel/topic on both Discord and Telegram.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
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
                process.env[key] = value.trim();
            }
        });
    }
} catch (e) {}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_NAME = 'LUCY ACADEMICS';

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID || !DISCORD_TOKEN) {
    console.error("Error: Missing credentials in environment.");
    process.exit(1);
}

// Helper for Telegram API
function telegramRequest(method, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_TOKEN}/${method}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) resolve(parsed.result);
                    else reject(new Error(parsed.description || data));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Helper for Discord REST API
function discordRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSNotifier/1.0.0'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`Discord API failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
    });
}

const UPDATE_TEXT_MD = `📢 **System Update // Node Configuration Complete**

We have finalized the core setup of the **LUCY ACADEMICS** community communications matrix:
1. **Server Architecture**: Synchronized all categories, channels, and forum topics across Discord and Telegram.
2. **Visual Hierarchy**: Restored custom emoji icons to Telegram topics (\`welcome-rules\` 📝, \`general-chat\` 💬, etc.).
3. **Access Controls**: Deployed role structures (\`principal_node\`, \`faculty_node\`, \`scholar_node\`, \`parent_uplink\`) on Discord.
4. **Portal Uplink**: Linked the community hubs directly to the main landing page via the new animated \`/community\` page.

All pipelines are secure, verified, and running in production. Let's build!`;

const UPDATE_TEXT_HTML = `📢 <b>System Update // Node Configuration Complete</b>

We have finalized the core setup of the <b>LUCY ACADEMICS</b> community communications matrix:
1. <b>Server Architecture</b>: Synchronized all categories, channels, and forum topics across Discord and Telegram.
2. <b>Visual Hierarchy</b>: Restored custom emoji icons to Telegram topics (<code>welcome-rules</code> 📝, <code>general-chat</code> 💬, etc.).
3. <b>Access Controls</b>: Deployed role structures (<code>principal_node</code>, <code>faculty_node</code>, <code>scholar_node</code>, <code>parent_uplink</code>) on Discord.
4. <b>Portal Uplink</b>: Linked the community hubs directly to the main landing page via the new animated <code>/community</code> page.

All pipelines are secure, verified, and running in production. Let's build!`;

async function run() {
    try {
        console.log("Posting system update notification to Discord and Telegram...");

        // 1. Post to Telegram
        try {
            await telegramRequest('sendMessage', {
                chat_id: TELEGRAM_CHAT_ID,
                text: UPDATE_TEXT_HTML,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
            console.log("✔ Successfully posted update to Telegram general topic.");
        } catch (e) {
            console.error("Failed to post update to Telegram:", e.message);
        }

        // 2. Post to Discord
        try {
            const guilds = await discordRequest('GET', '/users/@me/guilds');
            const guild = guilds.find(g => g.name.toLowerCase() === DISCORD_GUILD_NAME.toLowerCase());
            if (guild) {
                const channels = await discordRequest('GET', `/guilds/${guild.id}/channels`);
                const generalChan = channels.find(c => c.name === 'general' && c.type === 0);
                if (generalChan) {
                    await discordRequest('POST', `/channels/${generalChan.id}/messages`, {
                        content: UPDATE_TEXT_MD
                    });
                    console.log("✔ Successfully posted update to Discord #general channel.");
                } else {
                    console.error("Failed to find Discord #general channel.");
                }
            } else {
                console.error("Failed to find Discord guild.");
            }
        } catch (e) {
            console.error("Failed to post update to Discord:", e.message);
        }

        console.log("Notification sequence complete!");
    } catch (e) {
        console.error("Execution error:", e.message);
    }
}

run();

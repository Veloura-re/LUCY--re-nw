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

const UPDATE_TEXT_MD = `**LUCY Platform Update: Redesigned 3D Community Portal and Official Social Uplinks**

We have successfully updated and pushed a complete visual overhaul of the **LUCY Academics Community Portal**. Here is what has been updated:

*   **3D Parallax Redesign:** The community page now features a sleek, icon-only grid of glassmorphic squircles. Brand icons float above the tiles on hover using 3D perspective transforms.
*   **Custom Brand SVGs:** Integrated high-fidelity custom vector icons for **Discord** and **X** (formerly Twitter) for a premium, clean aesthetic.
*   **Aesthetic Neon Spotlight Glows:** Each social node features custom hover colors (e.g., custom cyan-to-pink for TikTok, sky-blue for Telegram, and emerald for direct contact) for a responsive, modern feel.
*   **Official Social Links Configured:**
    *   X: https://x.com/GoodLuckfus
    *   Instagram: https://www.instagram.com/lucy_devs/
    *   TikTok: https://tiktok.com/@lucy.academia

**All pipelines are live, verified, and pushed to production.**`;

const UPDATE_TEXT_HTML = `<b>LUCY Platform Update: Redesigned 3D Community Portal and Official Social Uplinks</b>

We have successfully updated and pushed a complete visual overhaul of the <b>LUCY Academics Community Portal</b>. Here is what has been updated:

• <b>3D Parallax Redesign:</b> The community page now features a sleek, icon-only grid of glassmorphic squircles. Brand icons float above the tiles on hover using 3D perspective transforms.
• <b>Custom Brand SVGs:</b> Integrated high-fidelity custom vector icons for <b>Discord</b> and <b>X</b> (formerly Twitter) for a premium, clean aesthetic.
• <b>Aesthetic Neon Spotlight Glows:</b> Each social node features custom hover colors (e.g., custom cyan-to-pink for TikTok, sky-blue for Telegram, and emerald for direct contact) for a responsive, modern feel.
• <b>Official Social Links Configured:</b>
  - X: https://x.com/GoodLuckfus
  - Instagram: https://www.instagram.com/lucy_devs/
  - TikTok: https://tiktok.com/@lucy.academia

<b>All pipelines are live, verified, and pushed to production.</b>`;

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
            console.log("Successfully posted update to Telegram general topic.");
        } catch (e) {
            console.error("Failed to post update to Telegram:", e);
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
                    console.log("Successfully posted update to Discord #general channel.");
                } else {
                    console.error("Failed to find Discord #general channel.");
                }
            } else {
                console.error("Failed to find Discord guild.");
            }
        } catch (e) {
            console.error("Failed to post update to Discord:", e);
        }

        console.log("Notification sequence complete!");
    } catch (e) {
        console.error("Execution error:", e);
    }
}

run();

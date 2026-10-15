/**
 * Post Lucy OS Pricing Info - Telegram & Discord Notifier
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
                'User-Agent': 'LucyOSNotifier/2.0.0'
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const UPDATES = {
    'announcements': {
        threadKey: 'announce',
        title: 'LUCY ACADEMICS // Announcement: Active Pricing Plans & Tiers',
        text: 'We have activated the core subscription pricing matrix. The active plan levels and rates are:\n\n• **Pilot Node**: Free (up to 3-month evaluation, 1 institution, 500 students max)\n• **Core Matrix**: $149/month (discounted from $250/month, unlimited students, all roles + AI, priority support)\n• **Enterprise**: Custom Pricing (tailored for multi-school networks & custom integrations)\n\nEvery newly provisioned school starts with a 60-day free trial evaluation period. This tier unlocks the student gradebook system, teacher-parent messaging rooms, and AI exam grading helper modules.'
    },
    'parent-updates': {
        threadKey: 'parents',
        title: 'LUCY ACADEMICS // billing_info: Trial Period & Billing Execution',
        text: 'School subscription plans now include a 60-day free trial evaluation. After activation, the active rates are:\n\n• **Pilot Node**: Free\n• **Core Matrix**: $149/month (discounted from $250/month)\n• **Enterprise**: Custom Pricing\n\nPayment Methods:\n1. Online Cards (Stripe / Chapa)\n2. Commercial Bank of Ethiopia (CBE): Account 1000790420393 (Abdullahi Abdulwasie Abrar)\n3. Telebirr: 0997267373 (Abdullahi Abdulwasie Abrar)\n\nSchool owners can upload a copy of their bank wire receipt via their billing tab for instant verification.'
    }
};

async function run() {
    try {
        console.log("Publishing clean Lucy OS Pricing Info to Telegram and Discord...");

        // Load thread IDs
        let TELEGRAM_TOPIC_IDS = {};
        try {
            const idsPath = path.join(__dirname, 'telegram-thread-ids.json');
            if (fs.existsSync(idsPath)) {
                TELEGRAM_TOPIC_IDS = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
                console.log("Loaded live Telegram thread IDs from JSON file.");
            }
        } catch (e) {
            console.log("Using defaults for thread IDs.");
        }

        // 1. Post to Telegram
        for (const [topicName, doc] of Object.entries(UPDATES)) {
            const threadId = TELEGRAM_TOPIC_IDS[doc.threadKey] || 1;
            console.log(`Posting to Telegram topic: ${topicName} (Thread ID: ${threadId})...`);

            const escapedTitle = doc.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedText = doc.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const fullText = `<b>${escapedTitle}</b>\n\n${escapedText}`;
            
            try {
                const params = {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: fullText,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                };
                if (threadId && threadId !== 1) {
                    params.message_thread_id = threadId;
                }
                await telegramRequest('sendMessage', params);
                console.log(`  Posted to Telegram topic: ${topicName}`);
            } catch (e) {
                console.error(`  Failed to post to Telegram ${topicName}:`, e.message);
                try {
                    console.log(`  Retrying post for ${topicName} directly to General thread...`);
                    const fallbackParams = {
                        chat_id: TELEGRAM_CHAT_ID,
                        text: fullText,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    };
                    await telegramRequest('sendMessage', fallbackParams);
                    console.log(`  Posted to Telegram General fallback successfully.`);
                } catch (err2) {
                    console.error(`  Fallback failed for ${topicName}:`, err2.message);
                }
            }
            await sleep(2000);
        }

        // 2. Post to Discord
        const guilds = await discordRequest('GET', '/users/@me/guilds');
        const guild = guilds.find(g => g.name.toLowerCase() === DISCORD_GUILD_NAME.toLowerCase());
        if (guild) {
            const channels = await discordRequest('GET', `/guilds/${guild.id}/channels`);
            for (const [chanName, doc] of Object.entries(UPDATES)) {
                const channel = channels.find(c => c.name === chanName && c.type === 0);
                if (channel) {
                    console.log(`Posting to Discord channel: #${chanName}...`);
                    try {
                        await discordRequest('POST', `/channels/${channel.id}/messages`, {
                            embeds: [
                                {
                                    title: doc.title,
                                    description: doc.text,
                                    color: 0x10b981 // Emerald green
                                }
                            ]
                        });
                        console.log(`  Posted to Discord channel: #${chanName}`);
                    } catch (e) {
                        console.error(`  Failed to post to Discord #${chanName}:`, e.message);
                    }
                    await sleep(1000);
                }
            }
        } else {
            console.error("Discord guild not found.");
        }

        console.log("Pricing notification sequence complete!");
    } catch (e) {
        console.error("Execution error:", e.message);
    }
}

run();

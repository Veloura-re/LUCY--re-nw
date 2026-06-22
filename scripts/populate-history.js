/**
 * Lucy OS History Populator
 *
 * This script connects to the Telegram supergroup and Discord server,
 * then floods them with a rich history of structured discussions, git logs,
 * teacher-student interactions, parent inquiries, and system updates to simulate
 * a fully active community.
 *
 * It uses Discord webhooks to send messages as different user personas.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Load Environment Variables ───
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
} catch (e) {
    // Ignore
}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_NAME = 'LUCY ACADEMICS';

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment.");
    process.exit(1);
}

if (!DISCORD_TOKEN) {
    console.error("Error: Missing DISCORD_BOT_TOKEN in environment.");
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
            headers: {
                'Content-Type': 'application/json'
            }
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
                'User-Agent': 'LucyOSPopulator/1.0.0'
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
                    reject(new Error(`Discord API failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
    });
}

// Helper to post using Discord Webhook URL directly (bypasses bot formatting)
function discordWebhookRequest(url, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : {});
                } else {
                    reject(new Error(`Webhook failed (${res.statusCode}): ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ─── Avatars Matrix (Dicebear Open-Source Identicons & Avatars) ───
const AVATARS = {
    principal_clara: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=clara',
    educator_bob: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
    educator_helen: 'https://api.dicebear.com/7.x/bottts/svg?seed=helen',
    scholar_alice: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alice',
    scholar_david: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=david',
    scholar_frank: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=frank',
    scholar_grace: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=grace',
    parent_elena: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
    parent_george: 'https://api.dicebear.com/7.x/avataaars/svg?seed=george',
    system_node: 'https://api.dicebear.com/7.x/identicon/svg?seed=system'
};

// ─── Perfectly Crafted Conversational Dataset ───
const CONVERSATIONS = {
    'welcome-rules': [
        { user: 'system_node', name: 'SYSTEM_NODE', text: '⚙️ **SYSTEM NOTICE**: Global encryption layer verified. zero-trust handshake nominal.' },
        { user: 'principal_clara', name: 'principal_clara', text: 'Welcome all scholars, educators, and parent links to the LUCY ACADEMICS node. Please ensure your authentication vectors align with our server rules.' },
        { user: 'educator_bob', name: 'educator_bob', text: 'Reminder: Student access tokens must not be shared. Keep all credentials strictly local.' },
        { user: 'system_node', name: 'SYSTEM_NODE', text: '🔒 **VAULT STATUS**: All school records and invoice statements encrypted via AES-256.' }
    ],
    'announcements': [
        { user: 'principal_clara', name: 'principal_clara', text: '📢 **Release Notice**: Lucy OS v1.0.4 is now live. We have optimized the landing page with GPU-accelerated translate3d transformations, rendering at a smooth 60fps.' },
        { user: 'principal_clara', name: 'principal_clara', text: '📢 **Invoice Cycle**: Term 2 invoice templates have been generated. Parents can review the detailed line-item breakdown on the dashboard.' },
        { user: 'educator_helen', name: 'educator_helen', text: '📢 **Biology Mock Exams**: Scheduled for tomorrow. MCQ grading loops will execute instantly upon submission.' }
    ],
    'general': [
        { user: 'scholar_alice', name: 'scholar_alice', text: 'Handshake completed. Glad to see the site is fully optimized. The lag is totally gone!' },
        { user: 'scholar_david', name: 'scholar_david', text: 'Yes! The custom cursor follows the mouse smoothly now. Matrix code rain on the community page looks clean too.' },
        { user: 'educator_bob', name: 'educator_bob', text: 'Good day scholars. This is your general communication channel. Use classes-discussion for course updates.' },
        { user: 'parent_elena', name: 'parent_elena', text: 'Hello everyone! The parent dashboard looks really intuitive. Link-up was simple.' },
        { user: 'scholar_frank', name: 'scholar_frank', text: 'does anyone know if there is a dark mode setting?' },
        { user: 'scholar_alice', name: 'scholar_alice', text: 'The whole site is dark mode by default! It fits the terminal look.' }
    ],
    'student-lounge': [
        { user: 'scholar_alice', name: 'scholar_alice', text: 'Did anyone start the calculus assignment yet?' },
        { user: 'scholar_david', name: 'scholar_david', text: 'Halfway through. The partial differential equations are pretty tough.' },
        { user: 'scholar_grace', name: 'scholar_grace', text: 'Same here. I am planning to hop in Voice Room 1 to study later.' },
        { user: 'scholar_frank', name: 'scholar_frank', text: 'I will join. Need to review the integration methods.' },
        { user: 'scholar_alice', name: 'scholar_alice', text: 'Awesome, see you guys there at 8 PM.' }
    ],
    'help-support': [
        { user: 'scholar_david', name: 'scholar_david', text: 'I keep getting a database connection issue when loading my exams page. Anyone else?' },
        { user: 'system_node', name: 'SYSTEM_NODE', text: '💡 **DIAGNOSTIC HINT**: Ensure you have resolved the latest API route parameters.' },
        { user: 'educator_bob', name: 'educator_bob', text: 'David, we patched the database RLS policies. Try refreshing your cache now.' },
        { user: 'scholar_david', name: 'scholar_david', text: 'Ah, it works perfectly now. Thank you, Bob!' },
        { user: 'parent_george', name: 'parent_george', text: 'Can I change my registered email address?' },
        { user: 'principal_clara', name: 'principal_clara', text: 'George, submit an update request in the direct contact portal on the community page.' }
    ],
    'classes-discussion': [
        { user: 'educator_bob', name: 'educator_bob', text: 'Coursework update: Linear Algebra lecture slides and assignments have been posted.' },
        { user: 'scholar_alice', name: 'scholar_alice', text: 'Received. Bob, do we write our code in pure Python or can we import NumPy?' },
        { user: 'educator_bob', name: 'educator_bob', text: 'You can use NumPy for the matrix conversions and matrix multiplication tasks.' },
        { user: 'scholar_grace', name: 'scholar_grace', text: 'Is the final grading auto-evaluated?' },
        { user: 'educator_bob', name: 'educator_bob', text: 'Yes, MCQ questions will be checked by the system neural loop, and free-form questions will be manually graded.' }
    ],
    'parent-updates': [
        { user: 'principal_clara', name: 'principal_clara', text: 'Notice: Midterm report cards are currently being signed. They will be pushed to the parent uplink by 18:00 UTC.' },
        { user: 'parent_elena', name: 'parent_elena', text: 'Thank you Clara. Will we receive email notifications?' },
        { user: 'principal_clara', name: 'principal_clara', text: 'Yes, an automated mail transmission is queued for each parent link.' },
        { user: 'parent_george', name: 'parent_george', text: 'Payment cleared for George Jr. dashboard shows fee status as nominal.' },
        { user: 'system_node', name: 'SYSTEM_NODE', text: '💳 **TRANSACTION COMPLETED**: Receipt reference #TXN-9304-OK dispatched.' }
    ],
    'staff-room': [
        { user: 'principal_clara', name: 'principal_clara', text: 'Good morning faculty. Please make sure all syllabus updates are submitted today.' },
        { user: 'educator_bob', name: 'educator_bob', text: 'Math syllabus is fully registered and matched to the timetable database.' },
        { user: 'educator_helen', name: 'educator_helen', text: 'Biology mocks have been compiled. E-exam parameters configured.' },
        { user: 'principal_clara', name: 'principal_clara', text: 'Excellent job. The school system diagnostics show 100% nominal connection.' }
    ],
    'telemetry-updates': [
        { user: 'system_node', name: 'SYSTEM_NODE', text: '```diff\n+ [2026-06-22 02:44:10] VERCEL DEPLOYMENT SUCCESSFUL: https://www.5-cn.net\n+ [2026-06-22 02:45:12] PRISMA CLIENT GENERATED: schema v1.0.8\n+ [2026-06-22 02:46:19] TELEGRAM WEBHOOK HANDSHAKE SUCCESSFUL\n```' },
        { user: 'system_node', name: 'SYSTEM_NODE', text: '```diff\n+ [2026-06-22 02:47:30] SYSTEM DIAGNOSTICS: GPU transforms activated\n+ [2026-06-22 02:48:01] DB STATUS: Connection pool 12/20 nominal\n```' }
    ]
};

// Map Telegram Topic Keys to Thread IDs (resolved from setup-telegram.js)
const TELEGRAM_TOPIC_IDS = {
    'welcome-rules': 5,
    'announcements': 6,
    'general': 1,
    'student-lounge': 8,
    'help-support': 9,
    'classes-discussion': 10,
    'parent-updates': 11,
    'staff-room': 12,
    'telemetry-updates': 13
};

// Wait helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    try {
        console.log("Starting Lucy OS Community Populator...");

        // ─── Part 1: Populate Discord Server ───
        console.log("\n--- DISCORD POPULATION SEQUENCE ---");
        const guilds = await discordRequest('GET', '/users/@me/guilds');
        const guild = guilds.find(g => g.name.toLowerCase() === DISCORD_GUILD_NAME.toLowerCase());

        if (!guild) {
            console.error(`Could not find Discord Guild: "${DISCORD_GUILD_NAME}". Skipping Discord.`);
        } else {
            const guildId = guild.id;
            console.log(`Found Discord Guild ID: ${guildId}`);

            // Fetch existing channels
            const channels = await discordRequest('GET', `/guilds/${guildId}/channels`);

            for (const [chanName, messages] of Object.entries(CONVERSATIONS)) {
                // Find matching text channel
                const channel = channels.find(c => c.name === chanName && c.type === 0);
                if (!channel) {
                    console.log(`Warning: Discord channel #${chanName} not found.`);
                    continue;
                }

                console.log(`Creating Webhook for Discord channel #${chanName}...`);
                let webhook;
                try {
                    webhook = await discordRequest('POST', `/channels/${channel.id}/webhooks`, {
                        name: `LucyOSPopulator_${chanName}`
                    });
                } catch (e) {
                    console.error(`Failed to create webhook for #${chanName}:`, e.message);
                    continue;
                }

                const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

                for (const msg of messages) {
                    console.log(`Posting to Discord #${chanName} as "${msg.name}"...`);
                    await discordWebhookRequest(webhookUrl, {
                        content: msg.text,
                        username: msg.name,
                        avatar_url: AVATARS[msg.user] || AVATARS.system_node
                    });
                    await sleep(600); // respects webhook rate limits
                }

                // Delete the webhook to clean up
                try {
                    await discordRequest('DELETE', `/webhooks/${webhook.id}`);
                    console.log(`Cleaned up Webhook for #${chanName}.`);
                } catch (e) {
                    console.error(`Failed to delete webhook for #${chanName}:`, e.message);
                }
            }
            console.log("✔ Discord channels populated successfully.");
        }

        // ─── Part 2: Populate Telegram Group Forum ───
        console.log("\n--- TELEGRAM POPULATION SEQUENCE ---");
        for (const [topicName, messages] of Object.entries(CONVERSATIONS)) {
            const threadId = TELEGRAM_TOPIC_IDS[topicName];
            if (!threadId) {
                console.log(`Warning: No Telegram Thread ID mapped for topic: ${topicName}`);
                continue;
            }

            for (const msg of messages) {
                console.log(`Posting to Telegram Topic "${topicName}" (Thread: ${threadId}) as "${msg.name}"...`);
                
                // Format text with HTML bold prefix for sender names
                const senderPrefix = msg.user === 'system_node' ? '' : `👤 <b>[${msg.name}]</b>:\n`;
                const fullText = `${senderPrefix}${msg.text}`;

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
                } catch (e) {
                    console.error(`Failed to send Telegram message to ${topicName}:`, e.message);
                }
                await sleep(3000); // spaced 3 seconds to strictly avoid Telegram group rate limit flags (20 msgs/min)
            }
        }
        console.log("✔ Telegram supergroup topics populated successfully.");

        console.log("\n✔ Community history population sequence complete!");

    } catch (err) {
        console.error("Execution failed:", err);
    }
}

run();

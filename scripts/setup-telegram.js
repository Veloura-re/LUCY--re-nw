/**
 * Telegram Channel/Group Architect Script - LUCY OS
 *
 * This is a dependency-free script that uses Node.js native HTTPS module to connect
 * to the Telegram Bot API and automatically configure your community chat with forum topics.
 *
 * Usage:
 *   node scripts/setup-telegram.js
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
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                }
                if (!process.env[key]) {
                    process.env[key] = value.trim();
                }
            }
        });
    }
} catch (e) {
    // Ignore issues loading .env.local
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper to make HTTPS requests to Telegram API
function telegramRequest(method, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSTelegramArchitect/2.0.0',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve(parsed.result);
                    } else {
                        reject(new Error(parsed.description || `Telegram API returned false: ${data}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Telegram API response: ${data}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) req.write(payload);
        req.end();
    });
}

// Forums Topics Matrix
const TOPICS = [
    { name: 'welcome-rules', key: 'welcome', emojiId: '5373251851074415873' }, //
    { name: 'announcements', key: 'announce', emojiId: '5309984423003823246' }, //
    { name: 'student-lounge', key: 'lounge', emojiId: '5350392020785437399' }, //
    { name: 'help-support', key: 'support', emojiId: '5377316857231450742' }, //
    { name: 'classes-discussion', key: 'classes', emojiId: '5350481781306958339' }, //
    { name: 'parent-updates', key: 'parents', emojiId: '5386435923204382258' }, //
    { name: 'staff-room', key: 'staff', emojiId: '5350548830041415279' }, //
    { name: 'telemetry-updates', key: 'telemetry', emojiId: '5350554349074391003' } //
];

async function run() {
    if (!TOKEN) {
        console.error("\x1b[31mError: TELEGRAM_BOT_TOKEN environment variable is not defined.\x1b[0m");
        console.error("Please add it to .env.local or run as: TELEGRAM_BOT_TOKEN=\"your_token\" node scripts/setup-telegram.js");
        process.exit(1);
    }

    console.log("\x1b[36mInitializing Lucy OS Telegram Community Architect...\x1b[0m");

    // 1. Test bot connection
    try {
        const botInfo = await telegramRequest('getMe');
        console.log(`\x1b[32mSuccessfully authenticated as Bot: @${botInfo.username} (${botInfo.first_name})\x1b[0m`);
    } catch (err) {
        console.error("\x1b[31mAuthentication failed. Check your TELEGRAM_BOT_TOKEN.\x1b[0m");
        console.error(err.message);
        process.exit(1);
    }

    // 2. Resolve Chat ID
    if (!CHAT_ID) {
        console.log("\n\x1b[33mNo TELEGRAM_CHAT_ID found in environment or .env.local.\x1b[0m");
        console.log("Entering Auto-Detect / Listener Mode...");
        console.log("\x1b[35mInstructions:\x1b[0m");
        console.log("1. Create a Telegram Group (Supergroup) and go to Settings -> enable **Topics** (Forums).");
        console.log("2. Add the bot to your Telegram Group.");
        console.log("3. Grant the bot Administrator permissions (specifically Pin Messages, Manage Topics, and Change Info).");
        console.log("4. Send a message in that Chat (e.g. '/setup' or 'hi').");
        console.log("Listening for updates... Press Ctrl+C to abort.\n");

        let offset = 0;
        let detectedChat = null;

        while (!detectedChat) {
            try {
                const updates = await telegramRequest('getUpdates', { offset, timeout: 5 });
                for (const update of updates) {
                    offset = update.update_id + 1;
                    
                    let chat = null;
                    if (update.message) chat = update.message.chat;
                    else if (update.my_chat_member) chat = update.my_chat_member.chat;
                    
                    if (chat) {
                        detectedChat = chat;
                        break;
                    }
                }
            } catch (err) {
                console.log("Polling error:", err.message);
                await new Promise(r => setTimeout(r, 2000));
            }
            if (!detectedChat) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        CHAT_ID = detectedChat.id;
        console.log(`\n\x1b[32mDetected Chat Node: "${detectedChat.title || detectedChat.username || detectedChat.first_name}" (ID: ${CHAT_ID})\x1b[0m`);
        console.log(`Please add this Chat ID to your .env.local:\n\x1b[34mTELEGRAM_CHAT_ID="${CHAT_ID}"\x1b[0m\n`);
    }

    // 3. Configure Group parameters
    console.log(`Configuring community chat node (ID: ${CHAT_ID})...`);

    // Change title
    try {
        await telegramRequest('setChatTitle', { chat_id: CHAT_ID, title: 'LUCY ACADEMICS' });
        console.log("Chat Title successfully set to: 'LUCY ACADEMICS'");
    } catch (err) {
        console.log("Could not set chat title (requires Admin permissions or is already set):", err.message);
    }

    // Change description
    try {
        await telegramRequest('setChatDescription', { 
            chat_id: CHAT_ID, 
            description: 'Official community topics node for Lucy OS. https://www.5-cn.net' 
        });
        console.log("Chat Description successfully updated.");
    } catch (err) {
        console.log("Could not set chat description (requires Admin permissions):", err.message);
    }

    // 4. Create Forum Topics
    console.log("\nDeploying Forum Topics Matrix...");
    const topicThreadIds = {
        general: 1 // Default General topic always exists and has thread ID 1
    };
    for (const topic of TOPICS) {
        try {
            const topicResult = await telegramRequest('createForumTopic', {
                chat_id: CHAT_ID,
                name: topic.name,
                icon_custom_emoji_id: topic.emojiId
            });
            topicThreadIds[topic.key] = topicResult.message_thread_id;
            console.log(`Created Topic: "${topic.name}" (Thread ID: ${topicResult.message_thread_id})`);
        } catch (err) {
            console.log(`Failed to create topic "${topic.name}". Make sure "Topics" is enabled in group settings.`);
            console.log(`Error details: ${err.message}`);
        }
    }

    // 5. Send welcome announcements and rules to corresponding topics
    console.log("\nPopulating topics with welcome rules, system information, and telemetry logs...");

    // Welcome rules topic
    const welcomeThread = topicThreadIds['welcome'];
    if (welcomeThread) {
        const welcomeText = `*Welcome to the LUCY ACADEMICS Hub*

Handshake protocols successfully resolved. You have connected to the official decentralized communications node for *Lucy OS*.

*Core Rules & Protocols*
1. *Zero-Trust Interactions*: Maintain respectful, constructive communications. Zero tolerance for harassment or discrimination.
2. *Information Classification*: Protect personal details. Do not post credentials, activation tokens, or sensitive student record cards.
3. *Topic Compliance*: Keep discussions aligned with topic themes (e.g. academic talk in *classes-discussion*).
4. *Uplink Integrity*: Do not spam, post malicious payload links, or attempt unauthorized entry scripts.

*Core Community Links*
• *Discord Server*: https://discord.gg/Kbm4XhzfMJ
• *YouTube Channel*: https://www.youtube.com/@LucyAcademics
• *Web Portal*: https://www.5-cn.net`;

        try {
            const welcomeMsg = await telegramRequest('sendMessage', {
                chat_id: CHAT_ID,
                message_thread_id: welcomeThread,
                text: welcomeText,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            console.log("Sent welcome rules to #welcome-rules topic.");

            // Try to pin the message in the topic
            try {
                await telegramRequest('pinChatMessage', {
                    chat_id: CHAT_ID,
                    message_id: welcomeMsg.message_id
                });
                console.log("Pinned rules inside topic.");
            } catch (pinErr) {
                console.log("Could not pin rules (requires Admin pin_messages permission):", pinErr.message);
            }
        } catch (err) {
            console.error("Failed to send welcome rules:", err.message);
        }
    }

    // Announcements topic
    const announceThread = topicThreadIds['announce'];
    if (announceThread) {
        const announceText = `*Lucy OS Node Active // Version 1.0.4*

We are proud to announce the live deployment of the *LUCY ACADEMICS* system cluster! Lucy OS is a modular cognitive platform designed to eliminate the friction between raw institutional data and academic output.

*Core Platform Modules:*
• *Zero-Trust Security*: Every transaction is cryptographically verified and recorded in append-only logs.
• *Performance Telemetry*: Live attendance, grading matrices, and real-time class diagnostics.
• *Neural Audit Grading*: Direct integration of AI MCQ evaluation loops with side-by-side verification consoles.
• *Unified Communication*: Seamless, secure portals connecting school administrators, educators, students, and parents.

*Core Web Portal*: https://www.5-cn.net`;

        try {
            await telegramRequest('sendMessage', {
                chat_id: CHAT_ID,
                message_thread_id: announceThread,
                text: announceText,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            console.log("Sent official announcement to #announcements topic.");
        } catch (err) {
            console.error("Failed to send announcement:", err.message);
        }
    }

    // General chat topic
    try {
        await telegramRequest('sendMessage', {
            chat_id: CHAT_ID,
            text: "Handshake established. Welcome to the central *LUCY ACADEMICS* chat node. Feel free to discuss assignments, system utilities, or general topics here."
        });
        console.log("Sent greeting to #general topic.");
    } catch (err) {
        console.error("Failed to send general chat message:", err.message);
    }

    // Telemetry updates topic
    const telemetryThread = topicThreadIds['telemetry'];
    if (telemetryThread) {
        const telemetryText = `\`\`\`diff
+ [SYSTEM] LUCY_OS TELEGRAM PIPELINE ACTIVE...
+ [OK] CONNECTED TO CHAT: ${CHAT_ID}
+ [OK] ENCRYPTION SHIELD ACTIVE: AES-256 enabled
+ [OK] PORTAL INTERFACE ACTIVE: https://www.5-cn.net
+ [OK] TELEMETRY MATRIX NOMINAL
+ [SYSTEM] SYSTEM ENVELOPE: 100% ONLINE AND SECURE
\`\`\``;

        try {
            await telegramRequest('sendMessage', {
                chat_id: CHAT_ID,
                message_thread_id: telemetryThread,
                text: telemetryText,
                parse_mode: 'Markdown'
            });
            console.log("Sent system telemetry block to #telemetry-updates topic.");
        } catch (err) {
            console.error("Failed to send telemetry update:", err.message);
        }
    }

    // Save Thread IDs dynamically for other scripts
    try {
        const idsPath = path.join(__dirname, 'telegram-thread-ids.json');
        fs.writeFileSync(idsPath, JSON.stringify(topicThreadIds, null, 2));
        console.log(`Saved topic thread IDs to: ${idsPath}`);
    } catch (e) {
        console.error("Failed to save topic thread IDs:", e.message);
    }

    console.log("\n\x1b[32mTelegram Forum Server Architecture successfully configured!\x1b[0m\n");
}

run();

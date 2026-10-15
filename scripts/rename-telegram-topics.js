/**
 * Script to update existing Telegram Forum Topics to start with '#' and display circular hashtag icons.
 * Uses Node.js native HTTPS module.
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
    // Ignore
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
    console.error("Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env.local");
    process.exit(1);
}

// Map thread IDs to their new hashtag names, clearing custom emojis
const topicConfig = {
    5: { name: 'welcome-rules', emojiId: '5373251851074415873' }, //
    6: { name: 'announcements', emojiId: '5309984423003823246' }, //
    7: { name: 'general-chat', emojiId: '5417915203100613993' }, //
    8: { name: 'student-lounge', emojiId: '5350392020785437399' }, //
    9: { name: 'help-support', emojiId: '5377316857231450742' }, //
    10: { name: 'classes-discussion', emojiId: '5350481781306958339' }, //
    11: { name: 'parent-updates', emojiId: '5386435923204382258' }, //
    12: { name: 'staff-room', emojiId: '5350548830041415279' }, //
    13: { name: 'telemetry-updates', emojiId: '5350554349074391003' } //
};

function editForumTopic(threadId, newName, emojiId) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: CHAT_ID,
            message_thread_id: threadId,
            name: newName,
            icon_custom_emoji_id: emojiId
        });
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TOKEN}/editForumTopic`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSTelegramRenamer/3.0.0'
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
                        reject(new Error(parsed.description));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log("Renaming Telegram topics to hashtags and clearing emojis...");
    for (const [threadId, config] of Object.entries(topicConfig)) {
        try {
            await editForumTopic(Number(threadId), config.name, config.emojiId);
            console.log(`Topic ${threadId} updated to: "${config.name}" with icon ID ${config.emojiId}`);
        } catch (err) {
            console.log(`Failed to update topic ${threadId}:`, err.message);
        }
    }
    console.log("Done!");
}

run();

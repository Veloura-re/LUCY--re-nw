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
    console.error("Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    process.exit(1);
}

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
    console.log("Renaming topic 7 to emoji hashtag...");
    try {
        // \u0023\uFE0F\u20E3 is the Unicode representation of the hashtag emoji #️⃣
        await editForumTopic(7, '#️⃣general-chat', '');
        console.log("✔ Renamed successfully!");
    } catch (err) {
        console.error("Failed:", err.message);
    }
}

run();

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

if (!TOKEN) {
    console.error("Error: Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

function telegramRequest(method) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TOKEN}/${method}`,
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
                    if (parsed.ok) {
                        resolve(parsed.result);
                    } else {
                        reject(new Error(`API Error: ${parsed.description || JSON.stringify(parsed)}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log("Token:", TOKEN ? "Loaded (Length: " + TOKEN.length + ")" : "Not loaded");
    console.log("Fetching forum topic icon stickers...");
    try {
        const result = await telegramRequest('getForumTopicIconStickers');
        console.log("Stickers list:");
        result.forEach(sticker => {
            console.log(`Emoji: ${sticker.emoji} | Custom Emoji ID: ${sticker.custom_emoji_id}`);
        });
    } catch (err) {
        console.error("Failed to get stickers:", err.message);
    }
}

run();

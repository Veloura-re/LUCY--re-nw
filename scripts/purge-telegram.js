/**
 * Telegram Message Purge Script - LUCY OS
 *
 * This script deletes recent messages sent to the Telegram supergroup chat
 * by inspecting the latest message ID and deleting a range of recent IDs.
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

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
    console.error("Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env.");
    process.exit(1);
}

function telegramRequest(method, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
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
                    if (parsed.ok) resolve(parsed.result);
                    else reject(new Error(parsed.description || data));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        if (body) req.write(payload);
        req.end();
    });
}

async function run() {
    console.log("Initiating Telegram Supergroup Message Purge...");

    // 1. Send dummy message to get the current top message ID
    let dummy;
    try {
        dummy = await telegramRequest('sendMessage', {
            chat_id: CHAT_ID,
            text: 'System: Initializing purge handshake...',
            message_thread_id: 1 // general thread
        });
        console.log(`Sent dummy message. Top Message ID resolves to: ${dummy.message_id}`);
    } catch (err) {
        console.error("Failed to resolve top message ID:", err.message);
        process.exit(1);
    }

    const maxId = dummy.message_id;
    // Go back 100 message IDs to purge the flooded conversation messages
    const minId = maxId - 150;

    console.log(`Purging messages from ID ${minId} to ${maxId}...`);
    let deletedCount = 0;

    for (let id = maxId; id >= minId; id--) {
        try {
            await telegramRequest('deleteMessage', {
                chat_id: CHAT_ID,
                message_id: id
            });
            deletedCount++;
        } catch (err) {
            // Silently ignore messages that are already deleted or cannot be deleted
        }
        // Small delay to respect rate limit of deleting messages
        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`Purge complete. Successfully deleted ${deletedCount} messages.`);
}

run();

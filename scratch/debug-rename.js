const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env
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
                process.env[key] = value.trim();
            }
        });
    }
} catch (e) {}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const payload = JSON.stringify({
    chat_id: CHAT_ID,
    message_thread_id: 5,
    name: 'welcome-rules',
    icon_custom_emoji_id: '5373251851074415873'
});

const options = {
    hostname: 'api.telegram.org',
    path: `/bot${TOKEN}/editForumTopic`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        console.log("Response:", data);
    });
});
req.write(payload);
req.end();

const https = require('https');

const TOKEN = 'MTUxODM2MTAwNjA0MzE2ODk1OA.GhWBg2.zeP1wTv3npg2A97SZ13jCOI-hCBIbkVTe4jgaM';
const GUILD_ID = '1518360744452817127';

function discordRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'discord.com',
            path: '/api/v10' + path,
            method: method,
            headers: {
                'Authorization': `Bot ${TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LucyOSDiscordArchitect/1.0.0',
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
                    reject(new Error(`API Request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (body) req.write(payload);
        req.end();
    });
}

async function run() {
    try {
        console.log("Querying channels for guild:", GUILD_ID);
        const channels = await discordRequest('GET', `/guilds/${GUILD_ID}/channels`);
        
        // Find general-chat channel
        const generalChat = channels.find(c => c.name === 'general-chat');
        if (!generalChat) {
            console.error("Could not find general-chat channel!");
            process.exit(1);
        }

        console.log(`Found general-chat (ID: ${generalChat.id}). Creating permanent invite...`);
        const invite = await discordRequest('POST', `/channels/${generalChat.id}/invites`, {
            max_age: 0,
            max_uses: 0,
            unique: false
        });

        console.log(`\n\x1b[32m✔ Permanent Invite Created Successfully!\x1b[0m`);
        console.log(`Invite URL: https://discord.gg/${invite.code}`);
    } catch (e) {
        console.error("Error creating invite:", e);
    }
}

run();

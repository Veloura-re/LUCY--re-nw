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

const UPDATE_TEXT_MD = `**LUCY Platform Update: Private Operating Ledger, Security Gateways, and Refinements**

We deployed a major update to **LUCY**, introducing new school management tools, zero-tolerance security, and critical bug fixes.

---

**1. PRIVATE OPERATING COSTS LEDGER (Shared Ledger for Owners and Principals)**
We introduced a private ledger for the school's admin. **Owners** and **Principals** can track internal operating costs separate from student billing.

*   **Trackable Expenses:** Track hardware (PCs, network upgrades), resources (books, assets), utilities (rent, electricity), and maintenance.
*   **Security and Encryption:** Restricted by **Role-Based Access Control (RBAC)**. Only **SUPERADMIN**, **OWNER**, or **PRINCIPAL** roles can access ledger data. Standard staff, parents, and students have zero access.
*   **Audit-Ready:** Upload digital receipts, track logging staff, and filter by categories.

---

**2. ENFORCED LEGAL SYSTEM and CONSENT GATEWAYS**
To protect student privacy and block abuse, we implemented an unbreakable consent flow:

*   **Zero-Tolerance Policy:** Terms outline countermeasures against abuse, auth bypass, and scraping. Threat patterns result in **IP bans** and referral to authorities.
*   **Mandatory Consent:** Updated login and all registration portals. Users **must** check a declaration agreeing to Terms. Buttons are disabled until ticked.

---

**3. SYSTEM FIXES AND OPTIMIZATIONS**
*   **Parent Dashboard:** Restored interactive click handlers and routing logic.
*   **Database Synchronicity:** Solved a Prisma syncing bug with a dual-URL connection scheme (pooled and direct).
*   **Auth Reliability:** Swapped legacy token parsers for optimized server-side caching using **requireRole** for snappier loads.
*   **Compilation:** Cleaned up TypeScript mismatches in dynamic page wrappers for clean builds.

---
**All schemas are migrated, routes are active, and the platform has built.**`;

const UPDATE_TEXT_HTML = `<b>LUCY Platform Update: Private Operating Ledger, Security Gateways, and Platform Refinement</b>

We have deployed a comprehensive update to <b>LUCY</b>, introducing highly requested school management tools, zero-tolerance security mechanisms, and several critical bug fixes. Here is a deep dive into everything that has been updated:

<b>1. PRIVATE OPERATING COSTS LEDGER (Shared Ledger for Owners and Principals)</b>
We have introduced a private, institutional ledger designed specifically for the school's high-level administration. <b>School Owners</b> and <b>Principals (Directors)</b> can now log, review, and track internal operating costs that should not mix with standard student billing.

• <b>Trackable Expenses:</b> You can track <b>Hardware and Equipment</b> (school PC upgrades, server equipment), <b>Resources and Books</b> (academic materials, classroom assets, library books), <b>Rent and Utilities</b> (fixed costs, space hire, network bills), and <b>Supplies and Logistics</b> (cleaning materials, office stock, maintenance).
• <b>Security and Encryption:</b> The ledger is hidden behind strict <b>Role-Based Access Control (RBAC)</b>. Only authenticated users with the role of <b>SUPERADMIN</b>, <b>OWNER</b>, or <b>PRINCIPAL</b> can query or modify ledger data. Standard staff, parents, and students have zero access to this ledger.
• <b>Audit-Ready Features:</b> Support for uploading digital receipts, tracking which staff member logged the expense, and detailed breakdowns of expenditures by category.

<b>2. ENFORCED LEGAL SYSTEM and CONSENT GATEWAYS</b>
To defend against malicious actors and protect student privacy, we have implemented an unbreakable consent flow:

• <b>Zero-Tolerance Policy:</b> The Terms of Service have been updated to outline direct legal countermeasures against platform abuse, auth bypass, data harvesting, and unauthorized scraping. We utilize active heuristics to flag threat patterns, resulting in <b>IP bans</b> and potential referral to authorities.
• <b>Mandatory Consent Checkboxes:</b> We have updated the <b>Login Page</b> and all <b>4 Registration Gateways</b> (Admin, Director, Parent, Student). Users <b>must</b> explicitly check a declaration agreeing to these terms. The submission buttons are physically disabled until the agreement is ticked. Consent state is verified serverside to ensure compliance is non-bypassable.

<b>3. SYSTEM FIXES and OPTIMIZATIONS</b>
Behind the scenes, we resolved several functional issues to polish user experience:

• <b>Parent Dashboard Buttons:</b> Restored fully interactive click handlers and routing logic for critical parent navigation elements.
• <b>Database Synchronicity:</b> Solved a Prisma Client syncing bug by structuring a dual-URL connection scheme (handling transaction-pooled connections alongside direct connections).
• <b>Session Management and Auth Reliability:</b> Replaced legacy token parsers with optimized server-side caching using <b>getCachedUser</b> and <b>requireRole</b>. This makes navigating between dashboard pages faster and prevents session dropouts.
• <b>Typing and Compilation Errors:</b> Cleaned up TypeScript mismatches in dynamic page wrappers, eliminating compilation errors during Next.js builds.

<b>All schemas are migrated, routes are active, and the platform has successfully built.</b>`;

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
            console.log("✔ Successfully posted update to Telegram general topic.");
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
                    console.log("✔ Successfully posted update to Discord #general channel.");
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

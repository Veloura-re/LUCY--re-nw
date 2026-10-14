/**
 * Safety interlock for scripts that wipe data.
 *
 * These scripts delete every school and user in whichever database DATABASE_URL points to, which is
 * normally the live hosted one. To run one on purpose, pass the database host explicitly:
 *
 *   node scripts/nuke-and-seed.js --wipe-database=<host from DATABASE_URL>
 *
 * Without a matching host (or with NODE_ENV=production) the script prints the target and stops.
 */
require('dotenv').config();

function databaseHost() {
    try {
        return new URL(process.env.DATABASE_URL || '').hostname;
    } catch {
        return '';
    }
}

function requireWipeConfirmation(scriptName) {
    const host = databaseHost();
    const arg = process.argv.find(a => a.startsWith('--wipe-database='));
    const confirmed = arg ? arg.slice('--wipe-database='.length) : '';

    if (process.env.NODE_ENV === 'production') {
        console.error(`[${scriptName}] Refusing to run with NODE_ENV=production.`);
        process.exit(1);
    }
    if (!host) {
        console.error(`[${scriptName}] DATABASE_URL is missing or invalid; nothing to wipe.`);
        process.exit(1);
    }
    if (confirmed !== host) {
        console.error(`[${scriptName}] This script DELETES ALL schools and users in the database at:`);
        console.error(`    ${host}`);
        console.error(`To continue, re-run with:  --wipe-database=${host}`);
        process.exit(1);
    }
    console.warn(`[${scriptName}] Confirmed. Wiping data on ${host} ...`);
}

module.exports = { requireWipeConfirmation };

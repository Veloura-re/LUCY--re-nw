const { Client } = require('pg');

const projectRef = 'caeeusbhwrkelnffbbub';
const pw = 'amsocookd2133';

const configs = [
    { host: 'aws-1-eu-west-1.pooler.supabase.com', port: 5432, user: `postgres.${projectRef}` },
    { host: 'aws-1-eu-west-1.pooler.supabase.com', port: 6543, user: `postgres.${projectRef}` },
    { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres' },
];

async function main() {
    for (const config of configs) {
        console.log(`--- Testing ${config.host}:${config.port} | User: ${config.user} ---`);
        const client = new Client({
            host: config.host,
            port: config.port,
            user: config.user,
            password: pw,
            database: 'postgres',
            connectionTimeoutMillis: 5000,
        });

        try {
            await client.connect();
            console.log(">>> SUCCESS!");
            await client.end();
            process.exit(0);
        } catch (e) {
            console.log(`>>> FAILED: ${e.message}`);
        }
    }
    console.log("All raw combinations failed.");
}

main();

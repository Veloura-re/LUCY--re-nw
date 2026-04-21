const { Client } = require('pg');

async function main() {
    const directUrl = 'postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
    const client = new Client({ connectionString: directUrl });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 5');
        console.log('Recent Audit Logs:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

main();

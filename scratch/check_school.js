const { Client } = require('pg');

async function main() {
    const directUrl = 'postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
    const client = new Client({ connectionString: directUrl });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "School" WHERE id = $1', ['587b37a2-13d0-4ba7-99a7-761585a1dec7']);
        console.log('School info:', JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

main();

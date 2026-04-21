const { Client } = require('pg');

async function main() {
    const directUrl = 'postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
    
    const client = new Client({ connectionString: directUrl });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "User" WHERE email = $1', ['goodluck97248@gmail.com']);
        console.log('User full profile:', JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

main();

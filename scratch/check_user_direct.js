const { Client } = require('pg');

async function main() {
    // Trying with the password from .env (Amsocookd2133#)
    const directUrl = 'postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
    
    console.log('Connecting to:', directUrl);
    const client = new Client({
        connectionString: directUrl,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query('SELECT id, email, role FROM "User" WHERE email = $1', ['goodluck97248@gmail.com']);
        if (res.rows.length > 0) {
            console.log('User found in DB:', JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('User NOT found in DB: goodluck97248@gmail.com');
            const allUsers = await client.query('SELECT email FROM "User" LIMIT 10');
            console.log('Some users in DB:', allUsers.rows.map(r => r.email));
        }
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

main();

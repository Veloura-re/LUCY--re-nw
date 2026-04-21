const { Client } = require('pg');

async function main() {
    // Trying with the password WITHOUT #
    const directUrl = 'postgresql://postgres.caeeusbhwrkelnffbbub:Amsocookd2133@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';
    
    console.log('Connecting to:', directUrl);
    const client = new Client({
        connectionString: directUrl,
    });

    try {
        await client.connect();
        console.log('Connected to database.');
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.message);
    }
}

main();

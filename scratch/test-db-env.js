const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('--- Testing DATABASE_URL from .env ---');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
    });

    try {
        await client.connect();
        console.log('>>> SUCCESS connecting via DATABASE_URL!');
        const res = await client.query('SELECT NOW()');
        console.log('>>> Current Time:', res.rows[0].now);
        await client.end();
    } catch (e) {
        console.log('>>> FAILED via DATABASE_URL:', e.message);
    }

    console.log('\n--- Testing DIRECT_URL from .env ---');
    const directClient = new Client({
        connectionString: process.env.DIRECT_URL,
        connectionTimeoutMillis: 5000,
    });

    try {
        await directClient.connect();
        console.log('>>> SUCCESS connecting via DIRECT_URL!');
        const res = await directClient.query('SELECT NOW()');
        console.log('>>> Current Time:', res.rows[0].now);
        await directClient.end();
    } catch (e) {
        console.log('>>> FAILED via DIRECT_URL:', e.message);
    }
}

testConnection();

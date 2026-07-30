const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => {
    console.log('Connected to pg!');
    return client.query('SELECT count(id) FROM "School"');
  })
  .then(res => console.log('Schools:', res.rows[0].count))
  .catch(e => console.error(e))
  .finally(() => client.end());

require('dotenv').config({ path: '.env' });
process.env.NEXT_RUNTIME = 'edge';

const { getCachedUser } = require('./lib/users.ts');
// Wait, lib/users.ts uses "import", so I should use tsx

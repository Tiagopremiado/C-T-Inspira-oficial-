require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
  const query = `
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pre_cadastros';
  `;
  // We can't run raw SQL using the standard supabase-js client without a custom RPC.
  // We can just use the REST API to query a table, but not information_schema.
}
test();

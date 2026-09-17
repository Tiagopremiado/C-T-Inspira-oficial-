const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'comando', password: 'inspira2026' })
  });
  const data = await res.json();
  
  if (!data.token) {
    console.log("LOGIN FAILED:", data);
    return;
  }
  
  console.log("LOGIN OK, Fetching...");
  
  const res2 = await fetch('http://localhost:3000/api/pre-cadastros', {
    headers: { 'Authorization': `Bearer ${data.token}` }
  });
  
  console.log("Status:", res2.status);
  const text = await res2.text();
  console.log("Response:", text.substring(0, 200));
}
test();

const fetch = require('node-fetch');

async function login() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'comando', password: 'inspira2026' })
  });
  const data = await res.json();
  return data.token;
}

async function getList(token) {
  const res = await fetch('http://localhost:3000/api/pre-cadastros', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text = await res.text();
  console.log(res.status, text);
}

login().then(getList).catch(console.error);

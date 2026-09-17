async function test() {
  const res = await fetch('http://localhost:3000/api/config');
  console.log("Config:", await res.json());
  
  const res2 = await fetch('http://localhost:3000/api/pre-cadastros');
  console.log("Pre-cadastros length:", (await res2.json()).length);
}
test();

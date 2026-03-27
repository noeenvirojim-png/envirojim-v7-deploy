const fetch = require('node-fetch');

const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
const baseUrl = 'http://127.0.0.1:3000';

(async () => {
  console.log('=== TESTING CANONICAL QUERY ENDPOINT ===\n');

  // Test 1: Query for "pressure valve"
  console.log('Test 1: Query "pressure valve"');
  try {
    const url = `${baseUrl}/api/machines/${titanId}/canonical-query?q=pressure%20valve`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n---\n');

  // Test 2: Query for "inspection"
  console.log('Test 2: Query "inspection"');
  try {
    const url = `${baseUrl}/api/machines/${titanId}/canonical-query?q=inspection`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n---\n');

  // Test 3: Query for "pressure"
  console.log('Test 3: Query "pressure"');
  try {
    const url = `${baseUrl}/api/machines/${titanId}/canonical-query?q=pressure`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`🔍 Checking Project Health via API: ${url}`);

const options = {
    headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
    }
};

https.get(url, options, (res) => {
    console.log(`📡 Status Code: ${res.statusCode}`);
    console.log(`📄 Headers: ${JSON.stringify(res.headers, null, 2)}`);

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`📄 Body: ${data}`);
    });

}).on('error', (e) => {
    console.error(`❌ HTTP Error: ${e.message}`);
});

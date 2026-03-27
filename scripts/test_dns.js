const dns = require('dns');
const util = require('util');
const resolve4 = util.promisify(dns.resolve4);

const host = 'db.mdbyrkxraplifqcrpqol.supabase.co';

async function testDNS() {
    console.log(`🔍 Resolving ${host}...`);
    try {
        const addresses = await resolve4(host);
        console.log(`✅ Success! IP Address: ${addresses[0]}`);
    } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
    }
}

testDNS();

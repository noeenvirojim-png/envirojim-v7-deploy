const dns = require('dns');
const util = require('util');
const resolve4 = util.promisify(dns.resolve4);

const HOST = 'db.mdbyrkxraplifqcrpqol.supabase.co';

console.log(`🔍 Attempting resolving ${HOST} using default DNS...`);
dns.resolve4(HOST, (err, addresses) => {
    if (err) {
        console.log(`❌ Default DNS Failed: ${err.message}`);
        console.log(`🔄 Trying Google DNS (8.8.8.8)...`);

        try {
            dns.setServers(['8.8.8.8']);
            dns.resolve4(HOST, (err2, addresses2) => {
                if (err2) {
                    console.error(`❌ Google DNS Failed: ${err2.message}`);
                } else {
                    console.log(`✅ Success via Google DNS! IP: ${addresses2[0]}`);
                }
            });
        } catch (e) {
            console.error(`❌ Could not set DNS servers: ${e.message}`);
        }
    } else {
        console.log(`✅ Success via Default DNS! IP: ${addresses[0]}`);
    }
});

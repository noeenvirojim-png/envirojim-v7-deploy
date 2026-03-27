const dns = require('dns');
const util = require('util');

const resolveCname = util.promisify(dns.resolveCname);
const resolveAny = util.promisify(dns.resolveAny);

const host = 'db.mdbyrkxraplifqcrpqol.supabase.co';

async function scan() {
    console.log(`🔎 Scanning DNS for ${host}...`);

    try {
        console.log('--- CNAME ---');
        const cnames = await resolveCname(host);
        console.log(JSON.stringify(cnames, null, 2));
    } catch (e) { console.log('No CNAME:', e.code); }

    try {
        console.log('--- ANY ---');
        const records = await resolveAny(host);
        console.log(JSON.stringify(records, null, 2));
    } catch (e) {
        // resolveAny might not be supported or fail
        console.log('ResolveAny failed:', e.code);
    }
}

scan();

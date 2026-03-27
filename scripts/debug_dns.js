const dns = require('dns');

const host = 'db.mdbyrkxraplifqcrpqol.supabase.co';

console.log(`Resolving ${host}...`);

dns.resolve4(host, (err, addresses) => {
    if (err) {
        console.error('IPv4 Error:', err);
    } else {
        console.log('IPv4 Addresses:', addresses);
    }
});

dns.resolve6(host, (err, addresses) => {
    if (err) {
        console.error('IPv6 Error:', err);
        console.log('Detailed IPv6 error:', JSON.stringify(err, null, 2));
    } else {
        console.log('IPv6 Addresses:', addresses);
    }
});

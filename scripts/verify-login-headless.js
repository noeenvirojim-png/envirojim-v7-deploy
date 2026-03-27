const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log(`🔌 Testing Login on http://localhost:${options.port}...`);

const req = http.request(options, (res) => {
    console.log(`\n📥 Status Code: ${res.statusCode}`);
    console.log(`📍 Redirect Location: ${res.headers.location}`);

    if (res.headers['set-cookie']) {
        console.log('🍪 Cookies Set: Yes');
    } else {
        console.log('🍪 Cookies Set: No');
    }

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 303) {
            console.log('\n✅ Login successful! Status:', res.statusCode);

            let cookies = res.headers['set-cookie'];
            if (!cookies) {
                console.log('❌ FATAL: No cookies received!');
                return;
            }

            console.log('🍪 Cookies received:', cookies.length);

            // Prepare request to /dashboard
            const dashboardOptions = {
                hostname: 'localhost',
                port: 3005,
                path: '/dashboard',
                method: 'GET',
                headers: {
                    'Cookie': cookies.join('; ')
                }
            };

            console.log('\n🚀 Verifying access to /dashboard...');
            const dashboardReq = http.request(dashboardOptions, (dashRes) => {
                console.log(`📥 Dashboard Status: ${dashRes.statusCode}`);

                if (dashRes.statusCode === 200) {
                    console.log('✅ DASHBOARD ACCESS CONFIRMED (200 OK)');
                } else if (dashRes.statusCode === 404) {
                    console.log('❌ DASHBOARD NOT FOUND (404)');
                } else if (dashRes.statusCode === 307 || dashRes.statusCode === 308) {
                    console.log(`⚠️ Redirected to: ${dashRes.headers.location}`);
                } else {
                    console.log(`⚠️ Unexpected status: ${dashRes.statusCode}`);
                }
            });

            dashboardReq.on('error', (e) => console.error('Dashboard Req Error:', e));
            dashboardReq.end();

        } else {
            console.log('\n❌ Login Failed:', res.statusCode);
            console.log('Body:', data);
        }
    });
});

req.on('error', (error) => {
    console.error(`❌ Connection Error: ${error.message}`);
    console.error('   (Is the server running on port 3004?)');
});

req.write(JSON.stringify({
    email: 'noe@envirojim.com',
    password: '@Enviro2018!'
}));

req.end();

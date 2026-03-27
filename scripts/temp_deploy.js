
const https = require('https');

function deploy() {
    const url = 'https://envirojim-final-deployment.vercel.app/api/admin/deploy-schema';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';
    
    console.log('🚀 Calling deploy-schema...');
    
    const options = {
        headers: {
            'x-admin-secret': key
        }
    };

    https.get(url, options, (res) => {
        let data = '';
        console.log(`📡 Status Code: ${res.statusCode}`);
        
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('✅ Response:', data);
            process.exit(res.statusCode === 200 ? 0 : 1);
        });

    }).on('error', (err) => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
}

deploy();

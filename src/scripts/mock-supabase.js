
/* eslint-disable */
const http = require('http');

const port = 54321;

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info, x-admin-secret');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    console.log(`[MOCK] ${req.method} ${req.url}`);

    // --- AUTH MOCK ---
    if (req.url.includes('/auth/v1/token')) {
        res.writeHead(200);
        return res.end(JSON.stringify({
            access_token: 'mock-access-token',
            user: {
                id: '00000000-0000-0000-0000-000000000001',
                email: 'auditor-v6@envirojim.com',
                user_metadata: { role: 'ENVIROJIM_ADMIN' }
            }
        }));
    }

    if (req.url.includes('/auth/v1/user') || req.url.includes('/auth/v1/admin/users')) {
        res.writeHead(200);
        return res.end(JSON.stringify({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'auditor-v6@envirojim.com',
            user_metadata: { role: 'ENVIROJIM_ADMIN' },
            users: [{ id: '00000000-0000-0000-0000-000000000001', email: 'auditor-v6@envirojim.com' }]
        }));
    }

    // --- DATABASE (REST) MOCK ---
    if (req.url.includes('/rest/v1/')) {
        const table = req.url.split('/').pop().split('?')[0];

        if (req.method === 'GET') {
            const mockDate = new Date().toISOString();
            if (table === 'organizations') {
                return res.end(JSON.stringify([{
                    id: '00000000-0000-0000-0000-000000000001',
                    name: 'EnviroJim HQ',
                    type: 'MANUFACTURER',
                    created_at: mockDate,
                    updated_at: mockDate
                }]));
            }
            if (table === 'machines') {
                return res.end(JSON.stringify([{
                    id: 'm1',
                    name: 'VB750 DK',
                    ingestion_status: 'COMPLETED',
                    created_at: mockDate,
                    updated_at: mockDate
                }]));
            }
        }
        
        res.writeHead(200);
        return res.end(JSON.stringify([]));
    }

    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Mock Supabase sitting at http://127.0.0.1:${port}`);
});

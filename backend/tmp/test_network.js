import http from 'http';

const hosts = ['127.0.0.1', 'localhost', '0.0.0.0'];
const port = 5000;

async function testConnection(host) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log(`[TEST] ${host}:${port} - TIMEOUT`);
            resolve();
        }, 2000);

        const req = http.get(`http://${host}:${port}/api/health`, (res) => {
            clearTimeout(timeout);
            console.log(`[TEST] ${host}:${port} - SUCCESS (${res.statusCode})`);
            resolve();
        });

        req.on('error', (err) => {
            clearTimeout(timeout);
            console.log(`[TEST] ${host}:${port} - ERROR: ${err.message}`);
            resolve();
        });
    });
}

async function run() {
    console.log("Starting network connectivity test to port 5000...");
    for (const host of hosts) {
        await testConnection(host);
    }
}

run();

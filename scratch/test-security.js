const http = require('http');

async function makeRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, data });
            });
        });

        req.on('error', e => reject(e));
        if (method !== 'GET') {
            req.write(JSON.stringify({ test: true }));
        }
        req.end();
    });
}

async function runTests() {
    console.log("=== Testing Default API Auth Lock ===");
    try {
        const res1 = await makeRequest('/api/user/settings');
        console.log(`GET /api/user/settings -> Status: ${res1.status}`);
        console.log(`Data: ${res1.data}`);
        if (res1.status === 401) {
            console.log("✅ Default Auth Lock is working!");
        } else {
            console.log("❌ Default Auth Lock failed. Expected 401.");
        }
    } catch (e) {
        console.log("Error testing auth lock:", e.message);
    }

    console.log("\n=== Testing API Rate Limiting (Auth endpoints) ===");
    let rateLimited = false;
    for (let i = 1; i <= 15; i++) {
        try {
            const res = await makeRequest('/api/auth/validate-key', 'POST');
            console.log(`[Request ${i}] POST /api/auth/validate-key -> Status: ${res.status}`);
            if (res.status === 429) {
                console.log("✅ Rate Limit successfully triggered at request " + i);
                rateLimited = true;
                break;
            }
        } catch (e) {
            console.log(`Error on request ${i}:`, e.message);
        }
    }

    if (!rateLimited) {
        console.log("❌ Rate Limiter failed to trigger after 15 requests.");
    }
}

// Give server 5 more seconds to fully boot just in case
setTimeout(runTests, 5000);

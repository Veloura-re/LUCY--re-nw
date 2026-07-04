import { randomBytes } from 'crypto';

const TARGET_URL = 'http://localhost:3005/api/public/stats';
const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 50;

function getRandomIP(): string {
    return `${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

async function runRequest(): Promise<{ status: number; duration: number }> {
    const start = Date.now();
    try {
        const ip = getRandomIP();
        const res = await fetch(TARGET_URL, {
            headers: {
                'X-Forwarded-For': ip,
                'User-Agent': 'LucyStressTester/1.0'
            }
        });
        await res.text(); // consume body
        return { status: res.status, duration: Date.now() - start };
    } catch (e) {
        return { status: 0, duration: Date.now() - start };
    }
}

async function main() {
    console.log(`🔥 Starting Concurrency Load Test...`);
    console.log(`Target URL:  ${TARGET_URL}`);
    console.log(`Total Req:   ${TOTAL_REQUESTS}`);
    console.log(`Concurrency: ${CONCURRENCY}\n`);

    const startTest = Date.now();
    const latencies: number[] = [];
    const statusCounts: Record<number, number> = {};

    let activeRequests = 0;
    let completedRequests = 0;

    const runWorker = async () => {
        while (completedRequests < TOTAL_REQUESTS) {
            completedRequests++;
            const { status, duration } = await runRequest();
            latencies.push(duration);
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
    };

    // Spawn workers matching the concurrency limit
    const workers = Array.from({ length: CONCURRENCY }, () => runWorker());
    await Promise.all(workers);

    const totalDuration = (Date.now() - startTest) / 1000;
    const rps = (latencies.length / totalDuration).toFixed(2);

    // Sort latencies to compute percentiles
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avg = (sum / latencies.length).toFixed(2);
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const median = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`📊 Load Test Report:`);
    console.log(`---------------------------------------------`);
    console.log(`Total Time:        ${totalDuration.toFixed(2)}s`);
    console.log(`Throughput (RPS):  ${rps} req/sec`);
    console.log(`Success Rate:      ${(((statusCounts[200] || 0) / latencies.length) * 100).toFixed(2)}%`);
    console.log(`\nLatency Stats:`);
    console.log(`  Min:             ${min}ms`);
    console.log(`  Average:         ${avg}ms`);
    console.log(`  Median:          ${median}ms`);
    console.log(`  95th Percentile: ${p95}ms`);
    console.log(`  99th Percentile: ${p99}ms`);
    console.log(`  Max:             ${max}ms`);
    console.log(`\nResponse Status Codes:`);
    for (const [code, count] of Object.entries(statusCounts)) {
        const name = code === '200' ? '200 OK' : code === '429' ? '429 Too Many Requests' : code === '0' ? 'Network Error/Timeout' : `${code} Other`;
        console.log(`  ${name}: ${count}`);
    }
    console.log(`---------------------------------------------`);
}

main().catch(console.error);

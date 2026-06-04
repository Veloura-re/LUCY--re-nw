async function run() {
    console.log("Querying http://localhost:8787/api/diagnose-prisma...");
    try {
        const res = await fetch("http://localhost:8787/api/diagnose-prisma");
        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));
        const text = await res.text();
        console.log("Body preview:", text.slice(0, 1000));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
run();

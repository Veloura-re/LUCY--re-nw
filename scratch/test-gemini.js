const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env' });

async function run() {
    console.log("Testing with env key:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "YES" : "NO");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello!");
        const response = await result.response;
        console.log("Success with env key! Response:", response.text());
    } catch (e) {
        console.error("Error with env key:", e.message);
    }
    
    // Let's also test the key from wrangler.jsonc / dev.vars
    const wranglerKey = "REDACTED_GEMINI_KEY";
    console.log("\nTesting with wrangler key...");
    const genAIWrangler = new GoogleGenerativeAI(wranglerKey);
    try {
        const model = genAIWrangler.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello!");
        const response = await result.response;
        console.log("Success with wrangler key! Response:", response.text());
    } catch (e) {
        console.error("Error with wrangler key:", e.message);
    }
}

run();

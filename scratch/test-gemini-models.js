const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("Success:", response.text());
    } catch (e) {
        console.error("Error with gemini-flash-latest:", e.message);
    }

    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result2 = await model2.generateContent("Hello");
        const response2 = await result2.response;
        console.log("Success with 1.5:", response2.text());
    } catch (e) {
        console.error("Error with gemini-1.5-flash:", e.message);
    }
}
run();

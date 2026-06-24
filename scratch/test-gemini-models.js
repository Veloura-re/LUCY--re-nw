const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testModel(genAI, modelName) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`Success with ${modelName}:`, response.text().trim());
    } catch (e) {
        console.error(`Error with ${modelName}:`, e.message);
    }
}

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const models = [
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash"
    ];
    for (const m of models) {
        await testModel(genAI, m);
    }
}
run();

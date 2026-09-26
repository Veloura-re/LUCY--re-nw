#!/bin/bash
sed -i 's/const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '\'\'';/let _genAIInstance: GoogleGenerativeAI | null = null;\nexport const getGenAI = () => {\n    if (!_genAIInstance) {\n        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";\n        _genAIInstance = new GoogleGenerativeAI(apiKey);\n    }\n    return _genAIInstance;\n};\n\nexport const getApiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";/g' lib/ai.ts
sed -i 's/const genAI = new GoogleGenerativeAI(apiKey);//g' lib/ai.ts
sed -i 's/if (!apiKey)/if (!getApiKey())/g' lib/ai.ts
sed -i 's/genAI.getGenerativeModel/getGenAI().getGenerativeModel/g' lib/ai.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeStudentRisk(studentData: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `You are a school counselor and data analyst for LUCY, a modern school management platform.
Analyze the following student data and provide a concise JSON risk assessment.

Data:
${JSON.stringify(studentData)}

Respond strictly in the following JSON format without any markdown wrappers or additional text:
{
    "riskLevel": "Low" | "Medium" | "High" | "Critical",
    "summary": "A 1-2 sentence summary of their status",
    "keyObservations": ["Observation 1", "Observation 2"],
    "recommendedInterventions": ["Intervention 1", "Intervention 2"]
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

export async function generateGradeFeedback(score: number, maxScore: number, subject: string, previousContext?: string) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const percentage = score / maxScore;
    
    const prompt = `You are an encouraging teacher. Generate a single paragraph (2-3 sentences max) of personalized, constructive feedback for a student who scored ${score}/${maxScore} (${(percentage * 100).toFixed(1)}%) in ${subject}. 
${previousContext ? `Additional context: ${previousContext}` : ''}
The feedback should be addressed to the student (e.g., "Great job on your...", "I noticed you struggled with..."). Keep it professional but warm. Do not use quotes around the output.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

export async function processParentChat(contextData: any, userMessage: string, previousHistory?: any[]) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `You are LUCY, a friendly and professional AI assistant for parents in a school management system.
You MUST answer the parent's questions based EXCLUSIVELY on the following JSON context data about their children, school, and fees.
If the parent asks something not covered by the context, politely inform them that you don't have that information.
Keep responses concise, helpful, and easily scannable. Format with markdown if necessary.

Context Data:
${JSON.stringify(contextData)}
`
    });

    // Formatting history for Gemini API
    const history = (previousHistory || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage([{ text: userMessage }]);
    return result.response.text();
}

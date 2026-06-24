import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeStudentRisk(studentData: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

/**
 * Generate a draft for a new assignment based on teacher input.
 */
export async function generateAssignmentDraft({ subject, topic, gradeLevel, requirements }: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert educator assistng a teacher in creating a high-quality assignment on the LUCY platform.
Generate an assignment draft for:
- Subject: ${subject}
- Topic: ${topic}
- Grade Level: ${gradeLevel}
${requirements ? `- Specific Requirements: ${requirements}` : ''}

Respond STRICTLY in the following JSON format:
{
    "title": "Concise, engaging title",
    "description": "Clear instructions, objectives, and requirements (2-3 paragraphs)",
    "type": "HOMEWORK" | "PROJECT" | "ESSAY" | "LAB",
    "maxScore": 100
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * Analyze an assignment task for a student and provide tips.
 */
export async function analyzeStudentTask(assignment: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are LUCY, a student's neural study assistant. 
Analyze the following assignment and provide a concise "Neural Breakdown" to help them succeed.

Assignment Title: ${assignment.title}
Description: ${assignment.description}
Subject: ${assignment.subject}

Respond strictly in the following JSON format:
{
    "summary": "1-sentence summary of what's expected",
    "keyObjectives": ["Objective 1", "Objective 2"],
    "successTips": ["Tip 1", "Tip 2"],
    "estimatedTime": "e.g., 45-60 minutes"
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}
/**
 * Pre-evaluate a student's submission before they finalize it.
 */
export async function preEvaluateSubmission(assignment: any, studentContent: string) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are LUCY's Academic Quality Monitor. Pre-evaluate the following student submission against the assignment details.
    
    Assignment: ${assignment.title}
    Objectives: ${assignment.description}
    
    Student Submission:
    ${studentContent}
    
    Respond strictly in the following JSON format:
    {
        "status": "Ready" | "Incomplete" | "Needs Improvement",
        "feedback": "A concise 1-2 sentence recommendation",
        "checklist": [
            { "item": "Criterion name", "completed": true | false }
        ]
    }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * Summarize a student's submission for the teacher.
 */
export async function summarizeSubmission(studentContent: string) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a surgical summary assistant for teachers. Summarize the following student submission into a concise, high-level overview (3-4 bullet points) that highlights their main arguments and any glaring omissions.
    
    Content:
    ${studentContent}
    
    Keep it technical and objective. Max 100 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

/**
 * Synthesize school-wide assignment analytics for institutional oversight.
 */
export async function generateInstitutionalInsight(analytics: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are LUCY's Institutional Strategist. Analyze the following school-wide assignment analytics and provide a high-level strategic insight for the Director.
    
    Data:
    - Total Assignments: ${analytics.totalAssignments}
    - Total Submissions: ${analytics.totalSubmissions}
    - Completion Index: ${analytics.completionIndex}%
    - Subject Activity (Density): ${JSON.stringify(analytics.subjectActivity)}
    
    Respond strictly in the following JSON format:
    {
        "status": "Operational" | "Strained" | "Inefficient",
        "insight": "A concise, high-level tactical summary of the school's academic output.",
        "strategicRecommendations": ["Recommendation 1", "Recommendation 2"],
        "frictionPoints": ["Friction Point 1", "Level of Concern"]
    }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * Provide a parent-friendly breakdown and support tips for an assignment.
 */
export async function analyzeTaskForParent(assignment: any) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are LUCY's Parental Engagement Assistant. 
    Analyze the following assignment and provide a simplified, parent-friendly breakdown to help them support their child's learning.
    
    Assignment: ${assignment.title}
    Description: ${assignment.description || "No description provided"}
    Subject: ${assignment.subject?.name || "Unknown Subject"}
    
    Respond strictly in the following JSON format:
    {
        "parentSummary": "A simplified overview of what the child is learning (1-2 sentences)",
        "supportTips": ["Support Tip 1", "Support Tip 2"],
        "curriculumConnection": "Simplified reason why this matters",
        "difficultyLevel": "Low" | "Medium" | "High"
    }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * Generate a set of interactive exam questions.
 */
export async function generateExamQuestions({ subject, topic, gradeLevel, count, type }: { subject: string, topic: string, gradeLevel: string, count: number, type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MIXED' }) {
    if (!apiKey) throw new Error("AI is not configured. Missing API Key.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert educator. Generate ${count} exam questions for:
    - Subject: ${subject}
    - Topic: ${topic}
    - Grade Level: ${gradeLevel}
    - Question Type: ${type === 'MIXED' ? 'A mix of multiple choice, true/false, and short answer' : type.replace('_', ' ').toLowerCase()}

    Respond STRICTLY in the following JSON format. It MUST be an array of objects:
    [
        {
            "id": "q1",
            "type": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER",
            "question": "The question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"], // ONLY include for MULTIPLE_CHOICE
            "correctAnswer": "The exact string of the correct option, or true/false, or a keyword for short answer",
            "points": 5
        }
    ]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

import { z } from 'zod';

/**
 * AI Grading Response Schema
 */
export const AiGradingSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().min(1)
});

/**
 * AI Question Schema (for extraction/remix)
 */
export const AiQuestionSchema = z.object({
  type: z.enum(['MCQ', 'SHORT', 'LONG', 'TF']),
  text: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctOption: z.number().optional(),
  answer: z.union([z.string(), z.boolean()]).optional(),
  keywords: z.array(z.string()).optional(),
  points: z.number().positive(),
  criteria: z.string().optional(),
  minWords: z.number().optional(),
});

export const AiQuestionsArraySchema = z.array(AiQuestionSchema);

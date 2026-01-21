import { z } from 'zod';

export const chatRequestSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  stream: z.boolean().optional().default(true),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

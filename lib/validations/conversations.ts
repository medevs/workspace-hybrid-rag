import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200),
});

export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>;

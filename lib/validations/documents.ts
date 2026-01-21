import { z } from 'zod';

export const documentUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  content: z.string().min(1, 'Content is required'),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  isBase64: z.boolean().optional(),
});

export const documentDeleteSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
});

export type DocumentUploadRequest = z.infer<typeof documentUploadSchema>;
export type DocumentDeleteRequest = z.infer<typeof documentDeleteSchema>;

import { z } from "zod";

export const documentTypeSchema = z.enum(["folder", "manuscript", "note", "research", "trash"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const aiTaskTypeSchema = z.enum([
  "rewrite_selected_text",
  "continue_document",
  "summarize_document",
  "critique_text",
]);
export type AiTaskType = z.infer<typeof aiTaskTypeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

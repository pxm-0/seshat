import { z } from "zod";

export const documentTypeSchema = z.enum(["folder", "manuscript", "note", "research", "trash"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const projectStatusSchema = z.enum(["active", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const snapshotReasonSchema = z.enum([
  "manual",
  "before_ai_apply",
  "autosave_checkpoint",
  "restore_point",
]);
export type SnapshotReason = z.infer<typeof snapshotReasonSchema>;

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

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const setupStatusResponseSchema = z.object({
  needsSetup: z.boolean(),
});
export type SetupStatusResponse = z.infer<typeof setupStatusResponseSchema>;

export const setupRequestSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(10).max(200),
});
export type SetupRequest = z.infer<typeof setupRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const updateProjectRequestSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export const editorJsonSchema = z.record(z.string(), z.unknown());
export type EditorJson = z.infer<typeof editorJsonSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  type: documentTypeSchema,
  title: z.string(),
  sortOrder: z.number().int(),
  editorJson: editorJsonSchema.nullable(),
  plainText: z.string(),
  synopsis: z.string().nullable(),
  status: z.string().nullable(),
  label: z.string().nullable(),
  wordCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Document = z.infer<typeof documentSchema>;

export type BinderDocument = Document & {
  children: BinderDocument[];
};

export const createDocumentRequestSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  type: documentTypeSchema.exclude(["trash"]),
  title: z.string().trim().min(1).max(180),
});
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>;

export const saveDocumentRequestSchema = z.object({
  editorJson: editorJsonSchema,
  plainText: z.string(),
  synopsis: z.string().trim().max(2000).nullable().optional(),
  status: z.string().trim().max(80).nullable().optional(),
  label: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(1).max(180).optional(),
});
export type SaveDocumentRequest = z.infer<typeof saveDocumentRequestSchema>;

export const reorderDocumentsRequestSchema = z.object({
  moves: z
    .array(
      z.object({
        documentId: z.string().uuid(),
        parentId: z.string().uuid().nullable(),
        sortOrder: z.number().int(),
      }),
    )
    .min(1),
});
export type ReorderDocumentsRequest = z.infer<typeof reorderDocumentsRequestSchema>;

export const snapshotSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  projectId: z.string().uuid(),
  reason: snapshotReasonSchema,
  title: z.string().nullable(),
  plainText: z.string(),
  wordCount: z.number().int(),
  createdAt: z.string(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

export const createSnapshotRequestSchema = z.object({
  reason: snapshotReasonSchema.default("manual"),
  title: z.string().trim().max(180).nullable().optional(),
});
export type CreateSnapshotRequest = z.infer<typeof createSnapshotRequestSchema>;

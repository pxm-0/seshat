import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  type AnyPgColumn,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin"]);
export const projectStatus = pgEnum("project_status", ["active", "archived"]);
export const documentType = pgEnum("document_type", [
  "folder",
  "manuscript",
  "note",
  "research",
  "trash",
]);
export const snapshotReason = pgEnum("snapshot_reason", [
  "manual",
  "before_ai_apply",
  "autosave_checkpoint",
  "restore_point",
]);
export const aiTaskType = pgEnum("ai_task_type", [
  "rewrite_selected_text",
  "continue_document",
  "summarize_document",
  "critique_text",
  "continuity_check",
  "memory_extract",
]);
export const aiRunStatus = pgEnum("ai_run_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "blocked",
]);
export const aiSuggestionStatus = pgEnum("ai_suggestion_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    userIdx: index("sessions_user_id_idx").on(table.userId),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: projectStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    ownerIdx: index("projects_owner_user_id_idx").on(table.ownerUserId),
    statusIdx: index("projects_status_idx").on(table.status),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => documents.id, {
      onDelete: "set null",
    }),
    type: documentType("type").notNull(),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    editorJson: jsonb("editor_json"),
    plainText: text("plain_text").notNull().default(""),
    synopsis: text("synopsis"),
    status: text("status"),
    label: text("label"),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("documents_project_id_idx").on(table.projectId),
    parentIdx: index("documents_project_parent_idx").on(table.projectId, table.parentId),
    sortIdx: index("documents_project_parent_sort_idx").on(
      table.projectId,
      table.parentId,
      table.sortOrder,
    ),
    updatedIdx: index("documents_project_updated_idx").on(table.projectId, table.updatedAt),
  }),
);

export const documentSnapshots = pgTable(
  "document_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: snapshotReason("reason").notNull(),
    title: text("title"),
    editorJson: jsonb("editor_json"),
    plainText: text("plain_text").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentCreatedIdx: index("document_snapshots_document_created_idx").on(
      table.documentId,
      table.createdAt,
    ),
    projectIdx: index("document_snapshots_project_id_idx").on(table.projectId),
  }),
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    taskType: aiTaskType("task_type").notNull(),
    status: aiRunStatus("status").notNull().default("queued"),
    suggestionStatus: aiSuggestionStatus("suggestion_status").notNull().default("pending"),
    provider: text("provider").notNull().default("openrouter"),
    model: text("model").notNull(),
    inputExcerpt: text("input_excerpt"),
    outputExcerpt: text("output_excerpt"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectCreatedIdx: index("ai_runs_project_created_idx").on(table.projectId, table.createdAt),
    statusIdx: index("ai_runs_status_idx").on(table.status),
    documentIdx: index("ai_runs_document_id_idx").on(table.documentId),
  }),
);

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aiRunId: uuid("ai_run_id")
      .notNull()
      .references(() => aiRuns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("openrouter"),
    model: text("model").notNull(),
    taskType: aiTaskType("task_type").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }).notNull(),
    actualCostUsd: numeric("actual_cost_usd", { precision: 12, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runIdx: index("ai_usage_events_ai_run_id_idx").on(table.aiRunId),
    projectCreatedIdx: index("ai_usage_events_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    modelIdx: index("ai_usage_events_model_idx").on(table.model),
  }),
);

export const aiModelPolicies = pgTable(
  "ai_model_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskType: aiTaskType("task_type").notNull(),
    defaultModel: text("default_model").notNull(),
    fallbackModel: text("fallback_model"),
    maxInputTokens: integer("max_input_tokens").notNull(),
    maxOutputTokens: integer("max_output_tokens").notNull(),
    requiresConfirmationAboveEstimatedCostUsd: numeric(
      "requires_confirmation_above_estimated_cost_usd",
      { precision: 12, scale: 6 },
    ),
    dailyBudgetUsd: numeric("daily_budget_usd", { precision: 12, scale: 6 }),
    monthlyBudgetUsd: numeric("monthly_budget_usd", { precision: 12, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    taskTypeIdx: uniqueIndex("ai_model_policies_task_type_idx").on(table.taskType),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerUserId],
    references: [users.id],
  }),
  documents: many(documents),
  aiRuns: many(aiRuns),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  parent: one(documents, {
    fields: [documents.parentId],
    references: [documents.id],
    relationName: "document_tree",
  }),
  children: many(documents, {
    relationName: "document_tree",
  }),
  snapshots: many(documentSnapshots),
  aiRuns: many(aiRuns),
}));

export const documentSnapshotsRelations = relations(documentSnapshots, ({ one }) => ({
  document: one(documents, {
    fields: [documentSnapshots.documentId],
    references: [documents.id],
  }),
  project: one(projects, {
    fields: [documentSnapshots.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [documentSnapshots.createdByUserId],
    references: [users.id],
  }),
}));

export const aiRunsRelations = relations(aiRuns, ({ one, many }) => ({
  user: one(users, {
    fields: [aiRuns.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiRuns.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [aiRuns.documentId],
    references: [documents.id],
  }),
  usageEvents: many(aiUsageEvents),
}));

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  aiRun: one(aiRuns, {
    fields: [aiUsageEvents.aiRunId],
    references: [aiRuns.id],
  }),
  user: one(users, {
    fields: [aiUsageEvents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiUsageEvents.projectId],
    references: [projects.id],
  }),
  document: one(documents, {
    fields: [aiUsageEvents.documentId],
    references: [documents.id],
  }),
}));

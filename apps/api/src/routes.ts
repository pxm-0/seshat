import { documentSnapshots, documents, projects, users, type Database } from "@seshat/db";
import argon2 from "argon2";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { clearSession, createSession, requireUser } from "./auth.js";
import type { ApiConfig } from "./config.js";
import { ApiError } from "./errors.js";

const uuidParamSchema = z.object({
  projectId: z.string().uuid(),
});

const documentParamSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
});

const snapshotParamSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
  snapshotId: z.string().uuid(),
});

const setupRequestSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(10).max(200),
});

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

const createProjectRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
});

const updateProjectRequestSchema = createProjectRequestSchema
  .partial()
  .refine(
    (value) => value.title !== undefined || value.description !== undefined,
    "At least one field is required.",
  );

const documentTypeSchema = z.enum(["folder", "manuscript", "note", "research"]);

const createDocumentRequestSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  type: documentTypeSchema,
  title: z.string().trim().min(1).max(180),
});

const saveDocumentRequestSchema = z
  .object({
    editorJson: z.record(z.string(), z.unknown()).optional(),
    plainText: z.string().optional(),
    synopsis: z.string().trim().max(2000).nullable().optional(),
    status: z.string().trim().max(80).nullable().optional(),
    label: z.string().trim().max(80).nullable().optional(),
    title: z.string().trim().min(1).max(180).optional(),
  })
  .refine(
    (value) =>
      value.editorJson !== undefined ||
      value.plainText !== undefined ||
      value.synopsis !== undefined ||
      value.status !== undefined ||
      value.label !== undefined ||
      value.title !== undefined,
    "At least one field is required.",
  );

const reorderDocumentsRequestSchema = z.object({
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

const createSnapshotRequestSchema = z.object({
  reason: z
    .enum(["manual", "before_ai_apply", "autosave_checkpoint", "restore_point"])
    .default("manual"),
  title: z.string().trim().max(180).nullable().optional(),
});

const emptyEditorJson = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function countWords(plainText: string): number {
  return plainText.trim().match(/\S+/g)?.length ?? 0;
}

function serializeDate(value: Date): string {
  return value.toISOString();
}

function serializeProject(project: typeof projects.$inferSelect) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    createdAt: serializeDate(project.createdAt),
    updatedAt: serializeDate(project.updatedAt),
  };
}

function serializeDocument(document: typeof documents.$inferSelect) {
  return {
    id: document.id,
    projectId: document.projectId,
    parentId: document.parentId,
    type: document.type,
    title: document.title,
    sortOrder: document.sortOrder,
    editorJson: document.editorJson,
    plainText: document.plainText,
    synopsis: document.synopsis,
    status: document.status,
    label: document.label,
    wordCount: document.wordCount,
    createdAt: serializeDate(document.createdAt),
    updatedAt: serializeDate(document.updatedAt),
  };
}

function serializeSnapshot(snapshot: typeof documentSnapshots.$inferSelect) {
  return {
    id: snapshot.id,
    documentId: snapshot.documentId,
    projectId: snapshot.projectId,
    reason: snapshot.reason,
    title: snapshot.title,
    plainText: snapshot.plainText,
    wordCount: snapshot.wordCount,
    createdAt: serializeDate(snapshot.createdAt),
  };
}

function requireRow<T>(row: T | undefined, code: string, message: string): T {
  if (!row) {
    throw new ApiError(500, code, message);
  }

  return row;
}

function buildBinderTree(rows: Array<typeof documents.$inferSelect>) {
  const nodes = new Map<string, ReturnType<typeof serializeDocument> & { children: unknown[] }>();
  for (const row of rows) {
    nodes.set(row.id, {
      ...serializeDocument(row),
      children: [],
    });
  }

  const roots: Array<ReturnType<typeof serializeDocument> & { children: unknown[] }> = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) {
      continue;
    }

    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function ensureProjectAccess(db: Database, projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.ownerUserId, userId),
        eq(projects.status, "active"),
      ),
    )
    .limit(1);

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  return project;
}

async function ensureDocumentAccess(db: Database, projectId: string, documentId: string) {
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.projectId, projectId),
        isNull(documents.archivedAt),
      ),
    )
    .limit(1);

  if (!document) {
    throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found.");
  }

  return document;
}

async function nextSortOrder(db: Database, projectId: string, parentId: string | null) {
  const where = parentId
    ? and(eq(documents.projectId, projectId), eq(documents.parentId, parentId))
    : and(eq(documents.projectId, projectId), isNull(documents.parentId));
  const [lastSibling] = await db
    .select({ sortOrder: documents.sortOrder })
    .from(documents)
    .where(where)
    .orderBy(desc(documents.sortOrder))
    .limit(1);

  return (lastSibling?.sortOrder ?? 0) + 1000;
}

export function registerRoutes(server: FastifyInstance, db: Database, config: ApiConfig) {
  const secureCookie = config.nodeEnv === "production";

  server.get("/api/auth/setup-status", async () => {
    const [row] = await db.select({ value: count() }).from(users);
    return { needsSetup: row?.value === 0 };
  });

  server.post("/api/auth/setup", async (request, reply) => {
    const body = setupRequestSchema.parse(request.body);
    const [row] = await db.select({ value: count() }).from(users);
    if ((row?.value ?? 0) > 0) {
      throw new ApiError(409, "SETUP_ALREADY_COMPLETE", "Setup is already complete.");
    }

    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const [user] = await db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        displayName: body.displayName,
        passwordHash,
      })
      .returning();

    const createdUser = requireRow(user, "USER_CREATE_FAILED", "Could not create admin user.");
    await createSession(db, reply, createdUser.id, secureCookie);
    return {
      user: {
        id: createdUser.id,
        email: createdUser.email,
        displayName: createdUser.displayName,
      },
    };
  });

  server.post("/api/auth/login", async (request, reply) => {
    const body = loginRequestSchema.parse(request.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, body.password))) {
      throw new ApiError(401, "INVALID_LOGIN", "Invalid email or password.");
    }

    await createSession(db, reply, user.id, secureCookie);
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  });

  server.post("/api/auth/logout", async (request, reply) => {
    await clearSession(db, request, reply);
    return { ok: true };
  });

  server.get("/api/auth/me", async (request) => {
    const user = await requireUser(db, request);
    return { user };
  });

  server.get("/api/projects", async (request) => {
    const user = await requireUser(db, request);
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerUserId, user.id), eq(projects.status, "active")))
      .orderBy(desc(projects.updatedAt));
    return { projects: rows.map(serializeProject) };
  });

  server.post("/api/projects", async (request) => {
    const user = await requireUser(db, request);
    const body = createProjectRequestSchema.parse(request.body);
    const [project] = await db
      .insert(projects)
      .values({
        ownerUserId: user.id,
        title: body.title,
        description: body.description ?? null,
      })
      .returning();
    return {
      project: serializeProject(
        requireRow(project, "PROJECT_CREATE_FAILED", "Could not create project."),
      ),
    };
  });

  server.get("/api/projects/:projectId", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    const project = await ensureProjectAccess(db, params.projectId, user.id);
    return {
      project: serializeProject(
        requireRow(project, "PROJECT_UPDATE_FAILED", "Could not update project."),
      ),
    };
  });

  server.patch("/api/projects/:projectId", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    const body = updateProjectRequestSchema.parse(request.body);
    await ensureProjectAccess(db, params.projectId, user.id);
    const [project] = await db
      .update(projects)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, params.projectId))
      .returning();
    return {
      project: serializeProject(
        requireRow(project, "PROJECT_UPDATE_FAILED", "Could not update project."),
      ),
    };
  });

  server.post("/api/projects/:projectId/archive", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    await ensureProjectAccess(db, params.projectId, user.id);
    await db
      .update(projects)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, params.projectId));
    return { ok: true };
  });

  server.get("/api/projects/:projectId/documents/tree", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    await ensureProjectAccess(db, params.projectId, user.id);
    const rows = await db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, params.projectId), isNull(documents.archivedAt)))
      .orderBy(documents.sortOrder, documents.createdAt);
    return { documents: buildBinderTree(rows) };
  });

  server.post("/api/projects/:projectId/documents", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    const body = createDocumentRequestSchema.parse(request.body);
    await ensureProjectAccess(db, params.projectId, user.id);

    if (body.parentId) {
      const parent = await ensureDocumentAccess(db, params.projectId, body.parentId);
      if (parent.type !== "folder") {
        throw new ApiError(400, "INVALID_PARENT", "Documents can only be nested under folders.");
      }
    }

    const [document] = await db
      .insert(documents)
      .values({
        projectId: params.projectId,
        parentId: body.parentId ?? null,
        type: body.type,
        title: body.title,
        sortOrder: await nextSortOrder(db, params.projectId, body.parentId ?? null),
        editorJson: body.type === "folder" ? null : emptyEditorJson,
        plainText: "",
        wordCount: 0,
      })
      .returning();

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));
    return {
      document: serializeDocument(
        requireRow(document, "DOCUMENT_CREATE_FAILED", "Could not create document."),
      ),
    };
  });

  server.get("/api/projects/:projectId/documents/:documentId", async (request) => {
    const user = await requireUser(db, request);
    const params = documentParamSchema.parse(request.params);
    await ensureProjectAccess(db, params.projectId, user.id);
    const document = await ensureDocumentAccess(db, params.projectId, params.documentId);
    return {
      document: serializeDocument(
        requireRow(document, "DOCUMENT_NOT_FOUND", "Document not found."),
      ),
    };
  });

  server.patch("/api/projects/:projectId/documents/:documentId", async (request) => {
    const user = await requireUser(db, request);
    const params = documentParamSchema.parse(request.params);
    const body = saveDocumentRequestSchema.parse(request.body);
    await ensureProjectAccess(db, params.projectId, user.id);
    const currentDocument = await ensureDocumentAccess(db, params.projectId, params.documentId);
    const nextPlainText = body.plainText ?? currentDocument.plainText;
    const [document] = await db
      .update(documents)
      .set({
        ...(body.editorJson !== undefined ? { editorJson: body.editorJson } : {}),
        ...(body.plainText !== undefined ? { plainText: body.plainText } : {}),
        wordCount: countWords(nextPlainText),
        ...(body.synopsis !== undefined ? { synopsis: body.synopsis } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, params.documentId), eq(documents.projectId, params.projectId)))
      .returning();

    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, params.projectId));
    return {
      document: serializeDocument(
        requireRow(document, "DOCUMENT_SAVE_FAILED", "Could not save document."),
      ),
    };
  });

  server.post("/api/projects/:projectId/documents/reorder", async (request) => {
    const user = await requireUser(db, request);
    const params = uuidParamSchema.parse(request.params);
    const body = reorderDocumentsRequestSchema.parse(request.body);
    await ensureProjectAccess(db, params.projectId, user.id);

    const ids = body.moves.map((move) => move.documentId);
    const ownedRows = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.projectId, params.projectId), inArray(documents.id, ids)));
    if (ownedRows.length !== ids.length) {
      throw new ApiError(
        400,
        "INVALID_REORDER",
        "One or more documents do not belong to this project.",
      );
    }

    for (const move of body.moves) {
      await db
        .update(documents)
        .set({
          parentId: move.parentId,
          sortOrder: move.sortOrder,
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, move.documentId), eq(documents.projectId, params.projectId)));
    }

    return { ok: true };
  });

  server.post("/api/projects/:projectId/documents/:documentId/snapshots", async (request) => {
    const user = await requireUser(db, request);
    const params = documentParamSchema.parse(request.params);
    const body = createSnapshotRequestSchema.parse(request.body);
    await ensureProjectAccess(db, params.projectId, user.id);
    const document = await ensureDocumentAccess(db, params.projectId, params.documentId);
    const [snapshot] = await db
      .insert(documentSnapshots)
      .values({
        documentId: document.id,
        projectId: document.projectId,
        createdByUserId: user.id,
        reason: body.reason,
        title: body.title ?? null,
        editorJson: document.editorJson,
        plainText: document.plainText,
        wordCount: document.wordCount,
      })
      .returning();
    return {
      snapshot: serializeSnapshot(
        requireRow(snapshot, "SNAPSHOT_CREATE_FAILED", "Could not create snapshot."),
      ),
    };
  });

  server.get("/api/projects/:projectId/documents/:documentId/snapshots", async (request) => {
    const user = await requireUser(db, request);
    const params = documentParamSchema.parse(request.params);
    await ensureProjectAccess(db, params.projectId, user.id);
    await ensureDocumentAccess(db, params.projectId, params.documentId);
    const rows = await db
      .select()
      .from(documentSnapshots)
      .where(
        and(
          eq(documentSnapshots.projectId, params.projectId),
          eq(documentSnapshots.documentId, params.documentId),
        ),
      )
      .orderBy(desc(documentSnapshots.createdAt));
    return { snapshots: rows.map(serializeSnapshot) };
  });

  server.post(
    "/api/projects/:projectId/documents/:documentId/snapshots/:snapshotId/restore",
    async (request) => {
      const user = await requireUser(db, request);
      const params = snapshotParamSchema.parse(request.params);
      await ensureProjectAccess(db, params.projectId, user.id);
      const document = await ensureDocumentAccess(db, params.projectId, params.documentId);
      const [snapshot] = await db
        .select()
        .from(documentSnapshots)
        .where(
          and(
            eq(documentSnapshots.id, params.snapshotId),
            eq(documentSnapshots.projectId, params.projectId),
            eq(documentSnapshots.documentId, params.documentId),
          ),
        )
        .limit(1);

      if (!snapshot) {
        throw new ApiError(404, "SNAPSHOT_NOT_FOUND", "Snapshot not found.");
      }

      const [restored] = await db.transaction(async (tx) => {
        await tx.insert(documentSnapshots).values({
          documentId: document.id,
          projectId: document.projectId,
          createdByUserId: user.id,
          reason: "restore_point",
          title: "Before snapshot restore",
          editorJson: document.editorJson,
          plainText: document.plainText,
          wordCount: document.wordCount,
        });

        return tx
          .update(documents)
          .set({
            editorJson: snapshot.editorJson,
            plainText: snapshot.plainText,
            wordCount: snapshot.wordCount,
            updatedAt: new Date(),
          })
          .where(
            and(eq(documents.id, params.documentId), eq(documents.projectId, params.projectId)),
          )
          .returning();
      });

      return {
        document: serializeDocument(
          requireRow(restored, "SNAPSHOT_RESTORE_FAILED", "Could not restore snapshot."),
        ),
      };
    },
  );
}

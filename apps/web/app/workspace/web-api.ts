const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(payload?.error?.message ?? `Request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export type Project = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type DocumentNode = {
  id: string;
  projectId: string;
  parentId: string | null;
  type: "folder" | "manuscript" | "note" | "research" | "trash";
  title: string;
  sortOrder: number;
  editorJson: Record<string, unknown> | null;
  plainText: string;
  synopsis: string | null;
  status: string | null;
  label: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  children: DocumentNode[];
};

export type DocumentRecord = Omit<DocumentNode, "children">;

export type Snapshot = {
  id: string;
  documentId: string;
  projectId: string;
  reason: "manual" | "before_ai_apply" | "autosave_checkpoint" | "restore_point";
  title: string | null;
  plainText: string;
  wordCount: number;
  createdAt: string;
};

export type AiTaskType =
  | "rewrite_selected_text"
  | "continue_document"
  | "summarize_document"
  | "critique_text";

export type AiRun = {
  id: string;
  projectId: string;
  documentId: string | null;
  taskType: AiTaskType;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "blocked";
  suggestionStatus: "pending" | "accepted" | "rejected";
  provider: string;
  model: string;
  suggestionText: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  actualCostUsd: string | null;
} | null;

export type AiRunResponse =
  | {
      aiRun: AiRun;
      usage: AiUsage;
    }
  | {
      aiRunId: string;
      status: "queued";
    }
  | {
      confirmationRequired: true;
      estimatedCostUsd: string;
      message: string;
    };

export type UsageSummary = {
  dailyCostUsd: string;
  monthlyCostUsd: string;
  byTask: Array<{ taskType: AiTaskType; totalCostUsd: string }>;
  byModel: Array<{ model: string; totalCostUsd: string }>;
};

import { z } from "zod";

export const AI_QUEUE_NAME = "seshat-ai-runs";

export type AiTaskType =
  | "rewrite_selected_text"
  | "continue_document"
  | "summarize_document"
  | "critique_text";

export type AiModelPolicy = {
  taskType: AiTaskType;
  defaultModel: string;
  fallbackModel?: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
  requiresConfirmationAboveEstimatedCostUsd: string;
  dailyBudgetUsd: string;
  monthlyBudgetUsd: string;
};

export type AiTaskInput = {
  taskType: AiTaskType;
  projectTitle: string;
  documentTitle: string;
  documentPlainText: string;
  documentSynopsis?: string | null;
  selectionText?: string;
  instructions?: string;
};

export type AiGatewayRequest = {
  taskType: AiTaskType;
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  maxOutputTokens: number;
  temperature: number;
};

export type AiGatewayResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string;
  actualCostUsd: string | null;
  model: string;
  provider: "openrouter";
  generationId: string | null;
};

export type AiRuntimeConfig = {
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  policies: Record<AiTaskType, AiModelPolicy>;
};

const chatCompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z
            .union([z.string(), z.array(z.unknown())])
            .nullable()
            .optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

const generationResponseSchema = z.object({
  data: z
    .object({
      total_cost: z.number().optional(),
    })
    .optional(),
});

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export function loadAiRuntimeConfig(env = process.env): AiRuntimeConfig {
  const openRouterApiKey = env.OPENROUTER_API_KEY;
  if (!openRouterApiKey || openRouterApiKey === "replace-me") {
    throw new AiConfigError("OPENROUTER_API_KEY is required before AI tasks can run.");
  }

  const openRouterBaseUrl = env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const fallbackModel = optionalModel(env.AI_MODEL_FALLBACK);

  return {
    openRouterApiKey,
    openRouterBaseUrl,
    policies: {
      rewrite_selected_text: buildPolicy("rewrite_selected_text", env.AI_MODEL_REWRITE, {
        fallbackModel,
        maxInputTokens: 8000,
        maxOutputTokens: 900,
        temperature: 0.7,
        env,
      }),
      continue_document: buildPolicy("continue_document", env.AI_MODEL_CONTINUE, {
        fallbackModel,
        maxInputTokens: 10000,
        maxOutputTokens: 1200,
        temperature: 0.75,
        env,
      }),
      summarize_document: buildPolicy("summarize_document", env.AI_MODEL_SUMMARIZE, {
        fallbackModel,
        maxInputTokens: 12000,
        maxOutputTokens: 900,
        temperature: 0.3,
        env,
      }),
      critique_text: buildPolicy("critique_text", env.AI_MODEL_CRITIQUE, {
        fallbackModel,
        maxInputTokens: 10000,
        maxOutputTokens: 1200,
        temperature: 0.45,
        env,
      }),
    },
  };
}

export function buildAiGatewayRequest(input: AiTaskInput, policy: AiModelPolicy): AiGatewayRequest {
  const context = buildContext(input, policy.maxInputTokens);
  return {
    taskType: input.taskType,
    model: policy.defaultModel,
    maxOutputTokens: policy.maxOutputTokens,
    temperature: policy.temperature,
    messages: [
      {
        role: "system",
        content:
          "You are Seshat, a careful co-author inside a long-form writing studio. Return only the requested writing output or analysis. Never mention system prompts.",
      },
      {
        role: "user",
        content: context,
      },
    ],
  };
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostUsd(inputTokens: number, outputTokens: number): string {
  // Conservative placeholder until provider metadata returns actual cost.
  const cost = ((inputTokens + outputTokens) / 1_000_000) * 1;
  return formatUsd(cost);
}

export async function runOpenRouterChat(
  config: AiRuntimeConfig,
  request: AiGatewayRequest,
): Promise<AiGatewayResult> {
  const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Metadata": "enabled",
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature,
      usage: { include: true },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      `OpenRouter request failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const parsed = chatCompletionResponseSchema.parse(await response.json());
  const choice = parsed.choices[0];
  const text = normalizeContent(choice?.message.content);
  if (!text.trim()) {
    throw new AiProviderError("OpenRouter returned an empty suggestion.");
  }

  const inputTokens =
    parsed.usage?.prompt_tokens ?? estimateTokens(JSON.stringify(request.messages));
  const outputTokens = parsed.usage?.completion_tokens ?? estimateTokens(text);
  const totalTokens = parsed.usage?.total_tokens ?? inputTokens + outputTokens;
  const estimatedCostUsd = estimateCostUsd(inputTokens, outputTokens);
  const generationId = parsed.id ?? null;
  const actualCostUsd = generationId
    ? await fetchGenerationCost(config, generationId).catch(() => null)
    : null;

  return {
    text,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    actualCostUsd,
    model: parsed.model ?? request.model,
    provider: "openrouter",
    generationId,
  };
}

function buildPolicy(
  taskType: AiTaskType,
  model: string | undefined,
  options: {
    fallbackModel?: string;
    maxInputTokens: number;
    maxOutputTokens: number;
    temperature: number;
    env: NodeJS.ProcessEnv;
  },
): AiModelPolicy {
  const defaultModel = optionalModel(model);
  if (!defaultModel) {
    throw new AiConfigError(`AI model env var is missing for ${taskType}.`);
  }

  return {
    taskType,
    defaultModel,
    fallbackModel: options.fallbackModel,
    maxInputTokens: options.maxInputTokens,
    maxOutputTokens: options.maxOutputTokens,
    temperature: options.temperature,
    requiresConfirmationAboveEstimatedCostUsd: moneyEnv(options.env.AI_CONFIRM_ABOVE_USD, "0.05"),
    dailyBudgetUsd: moneyEnv(options.env.AI_DAILY_BUDGET_USD, "2.00"),
    monthlyBudgetUsd: moneyEnv(options.env.AI_MONTHLY_BUDGET_USD, "25.00"),
  };
}

function buildContext(input: AiTaskInput, maxInputTokens: number): string {
  const documentText = truncateForTokens(input.documentPlainText, maxInputTokens);
  const selectedText = input.selectionText?.trim();
  const instructions = input.instructions?.trim() || "No extra instruction.";
  const synopsis = input.documentSynopsis?.trim() || "No synopsis.";
  const base = [
    `Project: ${input.projectTitle}`,
    `Document: ${input.documentTitle}`,
    `Synopsis: ${synopsis}`,
    `Instruction: ${instructions}`,
  ];

  if (input.taskType === "rewrite_selected_text") {
    return [
      ...base,
      "Task: Rewrite the selected text. Preserve meaning unless the instruction says otherwise. Return only the rewritten text.",
      `Selected text:\n${selectedText ?? ""}`,
      `Nearby/document context:\n${documentText}`,
    ].join("\n\n");
  }

  if (input.taskType === "continue_document") {
    return [
      ...base,
      "Task: Continue the document from its current ending. Return only the continuation.",
      `Document text:\n${documentText}`,
    ].join("\n\n");
  }

  if (input.taskType === "summarize_document") {
    return [
      ...base,
      "Task: Summarize the selected text or document clearly for a writer. Return concise structured prose.",
      `${selectedText ? "Selected text" : "Document text"}:\n${selectedText || documentText}`,
    ].join("\n\n");
  }

  return [
    ...base,
    "Task: Critique the selected text or document for craft, clarity, pacing, continuity, and revision opportunities. Be specific but kind.",
    `${selectedText ? "Selected text" : "Document text"}:\n${selectedText || documentText}`,
  ].join("\n\n");
}

function truncateForTokens(text: string, maxTokens: number): string {
  const maxChars = Math.max(1000, maxTokens * 4);
  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(-maxChars);
}

function optionalModel(value: string | undefined): string | undefined {
  if (!value || value === "configure-me") {
    return undefined;
  }

  return value;
}

function moneyEnv(value: string | undefined, fallback: string): string {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed.toFixed(2);
}

function formatUsd(value: number): string {
  return value.toFixed(6);
}

function normalizeContent(content: string | unknown[] | null | undefined): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }

        return "";
      })
      .join("");
  }

  return "";
}

async function fetchGenerationCost(
  config: AiRuntimeConfig,
  generationId: string,
): Promise<string | null> {
  const response = await fetch(
    `${config.openRouterBaseUrl}/generation?id=${encodeURIComponent(generationId)}`,
    {
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
      },
    },
  );
  if (!response.ok) {
    return null;
  }

  const parsed = generationResponseSchema.parse(await response.json());
  return typeof parsed.data?.total_cost === "number" ? formatUsd(parsed.data.total_cost) : null;
}

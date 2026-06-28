import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

export const AI_QUEUE_NAME = "seshat-ai-runs";

export type AiTaskType =
  | "rewrite_selected_text"
  | "continue_document"
  | "summarize_document"
  | "critique_text";

export type AiProvider = "openrouter" | "openai" | "anthropic" | "bedrock";

export type AiModelPolicy = {
  taskType: AiTaskType;
  provider: AiProvider;
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
  provider: AiProvider;
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
  provider: AiProvider;
  generationId: string | null;
};

export type AiRuntimeConfig = {
  providers: {
    anthropic: {
      apiKey?: string;
      baseUrl: string;
    };
    bedrock: {
      region?: string;
    };
    openai: {
      apiKey?: string;
      baseUrl: string;
    };
    openrouter: {
      apiKey?: string;
      baseUrl: string;
    };
  };
  policies: Record<AiTaskType, AiModelPolicy>;
};

const openAiCompatibleResponseSchema = z.object({
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

const anthropicResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  content: z.array(z.unknown()).optional(),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative().optional(),
      output_tokens: z.number().int().nonnegative().optional(),
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
  const defaultProvider = providerEnv(env.AI_PROVIDER, "openrouter");
  const fallbackModel = optionalModel(env.AI_MODEL_FALLBACK);

  return {
    providers: {
      anthropic: {
        apiKey: secretEnv(env.ANTHROPIC_API_KEY),
        baseUrl: env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
      },
      bedrock: {
        region: env.BEDROCK_REGION ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION,
      },
      openai: {
        apiKey: secretEnv(env.OPENAI_API_KEY),
        baseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      },
      openrouter: {
        apiKey: secretEnv(env.OPENROUTER_API_KEY),
        baseUrl: env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      },
    },
    policies: {
      rewrite_selected_text: buildPolicy("rewrite_selected_text", env.AI_MODEL_REWRITE, {
        provider: providerEnv(env.AI_PROVIDER_REWRITE, defaultProvider),
        fallbackModel,
        maxInputTokens: 8000,
        maxOutputTokens: 900,
        temperature: 0.7,
        env,
      }),
      continue_document: buildPolicy("continue_document", env.AI_MODEL_CONTINUE, {
        provider: providerEnv(env.AI_PROVIDER_CONTINUE, defaultProvider),
        fallbackModel,
        maxInputTokens: 10000,
        maxOutputTokens: 1200,
        temperature: 0.75,
        env,
      }),
      summarize_document: buildPolicy("summarize_document", env.AI_MODEL_SUMMARIZE, {
        provider: providerEnv(env.AI_PROVIDER_SUMMARIZE, defaultProvider),
        fallbackModel,
        maxInputTokens: 12000,
        maxOutputTokens: 900,
        temperature: 0.3,
        env,
      }),
      critique_text: buildPolicy("critique_text", env.AI_MODEL_CRITIQUE, {
        provider: providerEnv(env.AI_PROVIDER_CRITIQUE, defaultProvider),
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
    provider: policy.provider,
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
  // Conservative placeholder until provider metadata or provider billing exports are available.
  const cost = ((inputTokens + outputTokens) / 1_000_000) * 1;
  return formatUsd(cost);
}

export async function runAiGateway(
  config: AiRuntimeConfig,
  request: AiGatewayRequest,
): Promise<AiGatewayResult> {
  assertAiProviderConfigured(config, request.provider);

  if (request.provider === "openrouter") {
    return runOpenAiCompatibleChat({
      apiKey: config.providers.openrouter.apiKey,
      baseUrl: config.providers.openrouter.baseUrl,
      provider: "openrouter",
      request,
      metadataHeader: true,
    });
  }

  if (request.provider === "openai") {
    return runOpenAiCompatibleChat({
      apiKey: config.providers.openai.apiKey,
      baseUrl: config.providers.openai.baseUrl,
      provider: "openai",
      request,
      metadataHeader: false,
    });
  }

  if (request.provider === "anthropic") {
    return runAnthropicChat(config, request);
  }

  return runBedrockChat(config, request);
}

async function runOpenAiCompatibleChat({
  apiKey,
  baseUrl,
  metadataHeader,
  provider,
  request,
}: {
  apiKey?: string;
  baseUrl: string;
  metadataHeader: boolean;
  provider: "openai" | "openrouter";
  request: AiGatewayRequest;
}): Promise<AiGatewayResult> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(metadataHeader ? { "X-OpenRouter-Metadata": "enabled" } : {}),
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature,
      ...(provider === "openrouter" ? { usage: { include: true } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      `${provider} request failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const parsed = openAiCompatibleResponseSchema.parse(await response.json());
  const choice = parsed.choices[0];
  const text = normalizeContent(choice?.message.content);
  if (!text.trim()) {
    throw new AiProviderError(`${provider} returned an empty suggestion.`);
  }

  const inputTokens =
    parsed.usage?.prompt_tokens ?? estimateTokens(JSON.stringify(request.messages));
  const outputTokens = parsed.usage?.completion_tokens ?? estimateTokens(text);
  const totalTokens = parsed.usage?.total_tokens ?? inputTokens + outputTokens;
  const estimatedCostUsd = estimateCostUsd(inputTokens, outputTokens);
  const generationId = parsed.id ?? null;
  const actualCostUsd =
    provider === "openrouter" && generationId
      ? await fetchOpenRouterGenerationCost(baseUrl, apiKey, generationId).catch(() => null)
      : null;

  return {
    text,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd,
    actualCostUsd,
    model: parsed.model ?? request.model,
    provider,
    generationId,
  };
}

async function runAnthropicChat(
  config: AiRuntimeConfig,
  request: AiGatewayRequest,
): Promise<AiGatewayResult> {
  const system = request.messages.find((message) => message.role === "system")?.content;
  const messages = request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
  const response = await fetch(`${config.providers.anthropic.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": config.providers.anthropic.apiKey ?? "",
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      `anthropic request failed with ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const parsed = anthropicResponseSchema.parse(await response.json());
  const text = normalizeAnthropicContent(parsed.content);
  if (!text.trim()) {
    throw new AiProviderError("anthropic returned an empty suggestion.");
  }

  const inputTokens =
    parsed.usage?.input_tokens ?? estimateTokens(JSON.stringify(request.messages));
  const outputTokens = parsed.usage?.output_tokens ?? estimateTokens(text);

  return {
    text,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
    actualCostUsd: null,
    model: parsed.model ?? request.model,
    provider: "anthropic",
    generationId: parsed.id ?? null,
  };
}

async function runBedrockChat(
  config: AiRuntimeConfig,
  request: AiGatewayRequest,
): Promise<AiGatewayResult> {
  const region = config.providers.bedrock.region;
  const client = new BedrockRuntimeClient({ region });
  const system = request.messages
    .filter((message) => message.role === "system")
    .map((message) => ({ text: message.content }));
  const messages = request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: [{ text: message.content }],
    }));
  const response = await client.send(
    new ConverseCommand({
      modelId: request.model,
      system,
      messages,
      inferenceConfig: {
        maxTokens: request.maxOutputTokens,
        temperature: request.temperature,
      },
    }),
  );
  const text =
    response.output?.message?.content
      ?.map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
      .join("") ?? "";
  if (!text.trim()) {
    throw new AiProviderError("bedrock returned an empty suggestion.");
  }

  const inputTokens =
    response.usage?.inputTokens ?? estimateTokens(JSON.stringify(request.messages));
  const outputTokens = response.usage?.outputTokens ?? estimateTokens(text);
  const totalTokens = response.usage?.totalTokens ?? inputTokens + outputTokens;

  return {
    text,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
    actualCostUsd: null,
    model: request.model,
    provider: "bedrock",
    generationId: null,
  };
}

function buildPolicy(
  taskType: AiTaskType,
  model: string | undefined,
  options: {
    provider: AiProvider;
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
    provider: options.provider,
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

export function assertAiProviderConfigured(config: AiRuntimeConfig, provider: AiProvider) {
  if (provider === "openrouter" && !config.providers.openrouter.apiKey) {
    throw new AiConfigError("OPENROUTER_API_KEY is required for OpenRouter AI tasks.");
  }

  if (provider === "openai" && !config.providers.openai.apiKey) {
    throw new AiConfigError("OPENAI_API_KEY is required for OpenAI AI tasks.");
  }

  if (provider === "anthropic" && !config.providers.anthropic.apiKey) {
    throw new AiConfigError("ANTHROPIC_API_KEY is required for Anthropic AI tasks.");
  }

  if (provider === "bedrock" && !config.providers.bedrock.region) {
    throw new AiConfigError("BEDROCK_REGION or AWS_REGION is required for Bedrock AI tasks.");
  }
}

function truncateForTokens(text: string, maxTokens: number): string {
  const maxChars = Math.max(1000, maxTokens * 4);
  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(-maxChars);
}

function providerEnv(value: string | undefined, fallback: AiProvider): AiProvider {
  if (!value) {
    return fallback;
  }

  if (
    value === "openrouter" ||
    value === "openai" ||
    value === "anthropic" ||
    value === "bedrock"
  ) {
    return value;
  }

  throw new AiConfigError(
    `Unsupported AI provider "${value}". Use openrouter, openai, anthropic, or bedrock.`,
  );
}

function optionalModel(value: string | undefined): string | undefined {
  if (!value || value === "configure-me") {
    return undefined;
  }

  return value;
}

function secretEnv(value: string | undefined): string | undefined {
  if (!value || value === "replace-me") {
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

function normalizeAnthropicContent(content: unknown[] | undefined): string {
  return (
    content
      ?.map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }

        return "";
      })
      .join("") ?? ""
  );
}

async function fetchOpenRouterGenerationCost(
  baseUrl: string,
  apiKey: string | undefined,
  generationId: string,
): Promise<string | null> {
  const response = await fetch(`${baseUrl}/generation?id=${encodeURIComponent(generationId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    return null;
  }

  const parsed = generationResponseSchema.parse(await response.json());
  return typeof parsed.data?.total_cost === "number" ? formatUsd(parsed.data.total_cost) : null;
}

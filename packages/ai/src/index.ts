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
  requiresConfirmationAboveEstimatedCostUsd?: string;
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
  inputTokens?: number;
  outputTokens?: number;
  model: string;
  provider: "openrouter";
};

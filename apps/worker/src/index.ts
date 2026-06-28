import {
  AI_QUEUE_NAME,
  AiConfigError,
  AiProviderError,
  type AiTaskType,
  buildAiGatewayRequest,
  loadAiRuntimeConfig,
  runOpenRouterChat,
} from "@seshat/ai";
import { aiRuns, aiUsageEvents, createDatabase, documents, projects } from "@seshat/db";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const db = createDatabase(process.env.DATABASE_URL);

type AiRunJob = {
  aiRunId: string;
  instructions?: string;
  selectionText?: string;
};

const worker = new Worker<AiRunJob>(
  AI_QUEUE_NAME,
  async (job) => {
    const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, job.data.aiRunId)).limit(1);
    if (!run) {
      throw new Error(`AI run ${job.data.aiRunId} not found.`);
    }
    if (!run.documentId) {
      throw new Error(`AI run ${run.id} has no document.`);
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, run.projectId))
      .limit(1);
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, run.documentId))
      .limit(1);
    if (!project || !document) {
      throw new Error(`AI run ${run.id} is missing project or document.`);
    }

    await db
      .update(aiRuns)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(aiRuns.id, run.id));

    try {
      const aiConfig = loadAiRuntimeConfig();
      const taskType = run.taskType as AiTaskType;
      const policy = aiConfig.policies[taskType];
      const request = buildAiGatewayRequest(
        {
          taskType,
          projectTitle: project.title,
          documentTitle: document.title,
          documentPlainText: document.plainText,
          documentSynopsis: document.synopsis,
          selectionText: job.data.selectionText,
          instructions: job.data.instructions,
        },
        policy,
      );
      const result = await runOpenRouterChat(aiConfig, request);
      await db
        .update(aiRuns)
        .set({
          status: "succeeded",
          model: result.model,
          outputExcerpt: result.text,
          completedAt: new Date(),
        })
        .where(eq(aiRuns.id, run.id));
      await db.insert(aiUsageEvents).values({
        aiRunId: run.id,
        userId: run.userId,
        projectId: project.id,
        documentId: document.id,
        provider: result.provider,
        model: result.model,
        taskType,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        actualCostUsd: result.actualCostUsd,
      });
    } catch (error) {
      await db
        .update(aiRuns)
        .set({
          status: "failed",
          errorMessage: errorMessage(error),
          completedAt: new Date(),
        })
        .where(eq(aiRuns.id, run.id));
      throw error;
    }
  },
  {
    connection: { url: redisUrl },
  },
);

worker.on("ready", () => {
  console.log(`Seshat AI worker ready. Redis: ${redisUrl}`);
});

worker.on("failed", (job, error) => {
  console.error(`AI job ${job?.id ?? "unknown"} failed: ${error.message}`);
});

function errorMessage(error: unknown): string {
  if (
    error instanceof AiConfigError ||
    error instanceof AiProviderError ||
    error instanceof Error
  ) {
    return error.message;
  }

  return "AI job failed.";
}

import { z } from "zod";

const configSchema = z.object({
  appUrl: z.string().url(),
  databaseUrl: z.string().min(1),
  nodeEnv: z.string(),
  port: z.number().int().positive(),
  redisUrl: z.string().min(1),
  sessionSecret: z.string().min(8),
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(): ApiConfig {
  return configSchema.parse({
    appUrl: process.env.APP_URL ?? "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    sessionSecret: process.env.SESSION_SECRET ?? "change-me-dev-secret",
  });
}

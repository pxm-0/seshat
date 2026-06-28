import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createDatabase } from "@seshat/db";

import { loadConfig } from "./config.js";
import { sendApiError } from "./errors.js";
import { registerRoutes } from "./routes.js";

export function createServer() {
  const config = loadConfig();
  const db = createDatabase(config.databaseUrl);
  const server = Fastify({
    logger: true,
  });

  server.register(cookie, {
    secret: config.sessionSecret,
  });
  server.register(cors, {
    credentials: true,
    origin: config.appUrl,
  });
  server.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  server.get("/api/health", async () => ({
    ok: true,
    service: "api",
  }));

  registerRoutes(server, db, config);

  server.setErrorHandler((error, _request, reply) => {
    requestLogError(_request.id, error);
    return sendApiError(reply, error);
  });

  return server;
}

function requestLogError(requestId: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`[${requestId}] ${error.message}`);
  }
}

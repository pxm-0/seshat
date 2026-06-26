import Fastify from "fastify";

export function createServer() {
  const server = Fastify({
    logger: true,
  });

  server.get("/api/health", async () => ({
    ok: true,
    service: "api",
  }));

  return server;
}

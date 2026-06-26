# ADR-0003: GStack Split Web/API Architecture

Status: Accepted  
Date: 2026-06-24

## Context

Seshat needs a rich browser editor, durable backend persistence, server-side AI orchestration, background jobs, and cost controls. A single full-stack Next.js app would be fast to start, but it risks coupling manuscript persistence and AI policy logic to the web framework.

The project should stay simple enough for a self-hosted personal server while keeping the backend clean enough to support future desktop/mobile clients or external integrations.

## Decision

Use GStack for the MVP architecture:

```txt
apps/web      Next.js product UI
apps/api      Fastify TypeScript API
apps/worker   BullMQ background worker
packages/db   Drizzle schema, migrations, and queries
packages/ai   OpenRouter gateway, model policies, prompt contracts
packages/editor Tiptap/ProseMirror helpers and plain-text transforms
packages/shared shared types and contracts
```

The Next.js app owns UI, routing, editor shell, and client-side product flows.

The Fastify API owns auth, project/document APIs, AI orchestration endpoints, cost/usage endpoints, validation, and authorization.

The worker owns async jobs such as AI jobs, summaries, future indexing, and future exports.

## Consequences

### Positive

- Clearer runtime boundaries than a full-stack Next.js app.
- Backend logic is not coupled to Next.js.
- Worker and API can share backend packages naturally.
- Future desktop/mobile clients can call the same API.
- AI gateway and cost policy logic stay server-side and testable.
- Still deployable with Docker Compose on the personal server.

### Negative / Trade-Offs

- More setup than a single Next.js runtime.
- Auth/session behavior needs deliberate same-origin routing through the reverse proxy.
- Local development has more moving parts.
- Shared types must be kept useful without becoming ceremony.

## Alternatives Considered

- Full-stack Next.js with route handlers/server actions.
- Hono API.
- NestJS API.
- React/Vite frontend with separate API.

Full-stack Next.js is faster initially, but the long-term backend boundaries are weaker for Seshat's AI and cost-control needs.

Hono is elegant and portable, especially for edge/serverless runtimes, but Seshat's backend is a stateful Node service with Postgres, Redis, sessions, uploads later, and background job coordination. Fastify is a better fit for that operating model.

NestJS adds more structure than the MVP needs.

# ADR-0007: Redis + BullMQ for Background Jobs

Status: Accepted  
Date: 2026-06-18

## Context

AI jobs, summaries, embeddings, exports, and long-running operations should not block editor interactions.

## Decision

Use Redis with BullMQ for async jobs.

## Consequences

### Positive

- Mature Node/TypeScript queue.
- Good fit with Next.js/worker split.
- Supports retries and job status.
- Useful for rate limits/cache too.

### Negative / Trade-Offs

- Adds Redis dependency.
- Requires worker process.
- Job durability depends on configuration.

## Alternatives Considered

- Inline only.
- Postgres-backed queue.
- RabbitMQ.

BullMQ is the pragmatic P0 choice.

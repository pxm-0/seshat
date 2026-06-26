# ADR-0006: Postgres + pgvector Primary Store

Status: Accepted  
Date: 2026-06-18

## Context

The app needs durable relational data, document trees, snapshots, usage logs, and future vector search. A self-hosted setup should minimize moving parts.

## Decision

Use Postgres as the primary database. Reserve pgvector for future embeddings/project memory.

## Consequences

### Positive

- Reliable relational core.
- JSONB support for editor state.
- Full-text search.
- Vector search available later.
- Strong backup tooling.

### Negative / Trade-Offs

- Heavier than SQLite.
- Requires Postgres operations.
- Vector search may need tuning later.

## Alternatives Considered

- SQLite.
- MongoDB.
- Dedicated vector database.

Rejected because Postgres covers P0 and near-future needs with fewer components.

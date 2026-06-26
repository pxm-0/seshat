# Seshat P0

Date: 2026-06-18

Seshat is an AI-native long-form writing environment: Scrivener-style project structure, durable rich-text editing, staged AI assistance, project-aware memory later, and strict cost control through a server-side AI gateway.

This repository is currently a **P0 planning and decision package**. It defines the product scope, architecture, repo structure, operating constraints, and Architecture Decision Records before implementation begins.

## P0 Goal

P0 turns the idea into a buildable system.

The output of P0 is not a full application. The output is a clear implementation spine:

- product requirements
- architecture
- API boundaries
- data model
- AI policy
- security posture
- cost controls
- deployment plan
- backup/restore plan
- ADRs for all major technical/product decisions

## MVP Loop

The first working product should prove this loop:

1. User logs in.
2. User creates a writing project.
3. User organizes folders/documents in a binder tree.
4. User writes in a rich-text editor.
5. App autosaves safely.
6. App creates document snapshots/version history.
7. User asks AI to rewrite, continue, summarize, or critique selected text.
8. AI output is staged as a suggestion.
9. User accepts/rejects the AI suggestion.
10. App logs AI run, tokens, and estimated cost.

## Repository Map

```txt
seshat/
  apps/
    web/                  # Next.js product UI
    api/                  # Fastify API
    worker/               # BullMQ background jobs
  packages/
    ai/                   # AI gateway, policies, prompt/task contracts
    db/                   # Database schema, migrations, query helpers
    editor/               # Editor schemas, transforms, utilities
    shared/               # Shared types/contracts
  docs/
    decisions/            # ADRs
    P0_PLAN.md
    PRODUCT_REQUIREMENTS.md
    ARCHITECTURE.md
    DATA_MODEL.md
    API_DESIGN.md
    AI_MODEL_POLICY.md
    SECURITY.md
    COST_ENGINEERING.md
    DEPLOYMENT.md
    BACKUP_RESTORE.md
    OBSERVABILITY.md
    ROADMAP.md
  infra/
    caddy/
    postgres/
    scripts/
  docker-compose.yml
  .env.example
```

## Current Locked Decisions

- Modular monolith first, split into web/API/worker runtimes.
- GStack: Next.js web, Fastify API, Drizzle/Postgres, Redis/BullMQ, OpenRouter.
- Tiptap/ProseMirror for editor foundation.
- Postgres as primary database.
- pgvector reserved for project memory/retrieval.
- Redis + BullMQ for async jobs.
- OpenRouter-first AI gateway, provider-agnostic internally.
- AI edits are staged, never silently applied.
- Autosave + snapshots are product-critical, not nice-to-have.
- Docker Compose self-hosting on Ubuntu server.

See `docs/decisions/` for the full decision set.

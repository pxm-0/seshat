# Architecture

## Summary

Seshat starts as a modular monolith split across three runtimes: a Next.js web client, a Fastify API, and a BullMQ background worker.

The app is deployed with Docker Compose on a personal Ubuntu server. It uses Drizzle with Postgres as primary storage, Redis for queues/cache/rate limits, and OpenRouter through a server-side AI gateway.

## High-Level Architecture

```txt
Browser Client
  -> Next.js Web App
  -> Fastify API Server
    -> Auth Module
    -> Project Module
    -> Document Module
    -> Editor Persistence Module
    -> AI Orchestration Module
    -> Usage / Cost Module
    -> Memory / Retrieval Module later
    -> Export Module later
    -> Background Worker
      -> OpenRouter
      -> Postgres / pgvector
      -> Redis
      -> File Storage
```

## Runtime Components

```txt
caddy
  reverse proxy / TLS

web
  Next.js web app
  owns UI, routing, editor shell, and client-side product flows

api
  Fastify API server
  owns auth, project/document APIs, AI orchestration endpoints, usage endpoints

worker
  BullMQ worker
  handles async AI jobs, summaries, embeddings later, exports later

postgres
  canonical relational data
  editor documents
  AI runs
  usage events

redis
  job queues
  rate limits
  short-lived cache
```

## Module Boundaries

```txt
apps/web
  UI
  route handlers for pages only
  client integration with API

apps/api
  Fastify server
  REST endpoints
  auth/session handling
  request validation
  API-to-service adapters

apps/worker
  BullMQ workers
  async AI jobs
  future export/indexing jobs

packages/db
  schema
  migrations
  database client
  query helpers

packages/ai
  AI gateway
  OpenRouter adapter
  task policies
  context builder
  response normalizers

packages/editor
  editor JSON schema helpers
  plain text extraction
  word count
  snapshot transforms

packages/shared
  shared TypeScript types
  API contracts
  domain constants
```

## Request Flow: Editor Save

```txt
Client editor state changes
  -> local state updates immediately
  -> debounce save request
  -> API validates auth/project access
  -> document updated in Postgres
  -> version pointer updated
  -> response returns save status
```

## Request Flow: AI Rewrite

```txt
User selects text
  -> client sends AI task request
  -> API validates auth/project/document access
  -> usage policy is checked
  -> snapshot is prepared or marked required before apply
  -> context builder assembles selected text + local document context
  -> AI gateway calls OpenRouter
  -> response streams to client or job result
  -> suggestion is staged
  -> user accepts/rejects
  -> if accepted, snapshot is created, document patch applied, usage logged
```

## Design Principles

### Editor Independence

The editor must not depend on AI availability.

If OpenRouter fails, writing continues.

### AI Gateway

Feature code must not call providers directly.

All AI requests go through:

```txt
AI task -> policy -> context builder -> provider adapter -> usage logger
```

### Staged Edits

AI output should be treated as a suggestion until explicitly accepted.

No direct overwrite.

### Cost Visibility

Every AI run should create durable records:

- task type
- model
- provider
- input tokens
- output tokens
- estimated cost
- status
- duration
- user/project/document association

### Modular Monolith

The app should be simple to deploy and debug while preserving clear module boundaries.

Extraction into services is a future option, not an MVP requirement.

## Future Architecture

Later, the app can split expensive or specialized work:

```txt
web containers
api containers
ai worker pool
export worker
embedding worker
object storage
read replicas
managed database
```

Do not introduce these until the MVP earns the complexity.

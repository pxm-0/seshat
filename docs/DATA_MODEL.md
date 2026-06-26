# Data Model

## Goals

The data model must support:

- users
- projects
- binder trees
- rich-text documents
- plain-text extraction
- snapshots/version history
- AI runs
- AI usage/cost tracking
- future memory/retrieval
- future research uploads
- future exports

## Database

Primary database: Postgres.

Future extension: pgvector for embeddings.

## Core Entities

```txt
users
projects
documents
document_versions
document_snapshots
ai_runs
ai_usage_events
ai_model_policies
```

Post-MVP entities:

```txt
research_items
entities
entity_facts
timeline_events
embeddings
exports
comments
```

## users

```txt
id
email
display_name
password_hash or auth_provider_id
created_at
updated_at
```

## projects

```txt
id
owner_user_id
title
description
status
created_at
updated_at
archived_at
```

## documents

Represents folders, manuscript documents, notes, research entries, and other binder items.

```txt
id
project_id
parent_id nullable
type enum(folder, manuscript, note, research, trash)
title
sort_order
editor_json jsonb
plain_text text
synopsis text
status text
label text
word_count integer
created_at
updated_at
archived_at
```

### Notes

- `editor_json` stores canonical rich editor state.
- `plain_text` supports search, word count, summaries, AI context, and exports.
- Folders may have empty `editor_json`.
- `parent_id` creates the binder tree.
- `sort_order` handles ordering among siblings.

## document_snapshots

Snapshots are durable restore points.

```txt
id
document_id
project_id
created_by_user_id
reason enum(manual, before_ai_apply, autosave_checkpoint, restore_point)
title
editor_json jsonb
plain_text text
word_count integer
created_at
```

## document_versions

Versions can be lighter than snapshots and used for audit/history.

```txt
id
document_id
project_id
version_number
editor_json jsonb
plain_text text
change_source enum(user, ai, restore, import)
created_at
```

MVP may use snapshots only first, then add versions if needed.

## ai_runs

One row per AI task attempt.

```txt
id
user_id
project_id
document_id nullable
task_type enum(rewrite, continue, summarize, critique, continuity_check, memory_extract)
status enum(queued, running, succeeded, failed, cancelled)
provider
model
input_excerpt text nullable
output_excerpt text nullable
error_message text nullable
started_at
completed_at
created_at
```

## ai_usage_events

Durable accounting record.

```txt
id
ai_run_id
user_id
project_id
document_id nullable
provider
model
task_type
input_tokens integer
output_tokens integer
total_tokens integer
estimated_cost_usd numeric
actual_cost_usd numeric nullable
created_at
```

## ai_model_policies

Task-based model routing.

```txt
id
task_type
default_model
fallback_model
max_input_tokens
max_output_tokens
requires_confirmation boolean
daily_budget_usd nullable
monthly_budget_usd nullable
created_at
updated_at
```

## Future: entities

Structured project memory.

```txt
id
project_id
name
type enum(character, place, object, organization, concept)
description
created_at
updated_at
```

## Future: entity_facts

```txt
id
project_id
entity_id
fact_text
source_document_id nullable
confidence
status enum(active, contradicted, retired)
created_at
updated_at
```

## Future: embeddings

```txt
id
project_id
source_type enum(document, snapshot, research_item, entity_fact)
source_id
chunk_text
embedding vector
metadata jsonb
created_at
```

## Indexes

Required early:

```txt
documents(project_id)
documents(project_id, parent_id)
documents(project_id, parent_id, sort_order)
documents(project_id, updated_at)
document_snapshots(document_id, created_at)
ai_runs(project_id, created_at)
ai_runs(status)
ai_usage_events(project_id, created_at)
```

Future:

```txt
documents plain_text full-text index
embeddings vector index
entity_facts(project_id, entity_id)
```

## Consistency Rules

Strong consistency required for:

- auth
- project/document ownership
- document save
- snapshot creation
- AI suggestion acceptance
- usage accounting

Eventual consistency acceptable for:

- embeddings
- summaries
- word count recalculation
- search indexes
- analytics

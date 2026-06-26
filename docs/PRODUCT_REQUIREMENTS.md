# Product Requirements

## Product Summary

Seshat is an AI-native long-form writing studio for novels, essays, research-heavy manuscripts, and serialized fiction.

It combines Scrivener-style project organization with project-aware AI assistance. The AI is not a generic chat window bolted onto an editor. It should understand the active document, selected text, project structure, and eventually canon/memory.

## Business Context

Writers need a long-form writing environment that can manage manuscripts, notes, research, outlines, revisions, and exports.

Existing tools like Scrivener are powerful but not AI-native. Generic AI chat tools can draft or critique text, but they do not understand project structure, canon, document hierarchy, revision state, or writing workflow.

Seshat exists to bridge that gap.

## Problem Statement

Build a web-based long-form writing platform that combines Scrivener-style project organization with AI-assisted drafting, editing, summarization, critique, and continuity workflows, while keeping model usage cost-controlled through a centralized provider gateway.

## MVP Goal

The MVP proves that a user can create a writing project, organize documents in a binder, write safely in a rich-text editor, and use AI assistance without losing control of their manuscript or costs.

## Target User

Initial target:

- Solo writer.
- Self-hosted/personal use.
- Comfortable with web apps and AI tools.
- Needs structure for long-form writing.
- Wants AI assistance but not uncontrolled AI overwrite.

Future users:

- Editors.
- Coauthors.
- Writing groups.
- SaaS customers.

## MVP User Stories

### Project Management

As a writer, I want to create a project so I can separate manuscripts and writing worlds.

As a writer, I want to rename/archive/delete projects so my workspace stays clean.

### Binder

As a writer, I want a tree of folders and documents so I can organize chapters, scenes, notes, and research.

As a writer, I want to reorder documents so I can restructure the manuscript.

As a writer, I want document metadata so I can track status, label, synopsis, and word count.

### Editor

As a writer, I want a rich-text editor so I can write comfortably.

As a writer, I want autosave so my work is not lost.

As a writer, I want save status indicators so I know whether my writing is safe.

As a writer, I want snapshots so I can experiment without fear.

### AI Assistance

As a writer, I want to rewrite selected text so I can explore alternate phrasing.

As a writer, I want to continue a scene so I can break through momentum stalls.

As a writer, I want critique so I can understand weaknesses.

As a writer, I want summaries so I can compress context and track long documents.

As a writer, I want AI output staged before applying so my manuscript is never silently overwritten.

### Cost Control

As a user, I want to see which AI model was used so I know what happened.

As a user, I want token and cost estimates so I can avoid surprise spend.

As an operator, I want budget caps so the app cannot burn money accidentally.

## Functional Requirements

### P0/MVP

- User authentication.
- Project creation and management.
- Binder/tree document organization.
- Rich-text writing editor.
- Debounced autosave.
- Manual document snapshots.
- Automatic snapshot before accepted AI edit.
- Document metadata: title, type, status, label, synopsis, word count, sort order.
- AI rewrite selected text.
- AI continue current document/scene.
- AI summarize current document.
- AI critique selected text or document.
- AI suggestions staged before acceptance.
- AI run logging.
- AI usage/cost logging.
- Server-side provider key management.
- Basic cost dashboard.
- Docker Compose deployment skeleton.

### Post-MVP

- Project memory.
- Embeddings.
- Structured canon facts.
- Entity database.
- Timeline events.
- Continuity checking.
- Research file uploads.
- Compile/export.
- Comments.
- Collaboration.
- Public SaaS billing.

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| Editor UX | Typing must feel local and immediate. |
| Reliability | No lost writing. |
| AI failure | Writing must continue if AI providers fail. |
| Security | Manuscripts private by default. |
| Cost | AI spend visible and controllable. |
| Maintainability | Modular monolith with clear module boundaries. |
| Deployment | Self-hostable with Docker Compose. |
| Observability | Errors, AI usage, job failures, and backups must be visible. |

## Success Criteria

| Area | Success Criteria |
|---|---|
| Writing workflow | User can create projects, organize documents, write, and manage notes. |
| AI assistance | AI can rewrite, continue, summarize, and critique using relevant context. |
| Safety | User work is autosaved and protected by snapshots. |
| Cost | AI usage is routed through policy and logged. |
| Reliability | AI failure does not block editing. |
| Maintainability | New AI providers/models can be added without rewriting features. |

## Explicit Non-MVP

The MVP should not build:

- Multi-user collaboration.
- Realtime coediting.
- SaaS account billing.
- Mobile app.
- Native desktop app.
- Full research ingestion pipeline.
- Full canon engine.
- Timeline graph.
- Public sharing.
- Plugin system.
- Kubernetes deployment.

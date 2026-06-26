# ADR-0005: Hybrid Editor Storage

Status: Accepted  
Date: 2026-06-18

## Context

The editor needs rich structure, while AI/search/export need plain text. Storing only one representation causes friction.

## Decision

Store canonical editor state as ProseMirror/Tiptap JSON and maintain extracted plain text alongside it.

## Consequences

### Positive

- Rich editing remains lossless.
- Plain text supports search, summaries, word count, AI context, and export.
- Easier future retrieval pipeline.

### Negative / Trade-Offs

- Requires keeping plain text in sync.
- Migration needed if editor schema changes.

## Alternatives Considered

- Store Markdown only.
- Store HTML only.
- Store JSON only.

Rejected because each option weakens either editing fidelity or AI/search ergonomics.

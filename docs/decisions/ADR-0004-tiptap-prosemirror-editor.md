# ADR-0004: Tiptap / ProseMirror Editor

Status: Accepted  
Date: 2026-06-18

## Context

The product needs rich-text editing, structured document state, selection-aware commands, and AI-assisted transformations.

Markdown-only editing is simpler but weaker for structured rich text and selection-safe operations.

## Decision

Use Tiptap on ProseMirror as the P0 editor foundation.

## Consequences

### Positive

- Mature editor framework.
- Structured JSON document model.
- Good extension system.
- Selection and transform support.
- Suitable for staged AI edits.

### Negative / Trade-Offs

- More complex than plain textarea/Markdown.
- Requires careful schema/version handling.
- Export pipeline becomes a later concern.

## Alternatives Considered

- Markdown editor.
- Plain textarea.
- Slate.
- Lexical.

Rejected for P0 because Tiptap/ProseMirror best matches Scrivener-like rich editing plus structured transformations.

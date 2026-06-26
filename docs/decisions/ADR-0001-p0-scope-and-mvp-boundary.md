# ADR-0001: P0 Scope and MVP Boundary

Status: Accepted  
Date: 2026-06-18

## Context

The product vision is large: a Scrivener-like writing studio with AI assistance, memory, continuity checking, research, exports, and eventually collaboration.

Without a hard boundary, the first build will sprawl.

## Decision

P0 defines decisions and structure only. The first MVP must focus on the core writing loop: projects, binder, editor, autosave, snapshots, staged AI assistance, and usage logging.

Canon memory, continuity checking, research ingestion, exports, collaboration, and SaaS billing are post-MVP.

## Consequences

### Positive

- Clear first implementation target.
- Prevents architecture from becoming performance art.
- Keeps reliability and writing safety central.

### Negative / Trade-Offs

- Some exciting differentiators are delayed.
- Early product may feel less magical than the full vision.

## Alternatives Considered

- Build the full AI memory system first.
- Start with continuity checking first.
- Build a generic AI chat app first.

Rejected because all three delay the actual writing environment.

# ADR-0014: Memory and Continuity Post-MVP

Status: Accepted  
Date: 2026-06-18

## Context

Project memory and continuity checking are major differentiators, but they depend on stable documents, summaries, AI gateway, and usage policies.

## Decision

Do not build full memory/continuity in P0/MVP. Design database and module boundaries so memory can be added after core writing and AI assistance work.

## Consequences

### Positive

- Keeps first build achievable.
- Ensures memory builds on reliable source data.
- Avoids premature vector complexity.

### Negative / Trade-Offs

- Differentiator is delayed.
- Early AI context is limited.

## Alternatives Considered

- Build memory first.
- Use full manuscript context in every prompt.

Rejected due to cost, complexity, and reliability risk.

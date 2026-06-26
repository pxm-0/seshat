# ADR-0009: Staged AI Edits

Status: Accepted  
Date: 2026-06-18

## Context

AI assistance can damage manuscripts if it silently overwrites text. Writers need control and recoverability.

## Decision

AI outputs are staged as suggestions. User must explicitly accept or reject. Accepted edits create snapshots before applying changes.

## Consequences

### Positive

- Protects manuscript integrity.
- Builds trust.
- Enables experimentation.
- Makes AI behavior auditable.

### Negative / Trade-Offs

- More UI complexity.
- Slower than direct apply.
- Requires patch/suggestion model.

## Alternatives Considered

- Direct overwrite.
- AI edits in separate duplicate document only.

Rejected because direct overwrite is unsafe, and duplicate-only workflows become clunky.

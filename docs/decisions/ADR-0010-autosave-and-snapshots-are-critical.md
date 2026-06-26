# ADR-0010: Autosave and Snapshots Are Critical

Status: Accepted  
Date: 2026-06-18

## Context

The worst failure mode for a writing app is lost writing. AI features are meaningless if persistence is unreliable.

## Decision

Autosave, save status, manual snapshots, and pre-AI snapshots are P0-critical.

## Consequences

### Positive

- User trust.
- Safe experimentation.
- Recovery from bad edits and crashes.
- Foundation for version history.

### Negative / Trade-Offs

- More implementation work before flashy AI.
- Requires careful conflict handling.

## Alternatives Considered

- Manual save only.
- Version history later.

Rejected because losing writing kills the product.

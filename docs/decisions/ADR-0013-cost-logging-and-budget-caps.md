# ADR-0013: Cost Logging and Budget Caps

Status: Accepted  
Date: 2026-06-18

## Context

AI usage can create surprise spend. A writing tool may perform many small operations and future background jobs.

## Decision

Every AI run must be logged with token/cost metadata. P0 must support budget caps and confirmation thresholds.

## Consequences

### Positive

- Prevents accidental spend.
- Makes model choice visible.
- Enables later analytics.
- Supports project-level accountability.

### Negative / Trade-Offs

- Requires usage plumbing early.
- Cost estimates may differ from final provider billing.

## Alternatives Considered

- Add cost tracking later.
- Trust provider dashboard only.

Rejected because cost is a core constraint.

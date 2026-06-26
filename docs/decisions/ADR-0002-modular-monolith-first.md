# ADR-0002: Modular Monolith First

Status: Accepted  
Date: 2026-06-18

## Context

The app will run on a personal Ubuntu server with limited operational appetite. Microservices would create deployment, networking, debugging, and observability overhead before there is product complexity to justify them.

## Decision

Use a modular monolith with clear internal module boundaries and a separate background worker.

## Consequences

### Positive

- Faster MVP.
- Easier deployment.
- Easier debugging.
- Lower resource usage.
- Still allows extraction later if module boundaries remain clean.

### Negative / Trade-Offs

- Individual modules cannot scale independently early.
- Requires discipline to avoid a tangled monolith.

## Alternatives Considered

- Microservices from day one.
- Serverless architecture.
- Separate AI service.

Rejected for P0 due to operational overhead.

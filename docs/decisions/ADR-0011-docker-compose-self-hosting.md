# ADR-0011: Docker Compose Self-Hosting

Status: Accepted  
Date: 2026-06-18

## Context

The app is initially intended for a personal Ubuntu server. Kubernetes/cloud-native complexity is unnecessary.

## Decision

Use Docker Compose with app, worker, postgres, redis, and Caddy.

## Consequences

### Positive

- Simple deployment.
- Low overhead.
- Fits personal server.
- Easy backup volume mapping.

### Negative / Trade-Offs

- Manual operations.
- Less scalable than orchestrators.
- Requires server maintenance.

## Alternatives Considered

- Kubernetes.
- Managed PaaS.
- Bare-metal manual process.

Docker Compose is the correct first operational shape.

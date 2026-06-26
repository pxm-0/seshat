# ADR-0008: OpenRouter-First Provider Gateway

Status: Accepted  
Date: 2026-06-18

## Context

The product needs AI assistance but should avoid hardcoding itself to one provider. Cost control and model routing need centralization.

## Decision

Route AI calls through a server-side provider gateway, initially using OpenRouter. Feature code calls internal AI tasks, not providers directly.

## Consequences

### Positive

- Provider flexibility.
- Server-side key protection.
- Centralized cost logging.
- Easier fallback policy.
- Easier model experimentation.

### Negative / Trade-Offs

- Dependency on OpenRouter availability.
- Provider-specific quirks still need normalization.
- Must keep pricing/model metadata current later.

## Alternatives Considered

- Direct OpenAI/Anthropic/Gemini calls in feature code.
- Browser-side calls.

Rejected because they weaken provider abstraction and key security.

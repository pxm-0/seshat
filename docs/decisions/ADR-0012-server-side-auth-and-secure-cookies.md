# ADR-0012: Server-Side Auth and Secure Cookies

Status: Accepted  
Date: 2026-06-18

## Context

The app protects private manuscripts and provider keys. Browser-side trust should be minimal.

## Decision

Use server-managed authentication with secure HTTP-only cookies. Enforce authorization on every project/document route.

## Consequences

### Positive

- Reduces token exposure.
- Works well for self-hosted web app.
- Clear server-side access control.

### Negative / Trade-Offs

- CSRF protection must be handled.
- Auth implementation still requires care.

## Alternatives Considered

- Local-only no-auth mode.
- Browser-managed JWT only.

Rejected for P0 because manuscripts and AI keys need a secure default.

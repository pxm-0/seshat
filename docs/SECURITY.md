# Security

## Security Goals

- Protect manuscripts.
- Keep provider API keys server-side.
- Enforce project authorization.
- Prevent uncontrolled AI cost abuse.
- Keep secrets out of git.
- Make self-hosted deployment reasonably safe.

## Threat Model

Primary risks:

- Provider API key exposure.
- Unauthorized access to manuscripts.
- CSRF on mutating endpoints.
- Excessive AI usage/cost spike.
- Uploaded research files containing malicious payloads later.
- Accidental public exposure through bad reverse proxy configuration.
- Data loss due to weak backup/security hygiene.

## Authentication

P0 should use session-based authentication with secure cookies.

Requirements:

- secure cookies in production
- HTTP-only cookies
- SameSite protection
- CSRF protection for mutating requests
- password hashing if using email/password auth
- optional OAuth later

## Authorization

Every project-scoped operation must verify:

```txt
authenticated user owns or has access to project
document belongs to project
AI run belongs to project/user
snapshot belongs to document/project
```

Never trust client-supplied `userId`.

## API Keys

OpenRouter key:

- stored server-side only
- read from environment or secrets file
- never sent to browser
- never logged
- never committed

## Manuscript Privacy

Manuscripts are private by default.

External AI disclosure must be explicit in future product UI:

```txt
AI features send selected/project text to configured external AI providers through the server-side gateway.
```

## Rate Limits

Rate limit:

- login attempts
- AI endpoints
- autosave bursts
- export endpoints later
- upload endpoints later

## Input Validation

Validate:

- project titles
- document titles
- document type enums
- editor JSON schema
- AI task types
- token limits
- file uploads later

## Audit Events

Audit:

- expensive AI operations
- project deletion/archive
- document restore
- snapshot restore
- failed auth attempts later
- provider errors

## CORS

Strict CORS.

For self-hosted web app, avoid broad wildcard CORS.

## Secrets Management

P0:

- `.env`
- `.env.example`
- production `.env` excluded from git

Future:

- Docker secrets
- SOPS
- managed secret store if deployed to cloud

## Backups and Security

Backups should be encrypted before leaving the server.

Secrets backup should be separate from database backup.

## Security Non-Goals for P0

- Enterprise compliance.
- SOC 2.
- Full audit dashboard.
- SAML.
- Fine-grained collaborative permissions.
- End-to-end encryption.

Do not design against enterprise threats before the personal self-hosted product exists.

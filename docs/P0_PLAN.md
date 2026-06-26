# P0 Plan

Date: 2026-06-18

## Purpose

P0 establishes the product and architecture decisions needed to build the first version of Seshat without drifting into fantasy architecture.

The system should begin as a small, disciplined modular monolith that can later grow into a larger writing platform.

## P0 Definition

P0 is complete when the repository contains:

- Product requirements for MVP.
- Architecture document.
- Data model document.
- API design document.
- AI model policy document.
- Security document.
- Cost engineering document.
- Deployment document.
- Backup/restore document.
- Observability document.
- Roadmap.
- ADRs for core decisions.
- Initial repo structure.
- Placeholder package boundaries.
- Docker Compose skeleton.
- `.env.example`.

## P0 Non-Goals

P0 does not include:

- Fully working web app.
- Database migrations.
- Implemented editor.
- Implemented auth.
- OpenRouter integration code.
- Production deployment.
- Real user data.
- Live AI calls.

## P0 Operating Principles

1. **Writing remains primary.** AI is an assistant, not the center of the product.
2. **No lost writing.** Persistence and version safety outrank flashy features.
3. **AI must be controllable.** The app decides model routing through policies.
4. **Cost must be visible.** Token and cost logging are first-class product primitives.
5. **Self-hosted first.** Avoid distributed complexity until the product earns it.
6. **Boundaries now, extraction later.** Keep modules clean without paying microservice tax.

## P0 Deliverables

| Deliverable    | File                           |
| -------------- | ------------------------------ |
| Product scope  | `docs/PRODUCT_REQUIREMENTS.md` |
| Architecture   | `docs/ARCHITECTURE.md`         |
| Data model     | `docs/DATA_MODEL.md`           |
| API design     | `docs/API_DESIGN.md`           |
| AI policy      | `docs/AI_MODEL_POLICY.md`      |
| Security       | `docs/SECURITY.md`             |
| Cost controls  | `docs/COST_ENGINEERING.md`     |
| Deployment     | `docs/DEPLOYMENT.md`           |
| Backup/restore | `docs/BACKUP_RESTORE.md`       |
| Observability  | `docs/OBSERVABILITY.md`        |
| Roadmap        | `docs/ROADMAP.md`              |
| Decisions      | `docs/decisions/*.md`          |

## P0 Exit Criteria

P0 is done when a developer can answer these questions without inventing architecture:

- What are we building first?
- What are we explicitly not building first?
- What is the stack?
- Where does data live?
- How do AI calls flow?
- How are AI edits applied safely?
- How do we avoid provider key exposure?
- How do we track cost?
- How do we deploy it?
- How do we recover from failure?

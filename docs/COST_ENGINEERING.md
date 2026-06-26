# Cost Engineering

## Goal

AI cost must be visible, controllable, and attributable.

The largest scaling risk is not CPU. It is accidental model spend.

## Cost Sources

- OpenRouter model calls.
- Embeddings later.
- Storage.
- Backups.
- Server electricity/internet.
- Domain/reverse proxy infrastructure.
- Optional monitoring tools.

## Required Cost Controls

### Per-Task Policies

Each AI task has:

- default model
- fallback model
- max input tokens
- max output tokens
- estimated cost threshold
- budget cap behavior

### Budget Caps

P0 should support at least config-level caps:

```txt
AI_DAILY_BUDGET_USD
AI_MONTHLY_BUDGET_USD
AI_CONFIRM_ABOVE_USD
```

Later, move caps into database per user/project.

### Token Limits

Each task must enforce maximums before provider call.

If context is too large:

- summarize/chunk later
- reject with clear error in P0
- do not blindly send entire project

### Confirmation Thresholds

Require explicit confirmation above configured estimated cost.

### Usage Records

Every AI call must record:

- task type
- provider
- model
- input tokens
- output tokens
- estimated cost
- status
- project
- document
- user

## Cost Reports

P0 report:

```txt
today cost
month cost
cost by task
cost by model
recent expensive runs
failed AI runs
```

Future reports:

```txt
accepted vs rejected suggestions
cost per project
cost per manuscript
background job cost
summary/cache savings
```

## Cost-Saving Design

- Use selected text and local context instead of entire project.
- Cache document summaries.
- Use cheaper models for background summaries.
- Use retrieval for context later.
- Avoid embeddings until project memory actually needs them.
- Batch low-priority jobs.
- Do not run continuity checks on every keystroke.

## Budget Failure Behavior

If budget exceeded:

- block new AI calls
- keep editor functional
- show reason
- allow operator override
- log attempted run as blocked

## Anti-Patterns

Do not:

- call AI directly from browser
- send entire manuscript for small rewrites
- run background AI loops without caps
- hide model choice
- hide cost
- apply expensive calls automatically

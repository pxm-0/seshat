# AI Model Policy

## Purpose

The AI model policy controls which models are used for each task, how much context they receive, max output size, fallback behavior, and cost controls.

Application features should not hardcode model names. They should request an AI task type.

## Core Rule

```txt
Feature -> AI Task -> Policy -> Context Builder -> Provider Adapter -> Usage Logger
```

## Provider Strategy

Initial provider gateway: OpenRouter.

Reason:

- one server-side API integration
- access to many models
- centralized routing
- easier cost tracking
- provider flexibility

The internal system must remain provider-agnostic.

## P0 Task Types

```txt
rewrite_selected_text
continue_document
summarize_document
critique_text
```

Post-MVP:

```txt
continuity_check
memory_extract
research_summarize
project_summary
entity_fact_extract
style_profile
```

## Policy Shape

```json
{
  "taskType": "rewrite_selected_text",
  "defaultModel": "configured/model",
  "fallbackModel": "configured/fallback",
  "maxInputTokens": 12000,
  "maxOutputTokens": 1200,
  "temperature": 0.7,
  "requiresConfirmationAboveEstimatedCostUsd": "0.05",
  "dailyBudgetUsd": "2.00",
  "monthlyBudgetUsd": "25.00"
}
```

## P0 Default Policy Table

Model names should be configured in environment or database. Do not hardcode them in feature code.

| Task                  |                                     Context |       Output | Cost Sensitivity | Notes                                                  |
| --------------------- | ------------------------------------------: | -----------: | ---------------- | ------------------------------------------------------ |
| Rewrite selected text | selection + local paragraph/chapter context | short/medium | medium           | Must preserve user intent unless instructed otherwise. |
| Continue document     |          active document excerpt + synopsis |       medium | medium/high      | Should be staged.                                      |
| Summarize document    |     full document if small, chunks if large | short/medium | low/medium       | Used later for retrieval.                              |
| Critique text         |                  selection/document excerpt |       medium | medium           | Should be analytical, not destructive.                 |

## Context Rules

P0 context builder may include:

- selected text
- active document title
- active document synopsis
- nearby document excerpt
- project title
- user instruction

Do not include entire project by default.

Future context builder may include:

- summaries
- relevant embeddings
- entity facts
- timeline events
- research snippets
- previous AI run notes

## AI Edit Safety

AI output must be staged.

Accepted AI edits require:

1. authorization check
2. current document fetch
3. snapshot creation
4. patch application
5. usage record finalization

## Cost Controls

Required:

- max input tokens
- max output tokens
- daily/monthly budget settings
- estimated cost before expensive operations
- user confirmation above threshold
- audit log for each run
- fallback model option

## Logging

Log per AI run:

```txt
user_id
project_id
document_id
task_type
provider
model
status
input_tokens
output_tokens
estimated_cost_usd
duration_ms
error_message
```

## Failure Behavior

If OpenRouter fails:

- do not block editor
- mark AI run failed
- expose error status
- allow retry
- optionally fallback to cheaper/alternate model if policy permits

## Prompt Contract

Each AI task should have a versioned prompt contract.

Example:

```txt
rewrite_selected_text.v1
continue_document.v1
summarize_document.v1
critique_text.v1
```

Prompt changes should be tracked because they change product behavior.

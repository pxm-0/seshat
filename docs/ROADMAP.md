# Roadmap

## P0: Decisions and Foundation

Output:

- repo structure
- docs
- ADRs
- deployment skeleton
- implementation plan

## P1: Working Writing Shell

Features:

- auth
- project dashboard
- project creation
- binder tree
- document CRUD
- Tiptap editor
- autosave
- word count

Exit:

- user can write and switch documents without losing work

## P2: Version Safety

Features:

- manual snapshots
- snapshot list
- restore snapshot
- automatic pre-AI snapshot infrastructure
- save conflict protection

Exit:

- user can safely experiment and recover

## P3: AI Assistance

Features:

- OpenRouter gateway
- model policy config
- rewrite selected text
- continue document
- summarize document
- critique text
- staged suggestion UI
- accept/reject
- AI usage logging

Exit:

- AI can assist without uncontrolled overwrite or invisible cost

## P4: Project Memory

Features:

- document summaries
- embeddings with pgvector
- retrieval context builder
- project memory facts
- entity extraction experiment

Exit:

- AI can use relevant project context beyond active document

## P5: Continuity / Canon

Features:

- entity database
- entity facts
- contradiction detection
- continuity check jobs
- canon review UI

Exit:

- app helps maintain internal consistency

## P6: Export / Compile

Features:

- compile manuscript order
- export markdown
- export docx/pdf later
- front/back matter
- format presets

Exit:

- user can produce a manuscript artifact

## P7: Research Ingestion

Features:

- upload research docs
- extract text
- summarize
- cite project research
- attach research to documents

Exit:

- app becomes a research-aware writing environment

## P8: Collaboration Later

Features:

- shared projects
- comments
- permissions
- invited editors
- realtime coediting only if justified

Exit:

- product can support multiple people without architecture collapse

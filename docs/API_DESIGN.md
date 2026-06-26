# API Design

## Style

Use REST-style endpoints for P0.

The API runtime is Fastify. Route handlers should be thin adapters over domain services from shared packages.

Streaming AI responses can use Server-Sent Events later. Async jobs can use polling first.

## Authentication

Cookie-based session auth is preferred for the self-hosted web app.

Security requirements:

- secure cookies in production
- CSRF protection for mutating endpoints
- project-level authorization checks
- server-side provider keys only

## Route Groups

```txt
/api/auth/*
/api/projects/*
/api/projects/:projectId/documents/*
/api/ai/*
/api/usage/*
```

## Project Endpoints

### Create Project

```http
POST /api/projects
```

Request:

```json
{
  "title": "Novel Draft",
  "description": "Optional"
}
```

Response:

```json
{
  "id": "project_id",
  "title": "Novel Draft"
}
```

### List Projects

```http
GET /api/projects
```

### Get Project

```http
GET /api/projects/:projectId
```

### Update Project

```http
PATCH /api/projects/:projectId
```

### Archive Project

```http
POST /api/projects/:projectId/archive
```

## Document Endpoints

### Get Binder Tree

```http
GET /api/projects/:projectId/documents/tree
```

### Create Document

```http
POST /api/projects/:projectId/documents
```

Request:

```json
{
  "parentId": null,
  "type": "manuscript",
  "title": "Chapter 1"
}
```

### Get Document

```http
GET /api/projects/:projectId/documents/:documentId
```

### Save Document

```http
PATCH /api/projects/:projectId/documents/:documentId
```

Request:

```json
{
  "editorJson": {},
  "plainText": "Extracted text",
  "synopsis": "Optional synopsis",
  "status": "draft",
  "label": "chapter"
}
```

### Reorder Documents

```http
POST /api/projects/:projectId/documents/reorder
```

Request:

```json
{
  "moves": [
    {
      "documentId": "doc_id",
      "parentId": "new_parent_id",
      "sortOrder": 20
    }
  ]
}
```

## Snapshot Endpoints

### Create Snapshot

```http
POST /api/projects/:projectId/documents/:documentId/snapshots
```

Request:

```json
{
  "reason": "manual",
  "title": "Before restructuring chapter"
}
```

### List Snapshots

```http
GET /api/projects/:projectId/documents/:documentId/snapshots
```

### Restore Snapshot

```http
POST /api/projects/:projectId/documents/:documentId/snapshots/:snapshotId/restore
```

## AI Endpoints

### Start AI Task

```http
POST /api/ai/runs
```

Request:

```json
{
  "projectId": "project_id",
  "documentId": "document_id",
  "taskType": "rewrite",
  "selection": {
    "text": "Selected text",
    "from": 100,
    "to": 240
  },
  "instructions": "Make it sharper and less verbose."
}
```

Response:

```json
{
  "aiRunId": "run_id",
  "status": "queued"
}
```

For sync MVP, this may return the result directly:

```json
{
  "aiRunId": "run_id",
  "status": "succeeded",
  "suggestion": {
    "text": "Rewritten text"
  },
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 300,
    "estimatedCostUsd": "0.0012"
  }
}
```

### Get AI Run

```http
GET /api/ai/runs/:aiRunId
```

### Accept AI Suggestion

```http
POST /api/ai/runs/:aiRunId/accept
```

Request:

```json
{
  "documentId": "document_id",
  "patch": {
    "type": "replace_selection",
    "from": 100,
    "to": 240,
    "text": "Accepted suggestion"
  }
}
```

Server behavior:

1. Validate ownership.
2. Create snapshot with reason `before_ai_apply`.
3. Apply patch.
4. Save document.
5. Mark run accepted.

### Reject AI Suggestion

```http
POST /api/ai/runs/:aiRunId/reject
```

## Usage Endpoints

### Project Usage Summary

```http
GET /api/projects/:projectId/usage
```

Response:

```json
{
  "dailyCostUsd": "0.42",
  "monthlyCostUsd": "3.17",
  "byTask": [],
  "byModel": []
}
```

## Error Shape

All API errors should follow:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found."
  }
}
```

## Authorization Rule

Every project/document/AI endpoint must derive access through the authenticated user.

Never trust `userId` from the client.

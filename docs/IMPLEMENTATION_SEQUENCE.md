# Implementation Sequence

## Step 1: Repo Bootstrap

- package manager
- TypeScript config
- linting/formatting
- Next.js app
- shared packages
- Docker Compose sanity check

## Step 2: Database

- Postgres connection
- migration tool
- users/projects/documents tables
- seed user for local dev if needed

## Step 3: Auth

- login/logout
- session cookie
- route protection
- project ownership checks

## Step 4: Projects and Binder

- create project
- list projects
- create document/folder
- render binder tree
- reorder documents

## Step 5: Editor

- Tiptap integration
- load/save document
- autosave
- save status
- plain text extraction
- word count

## Step 6: Snapshots

- manual snapshot
- list snapshots
- restore snapshot
- snapshot before AI apply

## Step 7: AI Gateway

- OpenRouter adapter
- task policy config
- AI runs table
- usage events
- rewrite selected text
- summarize document
- critique text
- continue document

## Step 8: AI Suggestion UI

- staged output
- accept/reject
- patch selected text
- snapshot before apply
- log acceptance state

## Step 9: Cost Dashboard

- today/month usage
- by model
- by task
- budget exceeded behavior

## Step 10: Hardening

- backup script
- health checks
- rate limits
- structured logs
- deployment notes

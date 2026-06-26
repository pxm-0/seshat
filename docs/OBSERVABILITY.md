# Observability

## Goal

The system should make failures visible before they become data loss or cost surprises.

## What to Track

### App

- request errors
- API latency
- auth failures
- project/document access errors
- autosave failures
- editor save latency

### AI

- AI runs by status
- provider errors
- model latency
- token usage
- estimated cost
- budget blocks
- expensive runs
- rejected/accepted suggestions later

### Worker

- queue depth
- failed jobs
- retry count
- stalled jobs
- job duration

### Database

- database size
- slow queries
- backup success/failure
- connection count

### Server

- disk usage
- memory
- CPU
- container restarts
- uptime

## P0 Tools

Lightweight self-hosted tools:

- Docker logs
- structured JSON logging
- Uptime Kuma for uptime
- Beszel or similar for server metrics
- Sentry later for app errors

## Required Logs

Each request log should include:

```txt
request_id
user_id where available
route
status
duration_ms
```

Each AI run log should include:

```txt
ai_run_id
project_id
task_type
provider
model
status
duration_ms
estimated_cost_usd
error_code
```

## Alerts

P0 alert candidates:

- app down
- disk usage above threshold
- backup failed
- AI daily budget exceeded
- repeated autosave failures
- worker queue stuck

## Dashboard

Minimum dashboard:

```txt
app status
worker status
Postgres status
Redis status
AI spend today
AI spend this month
failed AI runs
latest backup time
disk usage
```

# Deployment

## Target

Initial deployment target:

- Personal Ubuntu server.
- Docker Compose.
- Caddy reverse proxy.
- Postgres.
- Redis.
- Web container.
- API container.
- Worker container.

## P0 Services

```txt
caddy
web
api
worker
postgres
redis
```

Optional later:

```txt
minio
monitoring
log viewer
backup sidecar
```

## Environment

Required environment variables:

```txt
DATABASE_URL
REDIS_URL
SESSION_SECRET
OPENROUTER_API_KEY
OPENROUTER_BASE_URL
AI_DAILY_BUDGET_USD
AI_MONTHLY_BUDGET_USD
AI_CONFIRM_ABOVE_USD
APP_URL
```

## Docker Compose

The included `docker-compose.yml` is a P0 skeleton. It is not guaranteed production-ready until implementation exists.

## Deployment Flow

MVP manual flow:

```txt
git pull
cp .env.example .env
edit .env
docker compose pull
docker compose build
docker compose up -d
docker compose logs -f
```

Later:

```txt
GitHub Actions
build image
push image
server pulls image
run migrations
restart web/api/worker
```

## Reverse Proxy

Caddy handles:

- TLS
- HTTPS redirect
- reverse proxy to web
- reverse proxy `/api/*` to api
- optional compression

## Volumes

Required persistent volumes:

```txt
postgres_data
redis_data maybe
uploads later
exports later
backups
```

## Migrations

Database migrations should run:

- manually during early MVP, or
- as a release step before app boot

Avoid automatic destructive migrations on app startup.

## Health Checks

Required eventually:

- web health endpoint
- api health endpoint
- worker health heartbeat
- Postgres health
- Redis health

## Rollback

P0 rollback strategy:

1. Stop web/API/worker.
2. Restore previous image/tag or git commit.
3. Restore database only if migration requires it.
4. Restart web/API/worker.

## Production Hardening Later

- Non-root containers.
- Image tags, not latest.
- Automated backups.
- Restore tests.
- Uptime monitoring.
- Log rotation.
- Firewall.
- Fail2ban if exposed.
- Regular OS patching.

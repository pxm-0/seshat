# Backup and Restore

## Goal

No lost writing.

Backups are a product feature, not an ops afterthought.

## What to Back Up

P0:

- Postgres database.
- `.env` / secrets separately.
- deployment config.

Later:

- uploaded research files.
- exports.
- object storage.
- generated attachments.

## Backup Schedule

Recommended minimum:

```txt
daily database backup
weekly off-server backup
monthly retained snapshot
```

Recommended retention:

```txt
7 daily
4 weekly
3 monthly
```

## Backup Tooling

Good candidates:

- pg_dump for database dumps
- Restic for encrypted backup snapshots
- Borg as alternative
- cron/systemd timer

## Backup Requirements

Backups should be:

- encrypted
- stored off-server
- restorable
- periodically tested
- monitored

## Restore Runbook

### Restore Database

```txt
1. Stop app and worker.
2. Verify target backup.
3. Restore Postgres dump.
4. Run migrations if required.
5. Start app.
6. Verify project/document access.
7. Verify recent snapshots.
```

### Restore Config

```txt
1. Restore `.env` from secure backup.
2. Verify secrets permissions.
3. Restart services.
```

## Restore Test

At least monthly:

```txt
restore latest backup into temporary database
boot app against temporary database
open sample project
open sample document
verify snapshots
```

## Failure Scenarios

| Failure | Recovery |
|---|---|
| Accidental document overwrite | Restore document snapshot. |
| Bad AI edit | Restore pre-AI snapshot. |
| Database corruption | Restore Postgres backup. |
| Server disk failure | Rebuild server, restore database/config/files. |
| Secret leak | Rotate provider/session secrets. |

## Non-Negotiable

Before AI edits can be accepted, snapshot creation must work.

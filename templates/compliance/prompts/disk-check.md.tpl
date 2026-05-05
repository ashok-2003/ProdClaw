# COMPLIANCE CHECK: disk-check

## Scope
Monitor disk usage, LanceDB size, and backup directory growth.

## Steps

```
1. Overall disk usage:
   exec: df -h {{USER_HOME}}/
   → Extract use% for the partition
   → Flag if use% > 80%

2. LanceDB database size:
   exec: du -sh {{OPENCLAW_HOME}}/memory/lancedb-pro/
   → Note total size

3. Backup directory size:
   exec: du -sh {{OPENCLAW_HOME}}/compliance/compliance-backup/
   → Note total size
   → Flag if > 500MB

4. Top disk consumers (context only):
   exec: du -sh {{OPENCLAW_HOME}}/*/
   → List top 3 directories by size
```

## Output

Plain text only. No JSON.

- PASS → `disk-check — disk usage, LanceDB, backup size
  Result — PASS
  Output — disk [N]% used, lancedb [size], backup [size]`
- FAIL → `disk-check — disk usage, LanceDB, backup size
  Result — FAIL
  Output:
  - disk: [N]% used — exceeds 80% threshold
  - backup: [size] — exceeds 500MB threshold`

Keep it short. No raw tool output.

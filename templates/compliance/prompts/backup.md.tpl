# COMPLIANCE CHECK: backup

## Scope
Snapshot all agent injected files into versioned backups.

## File locations

- main: `{{OPENCLAW_HOME}}/workspace/`
- consultant: `{{OPENCLAW_HOME}}/workspace-consultant/`
- compliance: `{{OPENCLAW_HOME}}/workspace-compliance/`

## Steps

```
1. Base backup dir: {{OPENCLAW_HOME}}/compliance/compliance-backup/
2. For each agent: source=workspace path, target=compliance-backup/agents/<agent>/
3. Files to backup: SOUL.md, IDENTITY.md, AGENTS.md, USER.md, HEARTBEAT.md, TOOLS.md, BOOTSTRAP.md
4. Version management:
   - Next version N = (highest existing N) + 1
   - If 5+ versions exist → delete oldest
   - Copy all files into target/<agent>/v<N>/
5. If any source file missing → report in missing[]
6. If any copy fails → report in errors[]
```

## Output

Plain text only. No JSON.

- PASS → `backup — agent workspace file snapshots
  Result — PASS
  Output — all healthy, [agent] v[N], [agent] v[N], [agent] v[N]`
- FAIL → `backup — agent workspace file snapshots
  Result — FAIL
  Output:
  - missing: [files]
  - errors: [details]`

Keep it short. No raw tool output.

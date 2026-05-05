# COMPLIANCE CHECK: subagent-audit

## Scope
Audit sessions from the last 24 hours for errors, resource anomalies, and task drift.

## Steps

```
1. sessions_list — last 24 hours only
   → If 0 sessions → report "no sessions in last 24h" and stop

2. Errors — report separately:
   Any session where status=error → report with session key, model, error reason

3. Resource anomalies — report separately:
   Flag sessions exceeding: totalTokens > 100000 OR runtime > 400s
   Report: session key, model, tokens, runtime

4. Task drift detection:
   Read {{OPENCLAW_HOME}}/cron/jobs.json → get timeoutSeconds per cron job
   For each cron session: if runtime > 2x that job's configured timeoutSeconds → flag
   Reason: cron job ran far longer than its defined scope allows — possible scope expansion
```

## Output

Plain text only. No JSON.

- PASS → `subagent-audit — session errors, resource anomalies, task drift
  Result — PASS
  Output — all healthy, [N] sessions audited, no anomalies`
- FAIL → `subagent-audit — session errors, resource anomalies, task drift
  Result — FAIL
  Errors:
  - [session key] ([model]): [error reason]
  Resource anomalies:
  - [session key] ([model]): tokens [N], runtime [N]s
  Task drift:
  - [session key] ([job name]): runtime [N]s vs configured [N]s timeout`

Keep it short. No raw tool output.

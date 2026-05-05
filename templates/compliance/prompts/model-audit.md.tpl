# COMPLIANCE CHECK: model-audit

## Scope
Verify sessions used their configured model or a listed fallback — not an unexpected model.

## Steps

```
1. Read {{OPENCLAW_HOME}}/openclaw.json
   → Extract primary model per agent (for interactive sessions)

2. Read {{OPENCLAW_HOME}}/cron/jobs.json
   → Extract model + fallbacks[] per cron job (for cron sessions)

3. sessions_list — last 24 hours only
   → If 0 sessions found → report "no sessions in last 24h, nothing to audit" and stop

4. For each session:
   a. Determine if it is a cron session (match by agent/session key to jobs.json)
      or an interactive session (main or consultant)
   b. Cron session: expected = that job's model + that job's fallbacks[]
      Interactive session: expected = openclaw.json primary + fallbacks for that agent
   c. If actual model is NOT in the expected set → flag as mismatch
      Intentional fallbacks are NOT mismatches — only flag truly unexpected models
```

## Output

Plain text only. No JSON.

- PASS → `model-audit — session model vs config
  Result — PASS
  Output — all healthy, [N] sessions audited, all within expected model set`
- FAIL → `model-audit — session model vs config
  Result — FAIL
  Output:
  - [session key]: expected [model or fallback set], actual [model] — unexpected`

Keep it short. No raw tool output.

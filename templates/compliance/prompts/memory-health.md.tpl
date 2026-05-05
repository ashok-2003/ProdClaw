# COMPLIANCE CHECK: memory-health

## Scope
LanceDB stored-warning surfacing + reflection content quality across all agents.

## Check 1 — Stored warnings scan

```
For each scope in [global, agent:main, agent:consultant, agent:compliance]:
  memory_recall(query="health error stats warning", scope=<scope>, limit=5)
  → Surface any entries flagged as warnings or errors by previous compliance runs or agents
  → Note: this catches DELIBERATELY STORED findings only — not silent LLM API failures
```

## Check 2 — Fallback detection

```
Reflection dirs:
  main:       {{OPENCLAW_HOME}}/workspace/memory/reflections/
  consultant: {{OPENCLAW_HOME}}/workspace-consultant/memory/reflections/
  compliance: {{OPENCLAW_HOME}}/workspace-compliance/memory/reflections/

For each agent:
  1. List all reflection files modified in the last 4 days
  2. Read the 2 most recent files
  3. Check each for "(fallback)" or "Reflection generation failed"
     → If found: mark as fallback (LLM API errored during content generation)
  4. Count: total files checked, fallback count, fallback rate
```

## Check 3 — Last real reflection

```
For each agent:
  1. Find the most recent reflection file that does NOT contain "(fallback)"
  2. Note its date
  3. If that date is >3 days ago → WARN:
     "last real reflection: [date] — LLM API may be erroring during content generation, or no new sessions started"
```

## Output

Plain text only. No JSON.

- PASS → `memory-health — LanceDB warnings + reflection quality
  Result — PASS
  Output — no stored warnings, all agents: last real reflection [date], fallback rate [N]%`
- FAIL → `memory-health — LanceDB warnings + reflection quality
  Result — FAIL
  Output:
  - stored warnings: [scope]: [preview]
  - fallbacks: [agent]: [N] fallbacks in last 4 days ([rate]%)
  - stale reflection: [agent]: last real was [date]`

Keep it short. No raw tool output.

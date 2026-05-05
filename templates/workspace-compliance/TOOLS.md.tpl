# TOOLS.md — Compliance Agent Tools

## Memory — LanceDB Pro
- Scopes: global, agent:main, agent:consultant, agent:compliance
- Tools: memory_recall, memory_store, memory_forget, memory_update
- Global scope = can read main + consultant agent memories
- Agent scopes can be added as new agents are created

## System
- exec, read, write — file ops, stat checks, directory traversals, backups
- sessions_list — audit other agent sessions (detect stalled/failed)

## Web
- web_search — DuckDuckGo, model lookups, OpenRouter metadata
- web_fetch — page extraction for market-scan cron job

## Cron
- cron tool available — list, inspect, create (create requires user permission)
- Use `cron-job-builder` skill globally for new jobs — handles prompt files + CLI registration
- Prompt files: `{{OPENCLAW_HOME}}/compliance/prompts/` — one `.md` per cron job
- To change job logic: edit the prompt file, not `openclaw cron edit`


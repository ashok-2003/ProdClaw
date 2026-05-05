# TOOLS.md — Consultant Environment

---

## Plugins

**memory-lancedb-pro** (primary memory) — usage rules in AGENTS.md §Memory
- Tools: `memory_store`, `memory_recall`, `memory_forget`, `memory_update`
- Shared access: global + agent:main + agent:consultant scopes

**duckduckgo** (web search)
- Tool: `web_search` — free, rate-limited under heavy use

**browser** (web content extraction)
- Tool: `web_fetch` — extract readable content from URLs

**diffs** (visual diff tool)
- Tool: `diffs` — produce shareable diffs

---

## Models

Trust `openclaw.json` defaults. Council role→model mapping in `roles.json`. Broken model discoveries → `memory_store` (category: fact, importance: 0.85).

---

## Environment

- No SSH, devices, TTS, or cameras
- No system config access

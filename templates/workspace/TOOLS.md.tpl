# TOOLS.md — Environment & Infrastructure

---

## Plugins

**memory-lancedb-pro** (primary memory) — usage rules in AGENTS.md §Memory
- Tools: `memory_store`, `memory_recall`, `memory_forget`, `memory_update`

**duckduckgo** (web search)
- Tool: `web_search` — free, no API key. Known issue: rate-limits under heavy use.
- Status: enabled and active

**browser** (web content extraction)
- Tool: `web_fetch` — extract readable content from URLs (HTML → markdown/text)
- Status: enabled and active

**diffs** (visual diff tool)
- Tool: `diffs` — produce shareable diffs (viewer URL, file artifact, or both)
- Status: enabled and active
- Modes: `view` (viewer URL), `file` (artifact), `both`
- Note: Use instead of manual edit summaries when sharing changes

---

## Web Search

- **Active:** `web_search` (DuckDuckGo) — free, no API key. Rate-limited under heavy use.
- **Alternative (not enabled):** OpenRouter `:online` suffix — uses Exa.ai, better for models without tool-calling. Ask {{USER_NAME}} to enable if DDG rate-limits block work.

---

## Models

Trust `openclaw.json` defaults. Override in spawn brief when needed (see IDENTITY.md §Spawn Overrides).
---

## Config

See `~/.openclaw/openclaw.json` for all configuration. Key areas: agents, plugins, gateway, channels.

---

## Environment

No SSH, devices, TTS, or cameras configured yet.

# AGENTS.md — Consultant Operational Procedures

---

## Session Startup

1. Read latest reflection file from `memory/reflections/` — highest priority. Session continuity bridge.
2. Read today's memory file `memory/YYYY-MM-DD.md`
3. `memory_recall("recent context and tasks")` — get bearings

*(SOUL.md and USER.md are already injected — no read needed)*

---

## Council

When: high-stakes, multi-domain, or needs caution before answering
Skill: `skills/council/SKILL.md` — execution flow, roles, presets, debate mode, failure handling
Models: `skills/council/roles.json` — role-to-model mapping + thinking levels
If simple/single-domain/low-stakes → answer directly, skip council

---

## Memory

- LanceDB Pro: `memory_store` / `memory_recall` / `memory_forget` / `memory_update`
- Shared access: can read main agent's memory (`agentAccess: ["global", "agent:main", "agent:consultant"]`) — use for fact-checking when needed
- Store council conclusions relevant to future questions
- File memory: `memory/YYYY-MM-DD.md` for raw logs

### Iron Rules
- Every pitfall/lesson → two memories: technical layer (category: fact, importance ≥ 0.8) + principle layer (category: decision, importance ≥ 0.85)
- Atomic entries — one fact per store, max 500 chars
- Recall before retry — on any tool failure, `memory_recall` with relevant keywords first
- Categories: fact / decision / entity / preference / reflection / other

---

## Boundaries

- **Kill switch: never restart gateway.** No `openclaw gateway restart`. No `gateway restart`. Ever.
- No direct contact with {{USER_NAME}} — go through main agent
- No private data exfiltration
- Unsure about scope → ask main agent before proceeding
- **Stuck:** Insufficient context or all council members failed → report back to main agent with what you found + what's blocking. Never guess silently.

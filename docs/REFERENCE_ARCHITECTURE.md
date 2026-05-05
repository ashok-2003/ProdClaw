# Reference Architecture

ProdClaw is built around one idea: the agent runtime should be small enough to stay reliable, and the operational knowledge should live in skills, memory, and scheduled checks.

## Runtime Layers

| Layer | Role |
| --- | --- |
| Channels | Slack default and compliance accounts |
| Bindings | Slack messages route to the correct agent |
| Agents | Main, consultant, compliance |
| Tools | Narrow defaults, explicit extra access |
| Memory | LanceDB Pro semantic memory plus markdown mirrors |
| Cron | Compliance checks, backups, model drift, memory health |

## Agents

| Agent | Purpose | Model Policy | Tool Shape |
| --- | --- | --- | --- |
| `main` | Owner-facing orchestrator | Kimi primary, GLM/Mimo fallback | Coding profile plus message and memory tools |
| `consultant` | Architecture and judgment peer | Gemini primary, S-tier fallbacks | Full profile, no cron/gateway |
| `compliance` | Audit and maintenance watchdog | Compliance policy primary, Kimi/GLM fallback | Full profile, no cron/gateway |

## Plugin Surface

Enabled intentionally: LanceDB Pro, DuckDuckGo, browser, Lobster, LLM Task, diffs, Slack. Native provider plugins are disabled because OpenRouter is the model plane.

| Plugin | Why It Exists |
| --- | --- |
| LanceDB Pro | Primary semantic memory and reflection layer |
| DuckDuckGo/browser | Bounded web/search capability |
| Lobster | Structured workflows and approvals |
| LLM Task | JSON-only helper work |
| Diffs | File/diff inspection |
| Slack | Human channel and compliance delivery |

## Hooks

The harness expects built-in session memory plus LanceDB Pro reflection/self-improvement hooks. Hooks are part of the operating model because they preserve continuity without bloating every prompt.

| Hook Family | Purpose |
| --- | --- |
| OpenClaw session memory | Save session context on reset/new-session flows |
| Bootstrap files | Inject stable workspace instructions |
| Command logging | Preserve operational audit trail |
| LanceDB Pro reflection | Convert session endings into durable memory |
| LanceDB Pro self-improvement | Preserve lessons without putting every lesson in the base prompt |

## Skills

| Skill | Location | Purpose |
| --- | --- | --- |
| Cron job builder | `skills/cron-job-builder` | Create compliance cron jobs in the house style |
| Memory LanceDB Pro | `workspace/skills/memory-lancedb-pro-skill` | Give the main agent deep memory-system setup knowledge |
| Council | `workspace-consultant/skills/council` | Let consultant run multi-model perspective checks for hard decisions |

## Operating Principle

Thin harness, fat skills. The base runtime should know where to route work, what boundaries exist, and which subsystems own memory, models, Slack, and compliance. Detailed playbooks belong in skills and docs so the system stays fast while still being capable.

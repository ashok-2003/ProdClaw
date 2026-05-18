# Operations

## Daily Shape

The owner works through `main`. High-stakes judgment routes to `consultant`. Scheduled checks run through `compliance`.

## Inspect and Configure

`prodclaw inspect` is a read-only local detection command. It should not write to the live OpenClaw home.

Current inspect scope:

- detect OpenClaw home from `--home`, `OPENCLAW_HOME`, then `~/.openclaw`;
- detect timezone from the local runtime;
- detect OpenClaw config files when present;
- detect OpenClaw version when available;
- detect whether OpenRouter appears configured without printing secrets;
- detect Slack accounts when present in config;
- detect compliance Slack, main Slack, and Slack member ID signals;
- detect detailed LanceDB Pro state;
- detect cron config and compliance cron job count;
- detect local skills directory count;
- report gateway status only as a lightweight signal.

`prodclaw configure` is non-destructive in this pass. It summarizes missing required inputs and does not write to the live OpenClaw home.

Current configure scope:

- report owner name as still needing confirmation unless supplied by profile/flag;
- ask for OpenRouter only when not detected;
- ask for compliance Slack app/bot tokens only when compliance Slack is not detected;
- ask for Slack member ID only when not detected;
- keep main Slack optional;
- report LanceDB Pro as required when missing, disabled, or not bound;
- recommend render flags or local profile values until interactive configure lands.

Deferred work:

- interactive configure prompts;
- staged config persistence;
- OpenClaw CLI-based cron and agent registration, tracked in #24.

## OpenClaw CLI Registration Convention

ProdClaw should prefer OpenClaw's public CLI for OpenClaw-owned runtime registration when the required commands exist.

Use file writes for ProdClaw-owned static assets:

- compliance prompt files;
- workspace instruction files;
- consultant and compliance workspace files;
- ProdClaw-owned skills;
- rendered desired-state manifests for review and validation.

Prefer OpenClaw CLI commands for runtime objects:

- cron registration;
- cron listing and verification;
- cron one-off smoke runs after explicit approval;
- agent registration;
- agent listing and binding verification.

Current implementation scope:

- doctor probes whether OpenClaw CLI help is available;
- doctor probes whether cron and agents command groups appear available;
- doctor probes whether cron add/list/run and agents add/list/bind commands appear available;
- probe output is read-only and does not mutate the OpenClaw home;
- current render/apply/enable-cron behavior remains file-based fallback until exact OpenClaw command syntax is confirmed.

Deferred CLI registration work:

- switch cron registration from direct cron-file writes to OpenClaw CLI when exact command syntax is confirmed;
- switch agent registration/binding to OpenClaw CLI when exact command syntax is confirmed;
- make `diff` show intended runtime registration actions before executing them;
- make `apply` write static files before registering runtime objects that reference those files;
- document any direct runtime-file fallback when no supported CLI command exists.

Do not invent `openclaw cron add` or `openclaw agents add` flags. Confirm current OpenClaw command syntax first, then implement registration.

## Doctor Preflight

`prodclaw doctor` answers whether the current setup looks safe enough to continue, using `READY`, `WARN`, and `BROKEN` output.

Current doctor scope is local-only and read-only:

- checks OpenClaw home exists;
- checks OpenClaw config is readable;
- checks OpenClaw version when available;
- reports OpenClaw CLI registration command availability where detectable;
- checks OpenRouter key/config signal without printing secrets;
- checks LanceDB Pro config state;
- checks compliance Slack account presence;
- checks compliance Slack app/bot token presence without printing token values;
- checks Slack member ID shape when available;
- checks cron config presence;
- checks whether ProdClaw/compliance cron jobs exist;
- warns if ProdClaw/compliance cron jobs appear enabled before smoke tests;
- checks rendered directory presence;
- checks backup parent writability;
- exits non-zero when required pieces are `BROKEN`.

Deferred doctor smoke tests:

- OpenRouter model reachability check;
- LanceDB Pro memory store/recall check;
- compliance Slack DM delivery check;
- gateway/pairing verification;
- cron enablement gate based on successful smoke tests.

Doctor must not mutate the live OpenClaw home. It must not restart the gateway, enable cron, install plugins, or print raw secrets.

## Validation Policy

`prodclaw validate` enforces v1 rendered policy before apply.

Current validation scope:

- required rendered files exist;
- compliance Slack is required;
- main/default Slack is optional, but strict if present;
- Telegram is disabled;
- LanceDB Pro is selected as the memory slot;
- required plugins are enabled;
- native provider plugins stay disabled;
- required agents are exactly `main`, `consultant`, and `compliance`;
- agent model policies use OpenRouter model IDs and fallbacks;
- LanceDB Pro embedding, rerank, and memory reflection config use OpenRouter endpoints;
- ProdClaw cron jobs are namespaced as `prodclaw.compliance.*`;
- ProdClaw cron jobs render disabled before `enable-cron`;
- ProdClaw cron jobs target the compliance agent;
- delivery cron jobs include the `message` tool and target Slack `accountId=compliance`;
- cron job names and IDs are unique;
- rendered cron output contains only ProdClaw-owned jobs;
- stale cron runtime state is rejected;
- unreplaced placeholders are rejected;
- known source-owner names and source-machine paths are rejected.

Credential boundary:

- Local rendered config can contain user-provided credentials because it is the staged OpenClaw config and must remain git-ignored.
- Validation output must not print credential values.
- Repository/template credential scanning remains separate from rendered validation.
- Missing credential placeholders remain validation failures.

Deferred validation work:

- external smoke tests, which belong to `prodclaw doctor`;
- real non-ProdClaw cron/skill merge verification in apply or OpenClaw CLI registration work;
- stricter live `enable-cron` gating after smoke tests exist.

## Apply Validation Gate

`prodclaw apply` enforces validation before writing to the live OpenClaw home.

Current implementation scope:

- `prodclaw validate` writes `.prodclaw-validation.json` inside the rendered directory after successful validation;
- the marker records validator identity, validator version, validation time, rendered root, and sha256 hashes for rendered files;
- the marker itself is excluded from validation text scans and hash checks;
- `prodclaw apply` refuses to run if the marker is missing;
- `prodclaw apply` refuses to run if the marker is invalid or incompatible;
- `prodclaw apply` refuses to run if rendered files were added, removed, or changed after validation;
- failure messages tell the user to rerun validate and review diff before apply.

Expected safe flow:

```bash
prodclaw render --home ~/.openclaw --out ./rendered
prodclaw validate --rendered ./rendered
prodclaw doctor --home ~/.openclaw --rendered ./rendered
prodclaw diff --home ~/.openclaw --rendered ./rendered
prodclaw apply --home ~/.openclaw --rendered ./rendered --yes
```

## Apply Backup and Diff Safety

`prodclaw apply` uses managed-file-only backup by default.

Current implementation scope:

- default apply backup copies only existing target files that ProdClaw manages and is about to replace;
- missing target files are recorded in the backup manifest as skipped because they did not exist before apply;
- backup manifest is written to `backups/prodclaw-<timestamp>/manifest.json` inside the OpenClaw home;
- manifest records source home, rendered root, managed files, copied files, skipped files, backup mode, and notes;
- runtime memory, sessions, logs, auth, databases, non-ProdClaw skills, and non-ProdClaw cron state are not copied by the default backup;
- users can request a full OpenClaw home backup explicitly with `--full-backup`;
- missing target files in `prodclaw diff` are shown as `NEW FILE: <path>` and diffed against `/dev/null`.

Examples:

```bash
# Default: managed-file-only backup
prodclaw apply --home ~/.openclaw --rendered ./rendered --yes

# Explicit full-home backup
prodclaw apply --home ~/.openclaw --rendered ./rendered --yes --full-backup
```

## Revert Policy

`prodclaw revert` restores ProdClaw-managed harness files only.

Current implementation scope:

- `prodclaw revert` restores only from managed backup manifests created by `prodclaw apply`;
- `--backup <path>` can select a specific managed backup;
- without `--backup`, revert chooses the latest managed backup in `<home>/backups`;
- copied files listed in the manifest are restored to the OpenClaw home;
- files listed as skipped/missing before apply are removed only when they are ProdClaw-managed paths;
- every restored or removed path must be a known managed file from the template-derived managed file list;
- revert requires `--yes`;
- revert refuses full-home backup manifests and unknown backup formats.

Example:

```bash
prodclaw revert --home ~/.openclaw --backup ~/.openclaw/backups/prodclaw-<timestamp> --yes
```

`prodclaw revert` does not roll back conversations, sessions, memories, LanceDB data, logs, auth profiles, runtime databases, non-ProdClaw skills, non-ProdClaw cron jobs, or user-created files.

Full OpenClaw home restore is intentionally not part of v1.

Deferred apply/revert work:

- full `APPLY` / `REVERT` typed confirmation flow;
- doctor live smoke-test gate;
- cron enablement gate;
- OpenClaw CLI registration rollback from #24.

## LanceDB Pro Policy

LanceDB Pro is required in v1. ProdClaw does not offer a degraded no-memory mode in v1 because durable semantic memory is part of the product promise.

Current implementation scope:

- inspect detects whether the `memory-lancedb-pro` plugin entry exists;
- inspect detects whether the plugin entry is enabled;
- inspect detects whether the memory slot is bound to `memory-lancedb-pro`;
- inspect detects when a different memory plugin is currently active;
- inspect detects likely local extension/load-path presence without treating it as a smoke test;
- configure reports LanceDB Pro as required when missing, disabled, or not bound;
- validation remains strict that rendered config uses `memory-lancedb-pro` as the memory slot;
- action guidance says to preserve existing LanceDB data and old memory plugin data.

State handling:

- installed and enabled with memory slot bound: continue, but doctor must still smoke test later;
- installed but disabled: enable after approval and preserve data;
- missing from config: install/register/enable after approval;
- different memory plugin active: preserve old plugin/config/data and switch slot only after approval;
- broken or unknown: stop later in doctor until repaired.

Deferred LanceDB Pro work:

- actual plugin install;
- actual plugin enable/bind writes;
- memory store/recall smoke test;
- cleanup of doctor test memory if supported;
- OpenClaw CLI-based plugin registration if available;
- memory migration from other plugins or markdown memory.

ProdClaw does not require a separate database server. OpenClaw runtime storage and LanceDB Pro memory are local/embedded storage concerns.

## Slack Policy

Compliance Slack is required in v1 because compliance reports need a reliable production delivery path.

Main Slack is optional. Users may skip the main/default Slack account and continue using their existing OpenClaw dashboard or local UI for owner-facing interaction.

Current implementation scope:

- rendered config includes the compliance Slack account by default;
- rendered config omits the main/default Slack account by default;
- render supports one-bot mode when only compliance Slack is configured;
- render supports two-bot mode when `--enable-main-slack` is passed with main Slack tokens, or both main Slack token environment variables are present;
- validation requires compliance Slack;
- validation allows main/default Slack to be absent;
- validation checks main/default Slack only when it is present;
- docs include Slack member ID helper text.

Render examples:

```bash
# One-bot mode: compliance Slack only
prodclaw render --home ~/.openclaw --out ./rendered \
  --slack-compliance-app-token <value> \
  --slack-compliance-bot-token <value>

# Two-bot mode: compliance Slack plus main Slack
prodclaw render --home ~/.openclaw --out ./rendered \
  --enable-main-slack \
  --slack-compliance-app-token <value> \
  --slack-compliance-bot-token <value> \
  --slack-app-token <value> \
  --slack-bot-token <value>
```

Deferred Slack work:

- compliance Slack delivery test in `prodclaw doctor`;
- cron enablement gate based on successful compliance delivery;
- Slack app pairing automation;
- gateway restart approval flow.

## Compliance Cron

All v1 compliance cron jobs use `openrouter/xiaomi/mimo-v2.5-pro` as primary with Kimi and GLM fallbacks.

ProdClaw-owned cron jobs must render disabled by default. Setup, render, validate, diff, and apply must not run cron. `prodclaw enable-cron` is the only command that enables ProdClaw-owned cron jobs.

Current implementation scope:

- ProdClaw-owned cron jobs use the `prodclaw.compliance.*` namespace;
- rendered ProdClaw-owned jobs are disabled by default;
- rendered ProdClaw-owned jobs target the `compliance` agent;
- delivery jobs include the `message` tool;
- delivery jobs target Slack `accountId=compliance`;
- validation rejects runtime-only cron state;
- validation rejects enabled ProdClaw cron jobs before `enable-cron`;
- `prodclaw enable-cron` requires `--yes`;
- `prodclaw enable-cron` runs local doctor first unless explicitly skipped;
- `prodclaw enable-cron` backs up `cron/jobs.json` before writing;
- `prodclaw enable-cron` enables only jobs whose names start with `prodclaw.compliance.`;
- `prodclaw enable-cron` preserves non-ProdClaw cron jobs unchanged;
- `prodclaw enable-cron` prints exactly which jobs were enabled;
- `prodclaw enable-cron` does not run cron jobs and does not restart the gateway.

Example:

```bash
prodclaw enable-cron --home ~/.openclaw --rendered ./rendered --yes
```

`--skip-doctor` exists only as an escape hatch for local development or broken doctor false positives. Normal setup should not use it.

Cron templates are declarative. `templates/cron/jobs.json.tpl` and rendered `cron/jobs.json` should describe desired jobs: identity, schedule, target agent, model policy, tools, and payload.

Cron runtime state is owned by the local OpenClaw runtime, not by ProdClaw templates. Do not commit or render prior runtime fields such as:

- `state`
- `runHistory`
- `lastRun` / `nextRun`
- `lastRunAt` / `nextRunAt`
- `lastRunAtMs` / `nextRunAtMs`
- `lastRunStatus` / `lastStatus`
- `lastDurationMs`
- `lastDeliveryStatus`
- `lastError`
- `consecutiveErrors`

Fresh migrations must not start with previous errors, stale timestamps, old delivery state, or copied billing failures from another environment. Validation rejects runtime-only cron keys in rendered cron jobs.

If an existing user already has local cron runtime state, migration/apply logic should preserve or merge that state locally in the target OpenClaw home. It should never come from a committed template.

Deferred cron work:

- compliance Slack delivery smoke test;
- OpenRouter and LanceDB live smoke gates;
- OpenClaw CLI-based cron registration from #24;
- cron run/smoke execution.

## Gateway

Gateway restart is an owner action. Setup can report that a restart is needed, but must not restart automatically.

## Model Updates

Model policy is curated. Normal users should not pick models during setup; updates should ship as a deliberate policy change.

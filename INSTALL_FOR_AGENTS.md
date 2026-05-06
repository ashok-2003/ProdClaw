# Install ProdClaw For Agents

You are installing an opinionated OpenClaw harness for a user who already has OpenClaw.

## Non-Negotiable Rules

- Do not run cron jobs during setup.
- Do not restart the gateway unless the user explicitly approves.
- Do not print secrets.
- Do not edit the live OpenClaw home during inspect/render/diff.
- Apply only after backup and explicit approval.
- Prefer OpenClaw CLI commands for runtime configuration where practical.

## Required Inputs

- `OPENCLAW_HOME`, default `~/.openclaw`
- owner name
- OpenRouter API key
- Slack default bot token and app token
- Slack compliance bot token and app token
- Slack owner user ID
- timezone
- owner user home, default parent directory of `OPENCLAW_HOME`

## Workflow

1. Inspect:
   ```bash
   node scripts/setup.mjs inspect --home ~/.openclaw
   ```
2. Render to a staging directory:
   ```bash
   node scripts/setup.mjs render --home ~/.openclaw --out ./rendered [inputs...]
   ```
3. Validate the rendered output (allows real secrets; rendered/ is git-ignored):
   ```bash
   node scripts/validate.mjs --rendered ./rendered
   ```
4. Diff:
   ```bash
   node scripts/setup.mjs diff --home ~/.openclaw --rendered ./rendered
   ```
5. Ask the user for explicit approval.
6. Apply:
   ```bash
   node scripts/setup.mjs apply --home ~/.openclaw --rendered ./rendered --yes
   ```

## What This Installs

- Three agents: `main`, `consultant`, `compliance`
- LanceDB Pro memory slot
- OpenRouter model routing
- Two Slack accounts
- Compliance cron definitions
- Workspace instructions and skills

## Known Gap

Slack owner-mediated relay for third-party channel mentions is not implemented in v1. Keep the current practical Slack behavior and document this as future runtime hardening, not a prompt-only fix.

## Validation Notes

`scripts/validate.mjs` validates local rendered output and explicitly **allows** real secrets (because `./rendered` is git-ignored). Never confuse it with `scripts/scan-secrets.mjs`, which is intended for CI and rejects committed real credentials.

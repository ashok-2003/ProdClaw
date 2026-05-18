#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const setupScript = path.join(repoRoot, "scripts", "setup.mjs");
const validateScript = path.join(repoRoot, "scripts", "validate.mjs");
const doctorScript = path.join(repoRoot, "scripts", "doctor.mjs");
const revertScript = path.join(repoRoot, "scripts", "revert.mjs");
const enableCronScript = path.join(repoRoot, "scripts", "enable-cron.mjs");
const configureSlackScript = path.join(repoRoot, "scripts", "configure-slack.mjs");

const implemented = new Set(["inspect", "configure", "render", "validate", "doctor", "diff", "apply", "enable-cron", "revert"]);
const planned = new Set([]);
const allCommands = [
  "inspect",
  "configure",
  "render",
  "validate",
  "doctor",
  "diff",
  "apply",
  "enable-cron",
  "revert",
];

function printHelp() {
  console.log(`ProdClaw v1 migration CLI

Recommended order:
  prodclaw inspect
  prodclaw configure
  prodclaw render
  prodclaw validate
  prodclaw doctor
  prodclaw diff
  prodclaw apply
  prodclaw enable-cron

Rollback:
  prodclaw revert

Implemented in this CLI wrapper:
  prodclaw inspect [--home ~/.openclaw] [--json]
  prodclaw configure [--home ~/.openclaw]
  prodclaw configure --home ~/.openclaw --config-out local/prodclaw.configure.json [--slack-compliance-account <id>] [--slack-main-account <id> | --skip-main-slack]
  prodclaw render --home ~/.openclaw --out ./rendered [inputs...]
  prodclaw validate [--rendered ./rendered]
  prodclaw doctor [--home ~/.openclaw] [--rendered ./rendered] [--json]
  prodclaw diff --home ~/.openclaw --rendered ./rendered
  prodclaw apply --home ~/.openclaw --rendered ./rendered --yes [--full-backup]
  prodclaw enable-cron --home ~/.openclaw [--rendered ./rendered] --yes
  prodclaw revert --home ~/.openclaw [--backup ~/.openclaw/backups/prodclaw-<timestamp>] --yes

Safety rules:
  - inspect/configure/render/doctor/diff must not edit the live OpenClaw home
  - configure can write a staged local ProdClaw config only when --config-out is provided
  - validate checks staged files only
  - apply requires explicit confirmation flags
  - enable-cron is separate from apply and enables only ProdClaw compliance cron jobs
  - revert restores managed files only from managed backups
  - no command should print raw secrets
`);
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

function failPlanned(command) {
  console.error(`prodclaw ${command} is part of the v1 command surface but is not implemented yet.`);
  process.exit(2);
}

function hasAny(args, flags) {
  return flags.some((flag) => args.includes(flag));
}

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1);

if (!command || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (!allCommands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.error("");
  printHelp();
  process.exit(1);
}

if (planned.has(command)) {
  failPlanned(command);
}

if (!implemented.has(command)) {
  console.error(`Internal error: command is registered but not routed: ${command}`);
  process.exit(1);
}

if (command === "validate") {
  runNode(validateScript, rest.length ? rest : ["--rendered", "./rendered"]);
}

if (command === "doctor") {
  runNode(doctorScript, rest);
}

if (command === "revert") {
  runNode(revertScript, rest);
}

if (command === "enable-cron") {
  runNode(enableCronScript, rest);
}

if (command === "configure" && hasAny(rest, ["--config-out", "--slack-compliance-account", "--slack-main-account", "--skip-main-slack"])) {
  runNode(configureSlackScript, rest);
}

runNode(setupScript, [command, ...rest]);

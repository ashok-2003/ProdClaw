#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const setupScript = path.join(repoRoot, "scripts", "setup.mjs");
const validateScript = path.join(repoRoot, "scripts", "validate.mjs");

const implemented = new Set(["inspect", "render", "validate", "diff", "apply"]);
const planned = new Set(["configure", "doctor", "enable-cron", "revert"]);
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
  prodclaw inspect [--home ~/.openclaw]
  prodclaw render --home ~/.openclaw --out ./rendered [inputs...]
  prodclaw validate [--rendered ./rendered]
  prodclaw diff --home ~/.openclaw --rendered ./rendered
  prodclaw apply --home ~/.openclaw --rendered ./rendered --yes

Planned commands currently fail clearly until their implementation issues land:
  prodclaw configure
  prodclaw doctor
  prodclaw enable-cron
  prodclaw revert

Safety rules:
  - inspect/render/diff must not edit the live OpenClaw home
  - validate checks staged files only
  - apply requires explicit confirmation flags
  - enable-cron remains separate from apply
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
  console.error("");

  if (command === "configure") {
    console.error("Use the current render flags or a local user profile until configure lands.");
  } else if (command === "doctor") {
    console.error("Use validate for staged-file checks until runtime doctor checks land.");
  } else if (command === "enable-cron") {
    console.error("Cron enablement is intentionally separate and will be implemented after safety checks.");
  } else if (command === "revert") {
    console.error("Managed-file rollback will be implemented separately from apply.");
  }

  process.exit(2);
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

runNode(setupScript, [command, ...rest]);

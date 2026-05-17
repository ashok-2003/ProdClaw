#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { detectOpenClawCliCapabilities } from "./openclaw-cli-capabilities.mjs";

const memoryPluginId = "memory-lancedb-pro";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "json") out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function expandHome(input) {
  if (!input || input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function redact(text) {
  const openRouterPrefix = "sk-" + "or-v1-";
  const slackBotPrefix = "xo" + "xb-";
  const slackAppPrefix = "xa" + "pp-";
  return String(text)
    .replace(new RegExp(openRouterPrefix + "[A-Za-z0-9_-]+", "g"), openRouterPrefix + "REDACTED")
    .replace(new RegExp(slackBotPrefix + "[A-Za-z0-9-]+", "g"), slackBotPrefix + "REDACTED")
    .replace(new RegExp(slackAppPrefix + "[A-Za-z0-9-]+", "g"), slackAppPrefix + "REDACTED")
    .replace(/"token"\s*:\s*"[^"]+"/g, '"token": "REDACTED"')
    .replace(/"apiKey"\s*:\s*"[^"]+"/g, '"apiKey": "REDACTED"')
    .replace(/"rerankApiKey"\s*:\s*"[^"]+"/g, '"rerankApiKey": "REDACTED"')
    .replace(/"botToken"\s*:\s*"[^"]+"/g, '"botToken": "REDACTED"')
    .replace(/"appToken"\s*:\s*"[^"]+"/g, '"appToken": "REDACTED"');
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: opts.env ?? process.env,
    cwd: opts.cwd ?? process.cwd(),
  });
  return {
    status: result.status,
    stdout: redact(result.stdout ?? ""),
    stderr: redact(result.stderr ?? ""),
  };
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function findFirstJson(home, names) {
  for (const name of names) {
    const file = path.join(home, name);
    const parsed = readJsonIfExists(file);
    if (parsed) return { file, parsed };
  }
  return null;
}

function detectHome(args) {
  const candidates = [];
  if (args.home) candidates.push({ source: "--home", value: path.resolve(expandHome(args.home)) });
  if (process.env.OPENCLAW_HOME) candidates.push({ source: "OPENCLAW_HOME", value: path.resolve(expandHome(process.env.OPENCLAW_HOME)) });
  candidates.push({ source: "default", value: path.join(os.homedir(), ".openclaw") });
  return candidates.find((candidate) => fs.existsSync(candidate.value)) ?? candidates[0];
}

function detectOpenClawVersion(home) {
  const pkg = findFirstJson(home, ["package.json", "openclaw/package.json"]);
  if (pkg?.parsed?.version) return pkg.parsed.version;
  const result = run("openclaw", ["--version"], { env: { ...process.env, OPENCLAW_HOME: home } });
  if (result.status === 0 && result.stdout.trim()) return result.stdout.trim().split("\n")[0];
  return null;
}

function hasFilledSecret(value, placeholder) {
  return typeof value === "string" && value.length > 0 && value !== placeholder;
}

function isPlausibleSlackUserId(value) {
  return typeof value === "string" && /^U[A-Z0-9]{2,}$/.test(value);
}

function detectMemoryState(config, home) {
  const entries = config.plugins?.entries ?? {};
  const memoryEntry = entries[memoryPluginId];
  const memorySlot = config.plugins?.slots?.memory ?? null;
  const loadPaths = config.plugins?.load?.paths ?? [];
  const defaultExtensionDir = path.join(home, "extensions", memoryPluginId);
  const configuredLoadPath = loadPaths.find((item) => String(item).includes(memoryPluginId));
  const resolvedLoadPath = configuredLoadPath ? path.resolve(expandHome(String(configuredLoadPath).replace("{{OPENCLAW_HOME}}", home))) : null;
  const extensionDirExists = fs.existsSync(defaultExtensionDir) || Boolean(resolvedLoadPath && fs.existsSync(resolvedLoadPath));
  const entryPresent = Boolean(memoryEntry);
  const entryEnabled = memoryEntry?.enabled === true;
  const slotBound = memorySlot === memoryPluginId;
  const differentActiveMemory = memorySlot && memorySlot !== memoryPluginId ? memorySlot : null;

  if (entryPresent && entryEnabled && slotBound) {
    return { status: "READY", summary: "memory-lancedb-pro is enabled and bound", action: "Run future memory smoke test before cron enablement." };
  }
  if (entryPresent && !entryEnabled && slotBound) {
    return { status: "BROKEN", summary: "memory-lancedb-pro is selected but disabled", action: "Enable it after approval before apply/cron enablement." };
  }
  if (entryPresent && entryEnabled && differentActiveMemory) {
    return { status: "BROKEN", summary: "memory slot points to " + differentActiveMemory, action: "Preserve old memory data, then switch slot after approval." };
  }
  if (entryPresent) {
    return { status: "BROKEN", summary: "memory-lancedb-pro is present but not fully configured", action: "Enable and bind it after approval." };
  }
  if (extensionDirExists) {
    return { status: "BROKEN", summary: "memory-lancedb-pro files found but config entry missing", action: "Register/enable/bind after approval." };
  }
  return { status: "BROKEN", summary: "memory-lancedb-pro not detected", action: "Install and enable it before apply/cron enablement." };
}

function add(checks, section, status, message, action = null) {
  checks.push({ section, status, message, action });
}

function sectionStatus(checks, section) {
  const subset = checks.filter((check) => check.section === section);
  if (subset.some((check) => check.status === "BROKEN")) return "BROKEN";
  if (subset.some((check) => check.status === "WARN")) return "WARN";
  return "READY";
}

function addOpenClawCliChecks(checks, home) {
  const capabilities = detectOpenClawCliCapabilities(home);
  if (!capabilities.available) {
    add(checks, "OpenClaw CLI", "WARN", "OpenClaw CLI help is not available", "Runtime registration will use documented fallback behavior until CLI commands are confirmed.");
    return;
  }

  add(checks, "OpenClaw CLI", "READY", "OpenClaw CLI is available");
  if (capabilities.cron.available) add(checks, "OpenClaw CLI", "READY", "OpenClaw cron command group appears available");
  else add(checks, "OpenClaw CLI", "WARN", "OpenClaw cron command group not detected", "Keep local file-based cron fallback until command syntax is confirmed.");

  if (capabilities.cron.add && capabilities.cron.list) add(checks, "OpenClaw CLI", "READY", "OpenClaw cron add/list commands appear available");
  else add(checks, "OpenClaw CLI", "WARN", "OpenClaw cron add/list commands not confirmed", "Do not switch cron registration until exact command syntax is verified.");

  if (capabilities.agents.available) add(checks, "OpenClaw CLI", "READY", "OpenClaw agents command group appears available");
  else add(checks, "OpenClaw CLI", "WARN", "OpenClaw agents command group not detected", "Keep local config/static-file fallback until command syntax is confirmed.");

  if (capabilities.agents.add && capabilities.agents.list) add(checks, "OpenClaw CLI", "READY", "OpenClaw agents add/list commands appear available");
  else add(checks, "OpenClaw CLI", "WARN", "OpenClaw agents add/list commands not confirmed", "Do not switch agent registration until exact command syntax is verified.");
}

function runDoctor(args) {
  const homeCandidate = detectHome(args);
  const home = homeCandidate.value;
  const rendered = path.resolve(expandHome(args.rendered || "./rendered"));
  const configHit = findFirstJson(home, ["openclaw.json", "config.json"]);
  const config = configHit?.parsed ?? {};
  const checks = [];

  if (fs.existsSync(home)) add(checks, "OpenClaw", "READY", "OpenClaw home found: " + home + " (" + homeCandidate.source + ")");
  else add(checks, "OpenClaw", "BROKEN", "OpenClaw home not found: " + home, "Pass --home or set OPENCLAW_HOME.");

  if (configHit) add(checks, "OpenClaw", "READY", "Config is readable: " + configHit.file);
  else add(checks, "OpenClaw", "BROKEN", "OpenClaw config not found", "Run inspect/configure against an existing OpenClaw home.");

  const version = fs.existsSync(home) ? detectOpenClawVersion(home) : null;
  if (version) add(checks, "OpenClaw", "READY", "OpenClaw version detected: " + version);
  else add(checks, "OpenClaw", "WARN", "OpenClaw version not detected", "Doctor can continue, but compatibility is not fully known.");

  addOpenClawCliChecks(checks, home);

  const openRouterConfigured = Boolean(
    process.env.OPENROUTER_API_KEY ||
    config.openrouter?.apiKey ||
    config.providers?.openrouter?.apiKey ||
    config.models?.openrouter?.apiKey
  );
  if (openRouterConfigured) add(checks, "OpenRouter", "READY", "OpenRouter key/config signal detected");
  else add(checks, "OpenRouter", "BROKEN", "OpenRouter key/config not detected", "Provide OpenRouter configuration before render/apply.");
  add(checks, "OpenRouter", "WARN", "Model reachability smoke test not implemented yet", "Future doctor pass should call a lightweight model check.");

  const memory = detectMemoryState(config, home);
  add(checks, "LanceDB Pro", memory.status, memory.summary, memory.action);
  add(checks, "LanceDB Pro", "WARN", "Memory store/recall smoke test not implemented yet", "Future doctor pass should store and recall a namespaced test memory.");

  const slack = config.channels?.slack;
  const compliance = slack?.accounts?.compliance;
  const slackUserId = config.channels?.slack?.target || config.owner?.slackUserId || process.env.SLACK_USER_ID;
  if (slack?.enabled === true) add(checks, "Slack", "READY", "Slack channel enabled in config");
  else add(checks, "Slack", "BROKEN", "Slack channel not enabled", "Compliance Slack is required for v1.");

  if (compliance) add(checks, "Slack", "READY", "Compliance Slack account exists");
  else add(checks, "Slack", "BROKEN", "Compliance Slack account missing", "Configure a compliance Slack account before cron enablement.");

  if (compliance && hasFilledSecret(compliance.appToken, "SLACK_COMPLIANCE_APP_TOKEN")) add(checks, "Slack", "READY", "Compliance Slack app token is present");
  else add(checks, "Slack", "BROKEN", "Compliance Slack app token missing or placeholder", "Render with a real compliance app token.");

  if (compliance && hasFilledSecret(compliance.botToken, "SLACK_COMPLIANCE_BOT_TOKEN")) add(checks, "Slack", "READY", "Compliance Slack bot token is present");
  else add(checks, "Slack", "BROKEN", "Compliance Slack bot token missing or placeholder", "Render with a real compliance bot token.");

  if (isPlausibleSlackUserId(slackUserId)) add(checks, "Slack", "READY", "Slack member ID shape looks valid");
  else add(checks, "Slack", "WARN", "Slack member ID missing or not in expected U... shape", "Copy member ID from Slack profile menu.");
  add(checks, "Slack", "WARN", "Compliance DM delivery smoke test not implemented yet", "Future doctor pass must send a test DM before enable-cron.");

  const cronFile = path.join(home, "cron", "jobs.json");
  const cron = readJsonIfExists(cronFile);
  if (cron) add(checks, "Cron", "READY", "Cron config found: " + cronFile);
  else add(checks, "Cron", "WARN", "Cron config not found", "Render/apply should install ProdClaw-owned cron config later.");

  const jobs = Array.isArray(cron?.jobs) ? cron.jobs : [];
  const prodclawJobs = jobs.filter((job) => String(job.name ?? "").startsWith("compliance-") || String(job.name ?? "").startsWith("prodclaw."));
  if (prodclawJobs.length > 0) add(checks, "Cron", "READY", "ProdClaw/compliance cron jobs detected: " + prodclawJobs.length);
  else add(checks, "Cron", "WARN", "ProdClaw/compliance cron jobs not detected yet", "Render/apply should install jobs, but setup must not run them.");

  const enabledProdclawJobs = prodclawJobs.filter((job) => job.enabled === true);
  if (enabledProdclawJobs.length > 0) add(checks, "Cron", "WARN", "ProdClaw/compliance cron jobs appear enabled: " + enabledProdclawJobs.length, "Cron enablement should wait for successful doctor smoke tests.");
  else add(checks, "Cron", "READY", "No enabled ProdClaw cron jobs detected during setup");

  if (fs.existsSync(rendered)) add(checks, "Safety", "READY", "Rendered directory found: " + rendered);
  else add(checks, "Safety", "WARN", "Rendered directory not found: " + rendered, "Run render and validate before diff/apply.");

  const backupParent = fs.existsSync(home) ? path.join(home, "backups") : path.dirname(home);
  try {
    fs.mkdirSync(backupParent, { recursive: true });
    fs.accessSync(backupParent, fs.constants.W_OK);
    add(checks, "Safety", "READY", "Backup parent is writable: " + backupParent);
  } catch {
    add(checks, "Safety", "BROKEN", "Backup parent is not writable: " + backupParent, "Fix permissions before apply.");
  }

  add(checks, "Safety", "WARN", "Doctor is local-only in this pass", "Live OpenRouter, LanceDB, and Slack smoke tests are still deferred.");
  return checks;
}

function printChecks(checks) {
  console.log("ProdClaw Doctor");
  console.log("");
  for (const section of ["OpenClaw", "OpenClaw CLI", "OpenRouter", "LanceDB Pro", "Slack", "Cron", "Safety"]) {
    console.log(section);
    for (const check of checks.filter((item) => item.section === section)) {
      console.log(check.status.padEnd(7) + check.message);
      if (check.action) console.log("ACTION ".padEnd(7) + check.action);
    }
    console.log("");
  }

  const summary = ["OpenClaw", "OpenClaw CLI", "OpenRouter", "LanceDB Pro", "Slack", "Cron", "Safety"]
    .map((section) => section + ": " + sectionStatus(checks, section))
    .join(", ");
  console.log("Summary: " + summary);
}

const args = parseArgs(process.argv.slice(2));
const checks = runDoctor(args);
if (args.json) console.log(JSON.stringify(checks, null, 2));
else printChecks(checks);

process.exit(checks.some((check) => check.status === "BROKEN") ? 1 : 0);

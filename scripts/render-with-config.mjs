#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const setupScript = path.join(repoRoot, "scripts", "setup.mjs");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "enable-main-slack") out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function stripConfigArgs(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--config" || arg === "--configure-file") {
      i++;
      continue;
    }
    out.push(arg);
  }
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error("Invalid JSON: " + file + ": " + error.message);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function requireToken(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(label + " is required when rendering staged Slack mapping.");
  }
  return value;
}

function selectedConfigPath(args) {
  return args.config || args["configure-file"];
}

function applySlackMapping(rendered, staged, args) {
  const slack = staged.slack ?? {};
  const complianceAccountId = slack.complianceAccountId;
  const mainAccountId = slack.mainAccountId;
  const mainSlackEnabled = slack.mainSlackEnabled === true;

  if (!complianceAccountId) {
    throw new Error("Staged config does not select a compliance Slack account. Run configure with --slack-compliance-account or provide compliance tokens directly.");
  }

  const openclawFile = path.join(rendered, "openclaw.json");
  const cronFile = path.join(rendered, "cron", "jobs.json");
  const config = readJson(openclawFile);
  const cron = readJson(cronFile);

  const accounts = config.channels?.slack?.accounts;
  if (!accounts?.compliance) throw new Error("Rendered config missing template compliance Slack account.");

  const complianceAccount = accounts.compliance;
  delete accounts.compliance;
  complianceAccount.appToken = requireToken(args["slack-compliance-app-token"] || process.env.SLACK_COMPLIANCE_APP_TOKEN, "Compliance Slack app token");
  complianceAccount.botToken = requireToken(args["slack-compliance-bot-token"] || process.env.SLACK_COMPLIANCE_BOT_TOKEN, "Compliance Slack bot token");
  accounts[complianceAccountId] = complianceAccount;

  for (const binding of Array.isArray(config.bindings) ? config.bindings : []) {
    if (binding?.match?.channel === "slack" && binding.agentId === "compliance") {
      binding.match.accountId = complianceAccountId;
    }
  }

  if (mainSlackEnabled) {
    if (!mainAccountId) throw new Error("mainSlackEnabled is true but mainAccountId is missing in staged config.");
    if (mainAccountId === complianceAccountId) throw new Error("Main Slack account must not reuse the compliance account in v1.");
    accounts[mainAccountId] = {
      enabled: true,
      mode: "socket",
      appToken: requireToken(args["slack-app-token"] || process.env.SLACK_APP_TOKEN, "Main Slack app token"),
      botToken: requireToken(args["slack-bot-token"] || process.env.SLACK_BOT_TOKEN, "Main Slack bot token"),
      userTokenReadOnly: true,
      nativeStreaming: true,
      streaming: "partial",
    };
    config.bindings.unshift({
      match: {
        channel: "slack",
        accountId: mainAccountId,
      },
      agentId: "main",
    });
    config.channels.slack.appToken = accounts[mainAccountId].appToken;
    config.channels.slack.botToken = accounts[mainAccountId].botToken;
    config.channels.slack.groupPolicy = "open";
    config.channels.slack.capabilities = { interactiveReplies: true };
  }

  for (const job of Array.isArray(cron.jobs) ? cron.jobs : []) {
    if (typeof job?.payload?.message === "string") {
      job.payload.message = job.payload.message.replaceAll("accountId=compliance", "accountId=" + complianceAccountId);
    }
  }

  writeJson(openclawFile, config);
  writeJson(cronFile, cron);
  console.log("Applied staged Slack mapping to rendered output.");
  console.log("Compliance Slack accountId: " + complianceAccountId);
  console.log("Main Slack: " + (mainSlackEnabled ? mainAccountId : "skipped"));
}

function renderWithConfig(argv) {
  const args = parseArgs(argv);
  const configPath = selectedConfigPath(args);
  if (!configPath) throw new Error("Missing --config or --configure-file.");

  const rendered = path.resolve(args.out || "./rendered");
  const staged = readJson(path.resolve(configPath));
  const baseArgs = stripConfigArgs(argv);
  const result = spawnSync(process.execPath, [setupScript, "render", ...baseArgs], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  applySlackMapping(rendered, staged, args);
}

try {
  renderWithConfig(process.argv.slice(2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

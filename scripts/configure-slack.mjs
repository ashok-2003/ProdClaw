#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "skip-main-slack" || key === "json") out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function expandHome(input) {
  if (!input || input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function detectHome(args) {
  if (args.home) return path.resolve(expandHome(args.home));
  if (process.env.OPENCLAW_HOME) return path.resolve(expandHome(process.env.OPENCLAW_HOME));
  return path.join(os.homedir(), ".openclaw");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error("Invalid JSON: " + file + ": " + error.message);
  }
}

function readOpenClawConfig(home) {
  for (const name of ["openclaw.json", "config.json"]) {
    const file = path.join(home, name);
    if (fs.existsSync(file)) return { file, config: readJson(file) };
  }
  throw new Error("OpenClaw config not found in " + home);
}

function hasFilledSecret(value, placeholders) {
  return typeof value === "string" && value.length > 0 && !placeholders.includes(value);
}

function detectSlackBindings(config) {
  const byAccount = new Map();
  for (const binding of Array.isArray(config.bindings) ? config.bindings : []) {
    if (binding?.match?.channel !== "slack") continue;
    const accountId = binding.match.accountId ?? "default";
    const existing = byAccount.get(accountId) ?? [];
    existing.push(binding.agentId ?? null);
    byAccount.set(accountId, existing.filter(Boolean));
  }
  return byAccount;
}

function detectSlackAccounts(config) {
  const bindings = detectSlackBindings(config);
  const accounts = config.channels?.slack?.accounts ?? {};
  return Object.entries(accounts).map(([accountId, account]) => {
    const appTokenPresent = hasFilledSecret(account?.appToken, ["SLACK_APP_TOKEN", "SLACK_COMPLIANCE_APP_TOKEN"]);
    const botTokenPresent = hasFilledSecret(account?.botToken, ["SLACK_BOT_TOKEN", "SLACK_COMPLIANCE_BOT_TOKEN"]);
    const missing = [];
    if (!appTokenPresent) missing.push("app token");
    if (!botTokenPresent) missing.push("bot token");
    return {
      accountId,
      enabled: account?.enabled === true,
      appTokenPresent,
      botTokenPresent,
      complete: appTokenPresent && botTokenPresent,
      missing,
      boundAgents: bindings.get(accountId) ?? [],
    };
  }).sort((a, b) => a.accountId.localeCompare(b.accountId));
}

function nameHintsCompliance(accountId) {
  return /compliance|audit|report/i.test(accountId);
}

function recommendCompliance(accounts) {
  const complete = accounts.filter((account) => account.complete && account.enabled !== false);
  const bound = complete.filter((account) => account.boundAgents.includes("compliance"));
  if (bound.length === 1) return { accountId: bound[0].accountId, reason: "already bound to compliance", needsInput: false };
  if (bound.length > 1) return { accountId: null, reason: "multiple complete accounts already bound to compliance", needsInput: true };
  const hinted = complete.filter((account) => nameHintsCompliance(account.accountId));
  if (hinted.length === 1) return { accountId: hinted[0].accountId, reason: "account ID suggests compliance/audit/report use", needsInput: false };
  if (hinted.length > 1) return { accountId: null, reason: "multiple compliance-like accounts found", needsInput: true };
  const notMain = complete.filter((account) => !account.boundAgents.includes("main"));
  if (notMain.length === 1) return { accountId: notMain[0].accountId, reason: "only complete account not bound to main", needsInput: false };
  if (complete.length === 1) return { accountId: complete[0].accountId, reason: "only complete Slack account found", needsInput: false };
  if (complete.length > 1) return { accountId: null, reason: "multiple complete accounts found", needsInput: true };
  return { accountId: null, reason: "no complete Slack account found", needsInput: true };
}

function recommendMain(accounts) {
  const complete = accounts.filter((account) => account.complete && account.enabled !== false);
  const bound = complete.filter((account) => account.boundAgents.includes("main"));
  if (bound.length === 1) return { accountId: bound[0].accountId, reason: "already bound to main", mainSlackEnabled: true };
  if (bound.length > 1) return { accountId: null, reason: "multiple complete accounts already bound to main", mainSlackEnabled: false };
  return { accountId: null, reason: "main Slack is optional; default is skip", mainSlackEnabled: false };
}

function findAccount(accounts, accountId, label) {
  const account = accounts.find((candidate) => candidate.accountId === accountId);
  if (!account) throw new Error(label + " Slack account not found: " + accountId);
  if (!account.complete) throw new Error(label + " Slack account is incomplete: " + accountId + " (missing " + account.missing.join(" and ") + ")");
  if (account.enabled === false) throw new Error(label + " Slack account is disabled: " + accountId);
  return account;
}

function writeStagedMapping(args) {
  const home = detectHome(args);
  const { file: configPath, config } = readOpenClawConfig(home);
  const accounts = detectSlackAccounts(config);
  const complianceRecommendation = recommendCompliance(accounts);
  const mainRecommendation = recommendMain(accounts);

  const selectedCompliance = args["slack-compliance-account"]
    ? findAccount(accounts, args["slack-compliance-account"], "Compliance").accountId
    : complianceRecommendation.accountId;

  let selectedMain = null;
  let mainSlackEnabled = false;
  if (args["slack-main-account"] && args["skip-main-slack"]) {
    throw new Error("Use either --slack-main-account or --skip-main-slack, not both.");
  }
  if (args["slack-main-account"]) {
    selectedMain = findAccount(accounts, args["slack-main-account"], "Main").accountId;
    mainSlackEnabled = true;
  } else if (args["skip-main-slack"]) {
    selectedMain = null;
    mainSlackEnabled = false;
  } else {
    selectedMain = mainRecommendation.accountId;
    mainSlackEnabled = Boolean(mainRecommendation.accountId);
  }

  const staged = {
    schema: "prodclaw.configure.v1",
    createdAt: new Date().toISOString(),
    source: {
      openclawHome: home,
      configPath,
    },
    slack: {
      complianceAccountId: selectedCompliance,
      complianceNeedsInput: !selectedCompliance,
      complianceReason: args["slack-compliance-account"] ? "selected by --slack-compliance-account" : complianceRecommendation.reason,
      mainAccountId: selectedMain,
      mainSlackEnabled,
      mainReason: args["slack-main-account"] ? "selected by --slack-main-account" : args["skip-main-slack"] ? "skipped by --skip-main-slack" : mainRecommendation.reason,
      discoveredAccounts: accounts.map((account) => ({
        accountId: account.accountId,
        enabled: account.enabled,
        complete: account.complete,
        appTokenPresent: account.appTokenPresent,
        botTokenPresent: account.botTokenPresent,
        missing: account.missing,
        boundAgents: account.boundAgents,
      })),
    },
  };

  if (!args["config-out"]) {
    console.log(JSON.stringify(staged, null, 2));
    return;
  }

  const out = path.resolve(expandHome(args["config-out"]));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(staged, null, 2) + "\n");
  console.log("Wrote staged ProdClaw config: " + out);
  if (!selectedCompliance) console.log("Compliance Slack still needs explicit input before apply/enable-cron.");
}

try {
  writeStagedMapping(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

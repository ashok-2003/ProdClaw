#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "skip-main-slack" || key === "json" || key === "interactive") out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function expandHome(inputPath) {
  if (!inputPath || inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
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

function completeAccounts(accounts) {
  return accounts.filter((account) => account.complete && account.enabled !== false);
}

function recommendCompliance(accounts) {
  const complete = completeAccounts(accounts);
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
  const complete = completeAccounts(accounts);
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

function printDiscoveredAccounts(accounts) {
  console.log("Detected Slack accounts:");
  if (accounts.length === 0) {
    console.log("  none");
    return;
  }
  accounts.forEach((account, index) => {
    const status = account.complete ? "complete" : "incomplete: missing " + account.missing.join(" and ");
    const bound = account.boundAgents.length ? account.boundAgents.join(", ") : "none";
    console.log("  [" + (index + 1) + "] " + account.accountId + " - " + status + "; enabled=" + account.enabled + "; bound=" + bound);
  });
}

async function askChoice(rl, prompt, allowed) {
  while (true) {
    const answer = (await rl.question(prompt)).trim();
    if (allowed.includes(answer)) return answer;
    console.log("Choose one of: " + allowed.join(", "));
  }
}

async function chooseComplianceInteractive(accounts, recommendation) {
  const complete = completeAccounts(accounts);
  const rl = readline.createInterface({ input, output });
  try {
    console.log("");
    printDiscoveredAccounts(accounts);
    console.log("");
    if (recommendation.accountId) {
      console.log("Recommended compliance account: " + recommendation.accountId + " (" + recommendation.reason + ")");
    } else {
      console.log("Compliance account needs input: " + recommendation.reason);
    }
    console.log("");
    console.log("Which Slack account should ProdClaw use for compliance reports?");
    complete.forEach((account, index) => console.log("  [" + (index + 1) + "] Reuse " + account.accountId));
    const provideNew = String(complete.length + 1);
    const skip = String(complete.length + 2);
    console.log("  [" + provideNew + "] Provide new compliance Slack tokens later");
    console.log("  [" + skip + "] Skip for now (apply/enable-cron will remain blocked)");

    const defaultChoice = recommendation.accountId
      ? String(complete.findIndex((account) => account.accountId === recommendation.accountId) + 1)
      : provideNew;
    const choice = await askChoice(rl, "Choice [" + defaultChoice + "]: ", ["", ...complete.map((_account, index) => String(index + 1)), provideNew, skip]);
    const selected = choice || defaultChoice;
    if (selected === provideNew) return { accountId: null, needsInput: true, reason: "new compliance Slack tokens selected for later" };
    if (selected === skip) return { accountId: null, needsInput: true, reason: "compliance Slack skipped for now" };
    return { accountId: complete[Number(selected) - 1].accountId, needsInput: false, reason: "selected interactively" };
  } finally {
    rl.close();
  }
}

async function chooseMainInteractive(accounts, recommendation) {
  const complete = completeAccounts(accounts);
  const rl = readline.createInterface({ input, output });
  try {
    console.log("");
    console.log("Do you want the main agent to be reachable through Slack?");
    console.log("  [1] No, skip main Slack");
    complete.forEach((account, index) => console.log("  [" + (index + 2) + "] Reuse " + account.accountId));
    const provideNew = String(complete.length + 2);
    console.log("  [" + provideNew + "] Provide new main Slack tokens later");

    const defaultChoice = recommendation.accountId
      ? String(complete.findIndex((account) => account.accountId === recommendation.accountId) + 2)
      : "1";
    const allowed = ["", "1", ...complete.map((_account, index) => String(index + 2)), provideNew];
    const choice = await askChoice(rl, "Choice [" + defaultChoice + "]: ", allowed);
    const selected = choice || defaultChoice;
    if (selected === "1") return { accountId: null, enabled: false, reason: "skipped interactively" };
    if (selected === provideNew) return { accountId: null, enabled: true, reason: "new main Slack tokens selected for later" };
    return { accountId: complete[Number(selected) - 2].accountId, enabled: true, reason: "selected interactively" };
  } finally {
    rl.close();
  }
}

async function selectSlackMapping(args, accounts, complianceRecommendation, mainRecommendation) {
  if (args.interactive) {
    const compliance = args["slack-compliance-account"]
      ? { accountId: findAccount(accounts, args["slack-compliance-account"], "Compliance").accountId, needsInput: false, reason: "selected by --slack-compliance-account" }
      : await chooseComplianceInteractive(accounts, complianceRecommendation);

    let main;
    if (args["slack-main-account"] && args["skip-main-slack"]) {
      throw new Error("Use either --slack-main-account or --skip-main-slack, not both.");
    }
    if (args["slack-main-account"]) {
      main = { accountId: findAccount(accounts, args["slack-main-account"], "Main").accountId, enabled: true, reason: "selected by --slack-main-account" };
    } else if (args["skip-main-slack"]) {
      main = { accountId: null, enabled: false, reason: "skipped by --skip-main-slack" };
    } else {
      main = await chooseMainInteractive(accounts, mainRecommendation);
    }

    return { compliance, main };
  }

  const selectedCompliance = args["slack-compliance-account"]
    ? findAccount(accounts, args["slack-compliance-account"], "Compliance").accountId
    : complianceRecommendation.accountId;

  let selectedMain = null;
  let mainSlackEnabled = false;
  let mainReason = mainRecommendation.reason;
  if (args["slack-main-account"] && args["skip-main-slack"]) {
    throw new Error("Use either --slack-main-account or --skip-main-slack, not both.");
  }
  if (args["slack-main-account"]) {
    selectedMain = findAccount(accounts, args["slack-main-account"], "Main").accountId;
    mainSlackEnabled = true;
    mainReason = "selected by --slack-main-account";
  } else if (args["skip-main-slack"]) {
    selectedMain = null;
    mainSlackEnabled = false;
    mainReason = "skipped by --skip-main-slack";
  } else {
    selectedMain = mainRecommendation.accountId;
    mainSlackEnabled = Boolean(mainRecommendation.accountId);
  }

  return {
    compliance: {
      accountId: selectedCompliance,
      needsInput: !selectedCompliance,
      reason: args["slack-compliance-account"] ? "selected by --slack-compliance-account" : complianceRecommendation.reason,
    },
    main: {
      accountId: selectedMain,
      enabled: mainSlackEnabled,
      reason: mainReason,
    },
  };
}

async function writeStagedMapping(args) {
  const home = detectHome(args);
  const { file: configPath, config } = readOpenClawConfig(home);
  const accounts = detectSlackAccounts(config);
  const complianceRecommendation = recommendCompliance(accounts);
  const mainRecommendation = recommendMain(accounts);
  const selection = await selectSlackMapping(args, accounts, complianceRecommendation, mainRecommendation);

  const staged = {
    schema: "prodclaw.configure.v1",
    createdAt: new Date().toISOString(),
    source: {
      openclawHome: home,
      configPath,
    },
    slack: {
      complianceAccountId: selection.compliance.accountId,
      complianceNeedsInput: selection.compliance.needsInput,
      complianceReason: selection.compliance.reason,
      mainAccountId: selection.main.accountId,
      mainSlackEnabled: selection.main.enabled,
      mainReason: selection.main.reason,
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
  if (!selection.compliance.accountId) console.log("Compliance Slack still needs explicit input before apply/enable-cron.");
}

try {
  await writeStagedMapping(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

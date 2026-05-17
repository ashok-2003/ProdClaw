#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const prodClawCronPrefix = "prodclaw.compliance.";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "yes" || key === "skip-doctor") out[key] = true;
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

function isProdClawComplianceJob(job) {
  return typeof job?.name === "string" && job.name.startsWith(prodClawCronPrefix);
}

function runDoctor(home, rendered) {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const doctorScript = path.join(repoRoot, "scripts", "doctor.mjs");
  const args = [doctorScript, "--home", home, "--json"];
  if (rendered) args.push("--rendered", rendered);

  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    cwd: repoRoot,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error("Doctor reported BROKEN checks. Run `prodclaw doctor --home " + home + "` and fix BROKEN items before enable-cron.");
  }

  let checks;
  try {
    checks = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error("Doctor JSON output could not be parsed: " + error.message);
  }

  const broken = checks.filter((check) => check.status === "BROKEN");
  if (broken.length > 0) {
    throw new Error("Doctor reported BROKEN checks. Fix them before enable-cron.");
  }

  return checks;
}

function backupCronFile(cronFile) {
  const backupDir = path.join(path.dirname(path.dirname(cronFile)), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(backupDir, "cron-jobs-before-enable-" + stamp + ".json");
  fs.copyFileSync(cronFile, backup);
  return backup;
}

function enableCron(args) {
  if (!args.yes) {
    throw new Error("Refusing to enable cron without --yes.");
  }

  const home = detectHome(args);
  if (!fs.existsSync(home)) {
    throw new Error("OpenClaw home not found: " + home);
  }

  const cronFile = path.join(home, "cron", "jobs.json");
  if (!fs.existsSync(cronFile)) {
    throw new Error("Cron config not found: " + cronFile + ". Run render/apply before enable-cron.");
  }

  const rendered = args.rendered ? path.resolve(expandHome(args.rendered)) : null;
  if (!args["skip-doctor"]) runDoctor(home, rendered);

  const cron = readJson(cronFile);
  if (!Array.isArray(cron.jobs)) {
    throw new Error("Cron config must contain jobs array: " + cronFile);
  }

  const prodclawJobs = cron.jobs.filter(isProdClawComplianceJob);
  if (prodclawJobs.length === 0) {
    throw new Error("No ProdClaw compliance cron jobs found in " + cronFile + ". Expected names starting with " + prodClawCronPrefix);
  }

  const backup = backupCronFile(cronFile);
  const enabled = [];
  const alreadyEnabled = [];

  for (const job of cron.jobs) {
    if (!isProdClawComplianceJob(job)) continue;
    if (job.enabled === true) {
      alreadyEnabled.push(job.name);
      continue;
    }
    job.enabled = true;
    enabled.push(job.name);
  }

  fs.writeFileSync(cronFile, JSON.stringify(cron, null, 2) + "\n");

  console.log("Enabled ProdClaw compliance cron jobs in: " + cronFile);
  console.log("Backup: " + backup);
  console.log("Enabled jobs: " + enabled.length);
  for (const name of enabled) console.log("  enabled " + name);
  if (alreadyEnabled.length > 0) {
    console.log("Already enabled jobs: " + alreadyEnabled.length);
    for (const name of alreadyEnabled) console.log("  already enabled " + name);
  }
  console.log("Preserved non-ProdClaw cron jobs unchanged.");
  console.log("No cron jobs were run by this command.");
}

try {
  enableCron(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const templatesRoot = path.join(repoRoot, "templates");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "yes") out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function expandHome(input) {
  if (!input || input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function managedFiles() {
  return walk(templatesRoot)
    .filter((file) => file.endsWith(".tpl"))
    .map((file) => path.relative(templatesRoot, file).replace(/\.tpl$/, ""))
    .sort();
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error("Invalid JSON: " + file + ": " + error.message);
  }
}

function detectHome(args) {
  if (args.home) return path.resolve(expandHome(args.home));
  if (process.env.OPENCLAW_HOME) return path.resolve(expandHome(process.env.OPENCLAW_HOME));
  return path.join(os.homedir(), ".openclaw");
}

function backupManifestPath(backup) {
  return path.join(backup, "manifest.json");
}

function loadManagedBackup(backup) {
  const manifestPath = backupManifestPath(backup);
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Managed backup manifest not found: " + manifestPath);
  }

  const manifest = readJson(manifestPath);
  if (manifest.mode !== "managed") {
    throw new Error("Refusing to revert from non-managed backup mode: " + String(manifest.mode));
  }

  if (!Array.isArray(manifest.copiedFiles)) {
    throw new Error("Backup manifest missing copiedFiles array: " + manifestPath);
  }

  if (!Array.isArray(manifest.skippedFiles)) {
    throw new Error("Backup manifest missing skippedFiles array: " + manifestPath);
  }

  return manifest;
}

function findLatestManagedBackup(home) {
  const backupsDir = path.join(home, "backups");
  if (!fs.existsSync(backupsDir)) {
    throw new Error("No backups directory found: " + backupsDir);
  }

  const candidates = fs.readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("prodclaw-"))
    .map((entry) => path.join(backupsDir, entry.name))
    .filter((backup) => fs.existsSync(backupManifestPath(backup)))
    .map((backup) => {
      const manifest = loadManagedBackup(backup);
      return { backup, createdAt: manifest.createdAt ?? "" };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (candidates.length === 0) {
    throw new Error("No managed ProdClaw backups found in " + backupsDir);
  }

  return candidates[0].backup;
}

function assertManagedPath(rel, managedSet) {
  if (path.isAbsolute(rel) || rel.includes("..") || !managedSet.has(rel)) {
    throw new Error("Refusing to revert unmanaged or unsafe path: " + rel);
  }
}

function restoreCopiedFiles(home, backup, copiedFiles, managedSet) {
  const restored = [];
  for (const rel of copiedFiles) {
    assertManagedPath(rel, managedSet);
    const src = path.join(backup, rel);
    if (!fs.existsSync(src)) {
      throw new Error("Backup file listed in manifest is missing: " + src);
    }

    const dst = path.join(home, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    restored.push(rel);
  }
  return restored;
}

function removeCreatedFiles(home, skippedFiles, managedSet) {
  const removed = [];
  for (const item of skippedFiles) {
    const rel = typeof item === "string" ? item : item?.path;
    if (!rel) continue;
    assertManagedPath(rel, managedSet);

    const dst = path.join(home, rel);
    if (!fs.existsSync(dst)) continue;
    fs.unlinkSync(dst);
    removed.push(rel);
  }
  return removed;
}

function revert(args) {
  if (!args.yes) {
    throw new Error("Refusing to revert without --yes.");
  }

  const home = detectHome(args);
  if (!fs.existsSync(home)) {
    throw new Error("OpenClaw home not found: " + home);
  }

  const backup = args.backup
    ? path.resolve(expandHome(args.backup))
    : findLatestManagedBackup(home);

  if (!fs.existsSync(backup)) {
    throw new Error("Backup path not found: " + backup);
  }

  const manifest = loadManagedBackup(backup);
  const managedSet = new Set(managedFiles());

  for (const rel of manifest.managedFiles ?? []) {
    assertManagedPath(rel, managedSet);
  }

  const restored = restoreCopiedFiles(home, backup, manifest.copiedFiles, managedSet);
  const removed = removeCreatedFiles(home, manifest.skippedFiles, managedSet);

  console.log("Reverted ProdClaw managed files from: " + backup);
  console.log("Restored files: " + restored.length);
  for (const rel of restored) console.log("  restored " + rel);
  console.log("Removed files created by apply: " + removed.length);
  for (const rel of removed) console.log("  removed " + rel);
  console.log("Preserved sessions, memories, LanceDB data, logs, auth, runtime databases, non-ProdClaw skills, and non-ProdClaw cron jobs.");
}

try {
  revert(parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

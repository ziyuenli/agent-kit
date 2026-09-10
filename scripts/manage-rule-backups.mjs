#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = join(homedir(), ".agents/rule-backups");
const KEEP_COUNT = 5;
const KEEP_DAYS = 30;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const expand = (path) => resolve(path.replace(/^~(?=\/|$)/, homedir()));
const slug = (value) =>
  value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "change";

function readRegular(path) {
  if (!existsSync(path) || !lstatSync(path).isFile())
    throw new Error(`Expected a regular file: ${path}`);
  return readFileSync(path);
}

function atomicJson(path, value) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

function metadataFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const dir = join(root, entry.name);
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => join(dir, name));
  });
}

function readMetadata(path) {
  return { ...JSON.parse(readFileSync(path, "utf8")), recordPath: path };
}

function assertManaged(root, path) {
  const rel = relative(root, resolve(path));
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error(`Managed backup path escapes its root: ${path}`);
}

export function createRuleBackup({
  target,
  reason,
  root = DEFAULT_ROOT,
  now = new Date(),
}) {
  if (!target || !reason) throw new Error("target and reason are required");
  target = expand(target);
  root = expand(root);
  const content = readRegular(target);
  const contentHash = sha256(content);
  const targetDir = join(
    root,
    `${slug(basename(target))}-${sha256(target).slice(0, 12)}`,
  );
  mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  const usedAt = now.toISOString();
  for (const name of readdirSync(targetDir).filter((item) => item.endsWith(".json"))) {
    const recordPath = join(targetDir, name);
    const record = readMetadata(recordPath);
    if (record.target !== target || record.sha256 !== contentHash) continue;
    if (sha256(readRegular(record.backupPath)) !== contentHash)
      throw new Error(`Managed backup failed its recorded hash: ${record.backupPath}`);
    record.lastUsedAt = usedAt;
    record.lastReason = slug(reason);
    delete record.recordPath;
    atomicJson(recordPath, record);
    return { backupPath: record.backupPath, recordPath, reused: true };
  }

  const stamp = usedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const base = `${stamp}--${slug(reason)}--${contentHash.slice(0, 8)}`;
  const backupPath = join(targetDir, `${base}.md`);
  const recordPath = join(targetDir, `${base}.json`);
  writeFileSync(backupPath, content, { mode: 0o600, flag: "wx" });
  try {
    atomicJson(recordPath, {
      version: 1,
      target,
      reason: slug(reason),
      createdAt: usedAt,
      lastUsedAt: usedAt,
      sha256: contentHash,
      status: "prepared",
      pinned: false,
      backupPath,
    });
  } catch (error) {
    unlinkSync(backupPath);
    throw error;
  }
  return { backupPath, recordPath, reused: false };
}

export function verifyRuleBackup({ recordPath, now = new Date() }) {
  if (!recordPath) throw new Error("recordPath is required");
  recordPath = expand(recordPath);
  const record = readMetadata(recordPath);
  if (sha256(readRegular(record.backupPath)) !== record.sha256)
    throw new Error(`Backup verification failed: ${record.backupPath}`);
  record.status = "verified";
  record.verifiedAt = now.toISOString();
  record.postSha256 = sha256(readRegular(record.target));
  delete record.recordPath;
  atomicJson(recordPath, record);
  return record;
}

export function setRuleBackupPinned({ recordPath, pinned = true }) {
  if (!recordPath) throw new Error("recordPath is required");
  recordPath = expand(recordPath);
  const record = readMetadata(recordPath);
  record.pinned = pinned;
  delete record.recordPath;
  atomicJson(recordPath, record);
  return record;
}

export function pruneRuleBackups({
  root = DEFAULT_ROOT,
  apply = false,
  now = new Date(),
} = {}) {
  root = expand(root);
  const records = metadataFiles(root).map(readMetadata);
  const groups = Map.groupBy(records, (record) => record.target);
  const cutoff = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const candidates = [];
  for (const group of groups.values()) {
    const eligible = group
      .filter((record) => record.status === "verified" && !record.pinned)
      .sort(
        (a, b) =>
          Date.parse(b.lastUsedAt || b.createdAt) -
          Date.parse(a.lastUsedAt || a.createdAt),
      );
    const recent = new Set(eligible.slice(0, KEEP_COUNT).map((record) => record.recordPath));
    for (const record of eligible) {
      const usedAt = Date.parse(record.lastUsedAt || record.createdAt);
      if (!recent.has(record.recordPath) && usedAt < cutoff) candidates.push(record);
    }
  }

  const deleted = [];
  if (apply) {
    for (const record of candidates) {
      assertManaged(root, record.recordPath);
      assertManaged(root, record.backupPath);
      unlinkSync(record.backupPath);
      unlinkSync(record.recordPath);
      deleted.push(record.backupPath);
    }
  }
  return {
    apply,
    keepCount: KEEP_COUNT,
    keepDays: KEEP_DAYS,
    managedRecords: records.length,
    candidates: candidates.map((record) => record.backupPath),
    deleted,
  };
}

function option(args, name) {
  return args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    let result;
    if (command === "create") {
      result = createRuleBackup({
        target: option(args, "target"),
        reason: option(args, "reason"),
        root: option(args, "root") || DEFAULT_ROOT,
      });
    } else if (command === "verify") {
      result = verifyRuleBackup({ recordPath: option(args, "record") });
    } else if (command === "pin" || command === "unpin") {
      result = setRuleBackupPinned({
        recordPath: option(args, "record"),
        pinned: command === "pin",
      });
    } else if (command === "prune") {
      result = pruneRuleBackups({
        root: option(args, "root") || DEFAULT_ROOT,
        apply: args.includes("--apply"),
      });
    } else {
      throw new Error(
        "Usage: manage-rule-backups.mjs create --target=PATH --reason=SLUG [--root=PATH] | verify|pin|unpin --record=PATH | prune [--root=PATH] [--apply]",
      );
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

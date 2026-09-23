#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import {
  createRuleBackup,
  pruneRuleBackups,
  verifyRuleBackup,
} from "./manage-rule-backups.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const hash = (value) =>
  value === null ? null : createHash("sha256").update(value).digest("hex");
function read(path) {
  if (!existsSync(path)) return null;
  if (!lstatSync(path).isFile())
    throw new Error(`Expected a regular file: ${path}`);
  return readFileSync(path, "utf8");
}
function atomic(path, text, mode = 0o600) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, text, { mode, flag: "wx" });
    renameSync(temp, path);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}
// Guard for the shared rules path: it must stay a symlink to the repository file.
// A regular file here means something rewrote it non-atomically (write + rename
// replaces the link), which silently forks the shared rules.
export function sharedRulesLinkStatus({
  sharedPath = join(homedir(), ".agents/AGENTS.md"),
  repoRoot = dirname(root),
} = {}) {
  const path = resolve(sharedPath.replace(/^~(?=\/|$)/, homedir()));
  const target = join(repoRoot, "AGENTS.md");
  let entry;
  try {
    entry = lstatSync(path);
  } catch {
    return { path, target, state: "missing" };
  }
  if (!entry.isSymbolicLink()) return { path, target, state: "regular-file" };
  let resolvesTo;
  try {
    resolvesTo = realpathSync(path);
  } catch {
    return { path, target, state: "broken-link" };
  }
  let expected;
  try {
    expected = realpathSync(target);
  } catch {
    return { path, target, state: "wrong-target", resolvesTo };
  }
  return {
    path,
    target,
    state: resolvesTo === expected ? "ok" : "wrong-target",
    resolvesTo,
  };
}
export function syncRules({
  source = join(root, "profile/AGENTS.md"),
  agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi/agent"),
  apply = false,
  approve = null,
  beforeWrite,
} = {}) {
  agentDir = resolve(agentDir.replace(/^~(?=\/|$)/, homedir()));
  const destination = join(agentDir, "AGENTS.md");
  const stateDir = join(agentDir, "rules-sync");
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const lock = join(stateDir, "lock");
  mkdirSync(lock); // Existing locks require investigation, never automatic removal.
  try {
    const snapshot = join(stateDir, "last-synced.md");
    const s = read(source),
      d = read(destination),
      b = read(snapshot);
    if (!s?.trim()) throw new Error("Source rules are missing or empty");
    const status =
      s === d
        ? "equal"
        : b === null
          ? d === null
            ? "initial"
            : "first-review"
          : d === b
            ? "source-only"
            : s === b
              ? "global-only"
              : "both-changed";
    const token = hash(JSON.stringify([s, d, b]));
    const result = {
      status,
      source,
      destination,
      snapshot,
      token,
      applied: false,
    };
    if (!apply) return result;
    if (
      ["first-review", "global-only", "both-changed"].includes(status) &&
      approve !== token
    ) {
      throw new Error(
        `Review source, destination and snapshot before deployment. Status=${status}; approval token=${token}`,
      );
    }
    beforeWrite?.();
    if (s !== read(source) || d !== read(destination) || b !== read(snapshot))
      throw new Error("Inputs changed during synchronization; retry review");
    if (s !== d) {
      if (d !== null) {
        const backups = join(stateDir, "backups");
        const backup = createRuleBackup({
          target: destination,
          reason: "pi-entry-sync",
          root: backups,
        });
        result.backup = backup.backupPath;
        result.backupRecord = backup.recordPath;
        result.backupReused = backup.reused;
      }
      if (d !== read(destination))
        throw new Error("Destination changed after backup");
      const mode = d === null ? 0o600 : lstatSync(destination).mode & 0o777;
      atomic(destination, s, mode);
    }
    if (read(destination) !== s)
      throw new Error("Deployment verification failed");
    if (result.backupRecord) {
      verifyRuleBackup({ recordPath: result.backupRecord });
      result.prunedBackups = pruneRuleBackups({
        root: join(stateDir, "backups"),
        apply: true,
      }).deleted;
    }
    atomic(snapshot, s);
    atomic(
      join(stateDir, "state.json"),
      JSON.stringify(
        {
          source: resolve(source),
          sha256: hash(s),
          syncedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    result.applied = true;
    return result;
  } finally {
    rmdirSync(lock);
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    if (
      args.some(
        (a) =>
          a !== "--apply" && a !== "--check" && !a.startsWith("--approve="),
      )
    )
      throw new Error(
        "Usage: sync-agent-rules.mjs [--check|--apply] [--approve=review-token]",
      );
    const result = syncRules({
      apply: args.includes("--apply"),
      approve: args.find((a) => a.startsWith("--approve="))?.slice(10),
    });
    result.sharedRulesLink = sharedRulesLinkStatus();
    if (
      ["regular-file", "wrong-target", "broken-link"].includes(
        result.sharedRulesLink.state,
      )
    )
      process.exitCode = 1;
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

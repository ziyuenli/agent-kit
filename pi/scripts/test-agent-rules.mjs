import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sharedRulesLinkStatus, syncRules } from "./sync-agent-rules.mjs";
import {
  createRuleBackup,
  pruneRuleBackups,
  setRuleBackupPinned,
  verifyRuleBackup,
} from "./manage-rule-backups.mjs";

const root = mkdtempSync(join(tmpdir(), "pi-rules-test-"));
let count = 0;
function fixture() {
  const dir = join(root, String(count++));
  mkdirSync(dir);
  const source = join(dir, "source.md");
  writeFileSync(source, "A\n");
  return { source, agentDir: join(dir, "agent"), apply: true };
}
try {
  const f = fixture();
  let r = syncRules(f);
  assert.equal(r.status, "initial");
  assert.equal(readFileSync(r.destination, "utf8"), "A\n");
  assert.equal(syncRules(f).status, "equal");
  writeFileSync(f.source, "B\n");
  r = syncRules(f);
  assert.equal(r.status, "source-only");
  assert.equal(readFileSync(r.backup, "utf8"), "A\n");
  writeFileSync(r.destination, "Global edit\n");
  assert.equal(syncRules({ ...f, apply: false }).status, "global-only");
  assert.throws(() => syncRules(f), /Review source/);
  writeFileSync(f.source, "Merged\n");
  r = syncRules({ ...f, apply: false });
  assert.equal(r.status, "both-changed");
  assert.throws(() => syncRules({ ...f, approve: "stale" }), /Review source/);
  assert.equal(syncRules({ ...f, approve: r.token }).applied, true);
  writeFileSync(f.source, "Next\n");
  assert.throws(
    () =>
      syncRules({
        ...f,
        beforeWrite: () => writeFileSync(f.source, "Concurrent\n"),
      }),
    /Inputs changed/,
  );
  assert.equal(readFileSync(r.destination, "utf8"), "Merged\n");
  // A blocked backup directory must leave the live file unchanged.
  rmSync(join(f.agentDir, "rules-sync/backups"), { recursive: true });
  writeFileSync(join(f.agentDir, "rules-sync/backups"), "block");
  assert.throws(() => syncRules(f));
  assert.equal(readFileSync(r.destination, "utf8"), "Merged\n");
  const first = fixture();
  mkdirSync(first.agentDir);
  writeFileSync(join(first.agentDir, "AGENTS.md"), "Existing\n");
  assert.throws(() => syncRules(first), /first-review/);
  assert.equal(
    existsSync(join(first.agentDir, "rules-sync/last-synced.md")),
    false,
  );
  mkdirSync(join(first.agentDir, "rules-sync/lock"));
  assert.throws(() => syncRules(first), /EEXIST/);

  const managed = join(root, "managed");
  const target = join(root, "shared.md");
  const records = [];
  for (let day = 0; day < 7; day++) {
    writeFileSync(target, `version ${day}\n`);
    const now = new Date(Date.UTC(2026, 0, day + 1));
    const backup = createRuleBackup({
      target,
      reason: "test-change",
      root: managed,
      now,
    });
    verifyRuleBackup({ recordPath: backup.recordPath, now });
    records.push(backup);
  }
  setRuleBackupPinned({ recordPath: records[0].recordPath });
  const reused = createRuleBackup({
    target,
    reason: "same-content",
    root: managed,
    now: new Date(Date.UTC(2026, 0, 8)),
  });
  assert.equal(reused.reused, true);
  assert.equal(reused.recordPath, records[6].recordPath);

  writeFileSync(target, "prepared only\n");
  const prepared = createRuleBackup({
    target,
    reason: "unverified",
    root: managed,
    now: new Date(Date.UTC(2026, 0, 9)),
  });
  const pruneAt = new Date(Date.UTC(2026, 2, 1));
  let pruned = pruneRuleBackups({ root: managed, now: pruneAt });
  assert.deepEqual(pruned.candidates, [records[1].backupPath]);
  assert.equal(existsSync(records[1].backupPath), true);
  pruned = pruneRuleBackups({ root: managed, now: pruneAt, apply: true });
  assert.deepEqual(pruned.deleted, [records[1].backupPath]);
  assert.equal(existsSync(records[1].backupPath), false);
  assert.equal(existsSync(records[0].backupPath), true);
  assert.equal(existsSync(prepared.backupPath), true);
  const linkDir = join(root, "link");
  mkdirSync(linkDir);
  const linkRepo = join(linkDir, "repo");
  mkdirSync(linkRepo);
  const linkTarget = join(linkRepo, "AGENTS.md");
  writeFileSync(linkTarget, "R\n");
  const sharedPath = join(linkDir, "shared.md");
  const linkState = () =>
    sharedRulesLinkStatus({ sharedPath, repoRoot: linkRepo }).state;
  assert.equal(linkState(), "missing");
  writeFileSync(sharedPath, "R\n");
  assert.equal(linkState(), "regular-file");
  rmSync(sharedPath);
  symlinkSync(linkTarget, sharedPath);
  assert.equal(linkState(), "ok");
  rmSync(sharedPath);
  writeFileSync(join(linkDir, "other.md"), "R\n");
  symlinkSync(join(linkDir, "other.md"), sharedPath);
  assert.equal(linkState(), "wrong-target");
  rmSync(sharedPath);
  symlinkSync(join(linkDir, "absent.md"), sharedPath);
  assert.equal(linkState(), "broken-link");

  process.stdout.write("Rules synchronization checks passed\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}

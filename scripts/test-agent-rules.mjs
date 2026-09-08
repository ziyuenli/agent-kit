import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncRules } from "./sync-agent-rules.mjs";

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
  process.stdout.write("Rules synchronization checks passed\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}

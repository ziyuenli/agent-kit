import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { classifyBashCommand, prepareMoveBackup } = await import(
  "../extensions/safety/index.ts"
);

const root = mkdtempSync(join(tmpdir(), "pi-safety-test-"));
const config = { temporaryPaths: [], allowedDestructivePaths: [] };

try {
  assert.equal(classifyBashCommand("git push origin main", root, config).action, "ask");
  assert.equal(classifyBashCommand("ls /System", root, config).action, "allow");
  assert.equal(classifyBashCommand("printf x > /System/example", root, config).action, "deny");
  assert.equal(classifyBashCommand("rm -rf /System/Library/example", root, config).action, "deny");
  assert.equal(classifyBashCommand("rm -rf /tmp/pi-safety-test", root, { temporaryPaths: ["/tmp"] }).action, "allow");

  const source = join(root, "source.txt");
  const destination = join(root, "destination.txt");
  writeFileSync(source, "new");
  writeFileSync(destination, "old");
  const move = classifyBashCommand(`mv ${source} ${destination}`, root, config);
  assert.equal(move.action, "ask");
  assert.ok(move.move);
  assert.equal(classifyBashCommand(`cd ${root} && mv ${source} ${destination}`, root, config).action, "deny");

  const backupRoot = join(root, "backups");
  const backup = await prepareMoveBackup(move.move, {
    backupRoot,
    cwd: root,
    toolCallId: "test-call",
  });
  assert.equal(readFileSync(backup.backupPath, "utf8"), "old");
  assert.ok(existsSync(join(backupRoot, "operations.jsonl")));

  const script = join(root, "cleanup.py");
  writeFileSync(script, 'import os\nos.remove("/tmp/pi-safety-test")\n');
  assert.equal(classifyBashCommand(`python3 ${script}`, root, { temporaryPaths: ["/tmp"] }).action, "allow");
  assert.equal(classifyBashCommand('node -e "require(\'fs\').rmSync(\'/tmp/pi-safety-test\')"', root, { temporaryPaths: ["/tmp"] }).action, "allow");
  assert.equal(classifyBashCommand('node -e "require(\'fs\').rmSync(\'/Users/example/data\')"', root, config).action, "ask");

  mkdirSync(join(root, "project"));
  writeFileSync(script, `import os\nos.remove("${join(root, "project", "data")}")\n`);
  assert.equal(classifyBashCommand(`python3 ${script}`, root, config).action, "ask");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("pi-safety self-check passed");

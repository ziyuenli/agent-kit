#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = join(root, "profile", "packages.json");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed`);
}

try {
  if (!existsSync(manifest))
    throw new Error(`Missing package manifest: ${manifest}`);
  const { packages } = JSON.parse(readFileSync(manifest, "utf8"));
  if (!Array.isArray(packages))
    throw new Error("profile/packages.json must contain a packages array");

  run(process.execPath, [join(root, "scripts", "apply-config.mjs")]);
  for (const source of packages) run("pi", ["install", source]);
  run("pi", ["install", root]);
  process.stdout.write(
    "\nPi profile installed. Run `pi list` to verify, then sign in again with `/login` as needed.\n",
  );
} catch (error) {
  process.stderr.write(`Install failed: ${error.message}\n`);
  process.exitCode = 1;
}

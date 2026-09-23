#!/usr/bin/env node
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = join(root, "profile", "packages.json");
const piHome =
  process.env.PI_AGENT_HOME ?? join(process.env.HOME, ".pi", "agent");

// Cold load: these packages get INSTALLED (so capability-loader can switch them on
// without network) but are NOT put into settings.packages at startup. They are added
// on demand by the capability-loader extension via /capability-enable <name>.
const LAZY_SOURCES = [
  "npm:pi-web-access@0.27.0",
  "npm:pi-lens@4.1.3",
  "npm:@plannotator/pi-extension@0.27.9",
  "npm:pi-mcp-adapter@2.31.0",
];

const ZSH_ALIASES = `\n# pi cold-load aliases (agent-kit)\npiweb() { pi -e npm:pi-web-access@0.27.0 "$@" }\npilens() { pi -e npm:pi-lens@4.1.3 "$@" }\npimcp() { pi -e npm:pi-mcp-adapter@2.31.0 "$@" }\n`;

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed`);
}

// After `pi install` adds every pinned package to settings.packages, drop the cold-load
// set so the next cold start stays fast. They remain installed for on-demand loading.
function stripLazyFromSettings() {
  const settingsPath = join(piHome, "settings.json");
  if (!existsSync(settingsPath)) return;
  try {
    const s = JSON.parse(readFileSync(settingsPath, "utf8"));
    if (Array.isArray(s.packages)) {
      const before = s.packages.length;
      s.packages = s.packages.filter((p) => !LAZY_SOURCES.includes(p));
      if (s.packages.length !== before) {
        writeFileSync(settingsPath, `${JSON.stringify(s, null, 2)}\n`);
        process.stdout.write(
          "Trimmed settings.packages: heavy packages kept installed but not autoloaded (cold load).\n",
        );
      }
    }
  } catch (error) {
    process.stderr.write(
      `Could not trim settings.packages: ${error.message}\n`,
    );
  }
}

function appendZshAliases() {
  const zshrc = join(process.env.HOME, ".zshrc");
  if (!existsSync(zshrc)) {
    writeFileSync(zshrc, ZSH_ALIASES);
    process.stdout.write("Wrote pi aliases to ~/.zshrc\n");
    return;
  }
  if (readFileSync(zshrc, "utf8").includes("pi cold-load aliases")) {
    process.stdout.write("~/.zshrc already has the pi aliases\n");
    return;
  }
  appendFileSync(zshrc, ZSH_ALIASES);
  process.stdout.write("Appended pi aliases to ~/.zshrc\n");
}

// The update-pi skill lives in the Pi source fork, so expose it under the shared
// skills directory. Without this link a Pi session outside ~/pi cannot discover the
// skill and routes an upgrade request to the npm-global `pi update` self-update
// instead of the local source checkout.
function linkUpdatePiSkill() {
  const home = process.env.HOME;
  const source = join(home, "pi", ".pi", "skills", "update-pi.md");
  if (!existsSync(source)) {
    process.stdout.write(
      `Skipped update-pi skill link: ${source} not found (clone the Pi fork first).\n`,
    );
    return;
  }
  const link = join(home, ".agents", "skills", "update-pi", "SKILL.md");
  mkdirSync(dirname(link), { recursive: true });
  try {
    symlinkSync(source, link);
    process.stdout.write(`Linked update-pi skill: ${link} -> ${source}\n`);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    process.stdout.write("update-pi skill link already present\n");
  }
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
  stripLazyFromSettings();
  appendZshAliases();
  linkUpdatePiSkill();
  process.stdout.write(
    "\nPi profile installed. Run `pi`, then sign in again with `/login` as needed.\n",
  );
} catch (error) {
  process.stderr.write(`Install failed: ${error.message}\n`);
  process.exitCode = 1;
}

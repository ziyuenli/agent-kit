#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const piHome =
  process.env.PI_AGENT_HOME ?? join(process.env.HOME, ".pi", "agent");
const profileDir = join(root, "profile", "config");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function merge(current, incoming) {
  if (!isObject(current) || !isObject(incoming)) return incoming;
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = key in current ? merge(current[key], value) : value;
  }
  return merged;
}

function applyJson(sourceName, destination) {
  const source = join(profileDir, sourceName);
  if (!existsSync(source)) return;
  try {
    const incoming = JSON.parse(readFileSync(source, "utf8"));
    const current = existsSync(destination)
      ? JSON.parse(readFileSync(destination, "utf8"))
      : {};
    mkdirSync(dirname(destination), { recursive: true });
    if (existsSync(destination)) cpSync(destination, `${destination}.backup`);
    writeFileSync(
      destination,
      `${JSON.stringify(merge(current, incoming), null, 2)}\n`,
    );
    process.stdout.write(
      `Applied ${sourceName}; previous file backed up when present.\n`,
    );
  } catch (error) {
    process.stderr.write(`Skipped ${sourceName}: ${error.message}\n`);
  }
}

applyJson("settings.json", join(piHome, "settings.json"));
applyJson("mcp.json", join(piHome, "mcp.json"));
applyJson(
  "safety.json",
  join(piHome, "extensions", "pi-safety", "config.json"),
);

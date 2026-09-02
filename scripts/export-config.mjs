#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const piHome =
  process.env.PI_AGENT_HOME ?? join(process.env.HOME, ".pi", "agent");
const outputDir = join(root, "profile", "config");
const sensitiveKey =
  /(?:api[_-]?key|token|secret|password|authorization|credential|private[_-]?key)/i;

function redact(value, key = "") {
  if (sensitiveKey.test(key)) return undefined;
  if (Array.isArray(value))
    return value
      .map((item) => redact(item))
      .filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([childKey, childValue]) => [
          childKey,
          redact(childValue, childKey),
        ])
        .filter(([, childValue]) => childValue !== undefined),
    );
  }
  return value;
}

function exportJson(source, destination) {
  if (!existsSync(source)) {
    process.stdout.write(`Skipped missing ${source}\n`);
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(source, "utf8"));
    const portable = redact(parsed);
    // profile/packages.json is authoritative: never carry machine-specific local package paths.
    if (
      source.endsWith("/settings.json") &&
      portable &&
      typeof portable === "object"
    ) {
      delete portable.packages;
    }
    writeFileSync(destination, `${JSON.stringify(portable, null, 2)}\n`);
    process.stdout.write(`Exported ${source}\n`);
  } catch (error) {
    process.stderr.write(
      `Skipped invalid JSON at ${source}: ${error.message}\n`,
    );
  }
}

mkdirSync(outputDir, { recursive: true });
exportJson(join(piHome, "settings.json"), join(outputDir, "settings.json"));
exportJson(join(piHome, "mcp.json"), join(outputDir, "mcp.json"));
exportJson(
  join(piHome, "extensions", "pi-permission-system", "config.json"),
  join(outputDir, "permission-system.json"),
);

console.log(
  "\nReview profile/config before committing. auth.json and sensitive JSON keys are intentionally excluded.",
);

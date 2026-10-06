#!/usr/bin/env node
// Deploy the agent-kit shared rules and skills into every installed harness.
//
// Each <agent>/deploy.json describes that harness's wiring; this script is the
// single executor. Adding a harness means adding a directory with a
// deploy.json, not editing this file.
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(repoRoot, "skills");

const usage = `usage: node scripts/deploy.mjs <agent>|--all [--dry-run]

Reads <agent>/deploy.json and applies it: links or dispatches the shared rules,
then checks the skill roots that harness scans. Idempotent; refuses to
overwrite a regular file. A rules target may use {home} for the detected
harness path. Options:
  --all       every <agent>/deploy.json whose harness is detected on this machine
  --dry-run   print the actions without touching the filesystem
`;

/** Expand a leading ~ and $VAR references, failing loud on an unset variable. */
function expand(value, { optional = false } = {}) {
	const withHome =
		value === "~" ? homedir() : value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
	let unresolved = false;
	const expanded = withHome.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, name) => {
		const found = process.env[name];
		if (found === undefined || found.trim() === "") {
			unresolved = true;
			return match;
		}
		return found;
	});
	if (!unresolved) return expanded;
	if (optional) return undefined;
	throw new Error(`environment variable is unset; cannot resolve ${value}`);
}

/** Skill directory names maintained at the repository root. */
function listSkills() {
	return readdirSync(skillsRoot, { withFileTypes: true })
		.filter((entry) => {
			if (entry.isDirectory()) return true;
			if (!entry.isSymbolicLink()) return false;
			return existsSync(join(skillsRoot, entry.name));
		})
		.map((entry) => entry.name)
		.sort();
}

/** Link source to target, replacing only a stale link to agent-kit. */
function linkSkillOrRules({ source, target, dryRun, lines }) {
	const parent = dirname(target);
	if (!existsSync(parent)) {
		throw new Error(`parent directory does not exist: ${parent}`);
	}
	if (lstatSync(target, { throwIfNoEntry: false }) === undefined) {
		lines.push(`${dryRun ? "would create" : "created"} ${target} -> ${source}`);
		if (!dryRun) symlinkSync(source, target);
		return "changed";
	}
	if (!lstatSync(target).isSymbolicLink()) {
		throw new Error(`${target} exists and is not a symlink; refusing to overwrite it`);
	}
	const current = readlinkSync(target);
	if (current === source) {
		lines.push(`unchanged ${target}`);
		return "unchanged";
	}
	lines.push(`${dryRun ? "would replace" : "replaced"} stale link ${target} (was ${current})`);
	if (!dryRun) {
		unlinkSync(target);
		symlinkSync(source, target);
	}
	return "changed";
}

/** Report one skill root without creating anything. */
function reportSkillRoot(root, skills, lines) {
	const problems = [];
	for (const skill of skills) {
		const target = join(root, skill);
		const stats = lstatSync(target, { throwIfNoEntry: false });
		if (stats === undefined) {
			lines.push(`missing   ${target}`);
			problems.push(skill);
		} else if (stats.isSymbolicLink()) {
			lines.push(`ok        ${target} -> ${readlinkSync(target)}`);
		} else {
			lines.push(`present   ${target} (not a symlink)`);
		}
	}
	return problems;
}

/** Load and validate one <agent>/deploy.json. */
function loadAgent(name) {
	const configPath = join(repoRoot, name, "deploy.json");
	if (!existsSync(configPath)) {
		throw new Error(`no deploy.json at ${configPath}`);
	}
	const config = JSON.parse(readFileSync(configPath, "utf8"));
	for (const field of ["harness", "detect", "rules", "skillRoots"]) {
		if (config[field] === undefined) throw new Error(`${configPath} is missing "${field}"`);
	}
	return { name, configPath, config };
}

/** Every immediate child directory of the repository that declares a deploy.json. */
function discoverAgents() {
	return readdirSync(repoRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(repoRoot, entry.name, "deploy.json")))
		.map((entry) => entry.name)
		.sort();
}

/** First detect path that exists, or undefined when the harness is absent. */
function detectHarness(paths) {
	for (const candidate of paths) {
		// A detection candidate may name an unset variable (for example $DSH_HOME
		// in a plain terminal); that candidate is simply not present here.
		const expanded = expand(candidate, { optional: true });
		if (expanded !== undefined && existsSync(expanded)) return expanded;
	}
	return undefined;
}

function deployAgent({ name, configPath, config }, { dryRun, skills }) {
	const lines = [];
	const counts = { changed: 0, unchanged: 0, warnings: 0 };
	console.log(`\n== ${name} (${config.harness}) ==`);
	console.log(`   config ${configPath}`);

	const detected = detectHarness(config.detect);
	if (detected === undefined) {
		console.log(`   harness not detected (tried: ${config.detect.join(", ")})`);
		return { skipped: true, lines, counts };
	}
	console.log(`   detected ${detected}`);

	const { mode } = config.rules;
	if (mode === "symlink") {
		const source = join(repoRoot, config.rules.source);
		if (!existsSync(source)) throw new Error(`rules source does not exist: ${source}`);
		// {home} is the detected harness path, so a target never depends on the
		// variable that detection had to tolerate being unset.
		const target = expand(config.rules.target.split("{home}").join(detected));
		const result = linkSkillOrRules({ source, target, dryRun, lines });
		counts[result] += 1;
	} else if (mode === "dispatch") {
		const command = config.rules.command;
		if (!Array.isArray(command) || command.length === 0) {
			throw new Error(`${configPath}: rules.command must be a non-empty array`);
		}
		if (dryRun) {
			lines.push(`would run ${command.join(" ")}`);
		} else {
			console.log(`   running ${command.join(" ")}`);
			const run = spawnSync(command[0], command.slice(1), { cwd: repoRoot, stdio: "inherit" });
			if (run.status !== 0) {
				throw new Error(`dispatch failed with exit code ${run.status}: ${command.join(" ")}`);
			}
			lines.push(`dispatched ${command.join(" ")}`);
			counts.changed += 1;
		}
	} else {
		throw new Error(`${configPath}: unsupported rules.mode "${mode}"`);
	}

	for (const root of config.skillRoots) {
		const rootPath = expand(root.path);
		if (root.action === "ensure") {
			if (!existsSync(rootPath)) {
				throw new Error(`skill root does not exist: ${rootPath}`);
			}
			for (const skill of skills) {
				const result = linkSkillOrRules({
					source: join(skillsRoot, skill),
					target: join(rootPath, skill),
					dryRun,
					lines,
				});
				counts[result] += 1;
			}
		} else if (root.action === "report") {
			if (!existsSync(rootPath)) {
				lines.push(`skill root absent, skipped: ${rootPath}`);
				continue;
			}
			const problems = reportSkillRoot(rootPath, skills, lines);
			if (problems.length > 0) {
				counts.warnings += problems.length;
				lines.push(`warning   ${problems.length} skill(s) not linked in ${rootPath}`);
			}
		} else {
			throw new Error(`${configPath}: unsupported skill root action "${root.action}"`);
		}
	}

	for (const line of lines) console.log(`   ${line}`);
	if (config.notes !== undefined) console.log(`   note: ${config.notes}`);
	return { skipped: false, lines, counts };
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const targets = argv.filter((arg) => arg !== "--dry-run");

if (argv.includes("--help") || argv.includes("-h")) {
	process.stdout.write(usage);
	process.exit(0);
}
if (targets.length !== 1) {
	process.stderr.write(usage);
	process.exit(2);
}

const skills = listSkills();
const available = discoverAgents();
const selected =
	targets[0] === "--all"
		? available
		: [targets[0]];
if (selected.length === 0) {
	console.error("deploy: no <agent>/deploy.json found in the repository");
	process.exit(1);
}

let failures = 0;
const totals = { changed: 0, unchanged: 0, warnings: 0, skipped: 0 };
for (const name of selected) {
	let loaded;
	try {
		loaded = loadAgent(name);
	} catch (error) {
		console.error(`deploy: ${error.message}${name === targets[0] ? `\n  available agents: ${available.join(", ")}` : ""}`);
		failures += 1;
		continue;
	}
	try {
		const result = deployAgent(loaded, { dryRun, skills });
		if (result.skipped) {
			totals.skipped += 1;
			// Naming one agent asserts it is installed; --all only covers what is here.
			if (targets[0] !== "--all") {
				console.error(`   error: harness ${loaded.config.harness} not detected on this machine`);
				failures += 1;
			}
			continue;
		}
		totals.changed += result.counts.changed;
		totals.unchanged += result.counts.unchanged;
		totals.warnings += result.counts.warnings;
	} catch (error) {
		console.error(`   error: ${error.message}`);
		failures += 1;
	}
}

console.log(
	`\ndeploy: ${totals.changed} changed, ${totals.unchanged} unchanged, ${totals.skipped} skipped, ${totals.warnings} warning(s)${dryRun ? " [dry-run]" : ""}`,
);
process.exit(failures > 0 ? 1 : 0);

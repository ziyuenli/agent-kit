import { randomUUID } from "node:crypto";
import { appendFile, cp, mkdir } from "node:fs/promises";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statfsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const BACKUP_MARGIN_BYTES = 1024 * 1024;
const DEFAULT_TEMPORARY_PATHS = ["/tmp"];
const OPERATORS = new Set([";", "|", "&", "(", ")", "<", ">"]);
const HARD_COMMANDS = new Set([
	"sudo", "doas", "launchctl", "systemctl", "service", "diskutil", "mkfs", "newfs", "dd",
	"shutdown", "reboot", "halt", "poweroff", "networksetup", "scutil", "pfctl", "kill", "killall", "pkill",
]);
const MUTATING_COMMANDS = new Set([
	"bash", "bun", "chgrp", "chmod", "chown", "cp", "install", "ln", "mkdir", "mv", "node", "nodejs",
	"perl", "python", "python3", "ruby", "sed", "sh", "tee", "touch", "truncate", "unlink",
]);
const HARD_PATHS = [
	"/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/private/etc", "/private/var/db",
	"/private/var/run", "/private/var/launchd", "/private/var/root", "/var/root", "/Applications",
];
const DELETION_COMMANDS = ["rm", "rmdir", "unlink"] as const;
const SCRIPT_RUNNERS = ["python", "python3", "node", "nodejs", "deno", "bun", "ruby", "perl", "sh", "bash"];

export interface SafetyConfig {
	allowedDestructivePaths?: string[];
	temporaryPaths?: string[];
}

export interface MovePlan {
	source: string;
	destination: string;
}

export interface SafetyDecision {
	action: "allow" | "ask" | "deny";
	reason: string;
	kind?: string;
	move?: MovePlan;
}

interface RuntimeConfig extends Required<SafetyConfig> {
	backupRoot: string;
	configError?: string;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function expand(value: string): string {
	return value === "~" ? homedir() : value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}

function realPath(value: string): string {
	const normalized = normalize(value);
	try {
		return realpathSync(normalized);
	} catch {
		const tail: string[] = [];
		let current = normalized;
		while (true) {
			try {
				let result = realpathSync(current);
				for (let index = tail.length - 1; index >= 0; index--) result = join(result, tail[index]);
				return result;
			} catch {
				const parent = dirname(current);
				if (parent === current) return normalized;
				tail.push(basename(current));
				current = parent;
			}
		}
	}
}

function pathFrom(value: string, cwd: string): string {
	const expanded = expand(value);
	return realPath(isAbsolute(expanded) ? expanded : resolve(cwd, expanded));
}

function inside(candidate: string, root: string): boolean {
	const rest = relative(realPath(root), realPath(candidate));
	return rest === "" || (rest !== ".." && !rest.startsWith(`..${sep}`) && !isAbsolute(rest));
}

function hardPath(path: string): boolean {
	return HARD_PATHS.some((root) => inside(path, root));
}

function allowedPath(path: string, config: SafetyConfig): boolean {
	return (
		(config.allowedDestructivePaths ?? []).some((root) => inside(path, root)) ||
		(config.temporaryPaths ?? DEFAULT_TEMPORARY_PATHS).some((root) => {
			const rest = relative(realPath(root), realPath(path));
			return rest !== "" && rest !== ".." && !rest.startsWith(`..${sep}`) && !isAbsolute(rest);
		})
	);
}

function shellWords(command: string): string[] | undefined {
	const result: string[] = [];
	let word = "";
	let quote: "'" | '"' | undefined;
	let escaped = false;
	const push = () => {
		if (word) result.push(word);
		word = "";
	};

	for (let index = 0; index < command.length; index++) {
		const char = command[index];
		if (escaped) {
			word += char;
			escaped = false;
		} else if (quote === "'") {
			if (char === "'") quote = undefined;
			else word += char;
		} else if (quote === '"') {
			if (char === '"') quote = undefined;
			else if (char === "\\") escaped = true;
			else word += char;
		} else if (char === "'") quote = "'";
		else if (char === '"') quote = '"';
		else if (char === "\\") escaped = true;
		else if (char === "`" || (char === "$" && command[index + 1] === "(")) return undefined;
		else if (/\s/.test(char)) push();
		else if (OPERATORS.has(char)) {
			push();
			result.push(char);
		} else word += char;
	}
	if (quote || escaped) return undefined;
	push();
	return result;
}

function commandIndexes(words: readonly string[], name: string): number[] {
	const result: number[] = [];
	let atCommand = true;
	for (let index = 0; index < words.length; index++) {
		const word = words[index];
		if (OPERATORS.has(word)) {
			atCommand = true;
			continue;
		}
		if (!atCommand) continue;
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word) || word === "env" || word === "command") continue;
		if (basename(word) === name) result.push(index);
		atCommand = false;
	}
	return result;
}

function commandNames(words: readonly string[]): string[] {
	return [...new Set([...HARD_COMMANDS, ...MUTATING_COMMANDS])].filter((name) => commandIndexes(words, name).length > 0);
}

function operands(words: readonly string[], commandIndex: number): string[] {
	const result: string[] = [];
	let options = true;
	for (let index = commandIndex + 1; index < words.length; index++) {
		const word = words[index];
		if (OPERATORS.has(word)) break;
		if (options && word === "--") {
			options = false;
			continue;
		}
		if (options && word.startsWith("-")) continue;
		result.push(word);
	}
	return result;
}

function literal(value: string): boolean {
	return !/[?$*\[\]{}]/.test(value) && !value.includes("$") && !value.includes("`");
}

function mutatingSystemPath(words: readonly string[], cwd: string, force = false): SafetyDecision | undefined {
	const changesPath = force || commandNames(words).some((name) => MUTATING_COMMANDS.has(name)) || words.some((word) => [">", ">>"].includes(word));
	if (!changesPath) return undefined;
	for (const word of words) {
		if (!literal(word) || word.startsWith("-")) continue;
		const path = pathFrom(word, cwd);
		if (hardPath(path)) {
			return { action: "deny", kind: "system-path", reason: "命令触及系统保护路径，禁止执行。" };
		}
	}
	return undefined;
}

function gitOperations(words: readonly string[]): Array<{ name: string; args: string[] }> {
	const result: Array<{ name: string; args: string[] }> = [];
	for (const index of commandIndexes(words, "git")) {
		let cursor = index + 1;
		while (cursor < words.length && !OPERATORS.has(words[cursor])) {
			const word = words[cursor];
			if (["-C", "-c", "--git-dir", "--work-tree"].includes(word)) cursor += 2;
			else if (word.startsWith("--") && word.includes("=")) cursor++;
			else if (word.startsWith("-")) cursor++;
			else {
				result.push({ name: word, args: words.slice(cursor + 1).filter((item) => !OPERATORS.has(item)) });
				break;
			}
		}
	}
	return result;
}

function gitDecision(words: readonly string[]): SafetyDecision | undefined {
	for (const git of gitOperations(words)) {
		if (git.name === "push") return { action: "ask", kind: "git-push", reason: "所有 git push 都会改变远程仓库状态，必须逐次确认。" };
		const destructive =
			git.name === "rebase" ||
			git.name === "restore" ||
			(git.name === "remote" && git.args[0] === "remove") ||
			(git.name === "stash" && ["drop", "clear"].includes(git.args[0])) ||
			(git.name === "tag" && git.args[0] === "-d") ||
			(git.name === "commit" && git.args.includes("--amend")) ||
			(git.name === "branch" && git.args.includes("-D")) ||
			(git.name === "reset" && git.args.includes("--hard")) ||
			git.name === "clean" ||
			(git.name === "checkout" && git.args.includes("--"));
		if (destructive) return { action: "ask", kind: `git-${git.name}`, reason: `Git 操作 ${git.name} 可能丢弃或重写历史，必须逐次确认。` };
	}
	return undefined;
}

function deletionDecision(words: readonly string[], cwd: string, config: SafetyConfig): SafetyDecision | undefined {
	for (const command of DELETION_COMMANDS) {
		for (const index of commandIndexes(words, command)) {
			const targets = operands(words, index);
			if (targets.length === 0) continue;
			if (targets.some((target) => !literal(target))) return { action: "deny", kind: `${command}-unresolved`, reason: `${command} 的目标包含变量或通配符，无法安全判断删除范围，已阻止。` };
			const paths = targets.map((target) => pathFrom(target, cwd));
			if (paths.some(hardPath)) return { action: "deny", kind: `${command}-system`, reason: `${command} 触及系统保护路径，禁止执行。` };
			if (!paths.every((path) => allowedPath(path, config))) return { action: "ask", kind: command, reason: `${command} 会删除文件或目录，必须逐次确认。` };
		}
	}
	for (const index of commandIndexes(words, "find")) {
		const end = words.indexOf("-delete", index + 1);
		if (end < 0) continue;
		const roots = words.slice(index + 1, end).filter((word) => !OPERATORS.has(word) && !word.startsWith("-"));
		if (roots.some((root) => !literal(root))) return { action: "deny", kind: "find-unresolved", reason: "find -delete 的搜索路径无法安全解析，已阻止。" };
		const paths = roots.map((root) => pathFrom(root, cwd));
		if (paths.some(hardPath)) return { action: "deny", kind: "find-system", reason: "find -delete 触及系统保护路径，禁止执行。" };
		if (!paths.length || !paths.every((path) => allowedPath(path, config))) return { action: "ask", kind: "find-delete", reason: "find -delete 会删除匹配文件，必须逐次确认。" };
	}
	return undefined;
}

function scriptDecision(words: readonly string[], cwd: string, config: SafetyConfig): SafetyDecision | undefined {
	for (const runner of SCRIPT_RUNNERS) {
		for (const index of commandIndexes(words, runner)) {
			const args = words.slice(index + 1).filter((word) => !OPERATORS.has(word));
			const inline = args.findIndex((arg) => ["-c", "-e", "--eval"].includes(arg));
			let source: string | undefined;
			if (inline >= 0) source = args[inline + 1] ?? "";
			else {
				const script = args.find((arg) => /\.(?:py|js|mjs|cjs|sh|rb|pl)$/.test(arg));
				if (!script) continue;
				if (!literal(script)) return { action: "deny", kind: "script-unresolved", reason: "脚本路径无法安全解析，已阻止执行。" };
				try {
					source = readFileSync(pathFrom(script, cwd), "utf8");
				} catch (error) {
					return { action: "deny", kind: "script-unreadable", reason: `无法读取脚本进行预扫描：${message(error)}` };
				}
			}
			if (!source || !/(?:os\.(?:remove|unlink)|shutil\.rmtree|Path\.(?:unlink|rmdir)|\.(?:rm|rmSync|unlink|unlinkSync|rmdir|rmdirSync)\s*\(|\b(?:rm|rmdir|unlink)\b|find\b[^\n]*-delete)/.test(source)) continue;
			const targets = [...source.matchAll(/(?:os\.(?:remove|unlink)|shutil\.rmtree|Path\.(?:unlink|rmdir)|\.(?:rm|rmSync|unlink|unlinkSync|rmdir|rmdirSync))\s*\(\s*["']([^"']+)["']/g), ...source.matchAll(/\b(?:rm|rmdir|unlink)\b(?:\s+-[^\s]+)*\s+["']?([^"'\s;|]+)/g)].map((match) => match[1]);
			if (!targets.length) return { action: "deny", kind: "script-unresolved-delete", reason: "脚本包含删除行为，但目标无法静态确认，已阻止。" };
			const paths = targets.map((target) => pathFrom(target, cwd));
			if (paths.some(hardPath)) return { action: "deny", kind: "script-system-delete", reason: "脚本删除行为触及系统保护路径，禁止执行。" };
			if (!paths.every((path) => allowedPath(path, config))) return { action: "ask", kind: "script-delete", reason: "脚本包含非临时文件删除行为，必须逐次确认。" };
		}
	}
	return undefined;
}

export function classifyBashCommand(command: string, cwd: string, config: SafetyConfig = {}): SafetyDecision {
	const words = shellWords(command);
	if (!words) return { action: "deny", kind: "unparseable", reason: "命令包含无法安全解析的 shell 语法，已阻止执行。" };
	for (const hard of HARD_COMMANDS) {
		if (commandIndexes(words, hard).length) return { action: "deny", kind: `system-command-${hard}`, reason: `命令 ${hard} 可能改变系统运行状态，禁止执行。` };
	}
	const git = gitDecision(words);
	if (git) return mutatingSystemPath(words, cwd, true) ?? git;
	const pathGuard = mutatingSystemPath(words, cwd);
	if (pathGuard) return pathGuard;

	const moves = commandIndexes(words, "mv");
	if (moves.length) {
		if (moves.length !== 1 || moves[0] !== 0 || words.some((word) => OPERATORS.has(word))) return { action: "deny", kind: "mv-unresolved", reason: "复合命令中的 mv 无法安全预备备份，已阻止执行。" };
		const options = words.slice(1).filter((word) => word.startsWith("-"));
		if (options.some((option) => !["-f", "-i", "-n", "-v", "--"].includes(option))) return { action: "deny", kind: "mv-unresolved", reason: "mv 使用了无法安全解析的选项，已阻止执行。" };
		const targets = operands(words, 0);
		if (targets.length !== 2 || targets.some((target) => !literal(target))) return { action: "deny", kind: "mv-unresolved", reason: "mv 参数无法安全解析，无法先备份原目标，已阻止执行。" };
		const source = pathFrom(targets[0], cwd);
		let destination = pathFrom(targets[1], cwd);
		try {
			if (lstatSync(destination).isDirectory()) destination = join(destination, basename(source));
		} catch {
			// A missing destination is the safe no-overwrite case.
		}
		if (!existsSync(destination)) return { action: "allow", reason: "mv 目标不存在，不会覆盖现有文件。" };
		if (hardPath(destination)) return { action: "deny", kind: "mv-system", reason: "mv 目标位于系统保护路径，禁止执行。" };
		const move = { source, destination };
		return { action: allowedPath(destination, config) ? "allow" : "ask", kind: "mv-overwrite", reason: "mv 会覆盖已有目标，执行前必须自动备份原目标。", move };
	}

	return deletionDecision(words, cwd, config) ?? scriptDecision(words, cwd, config) ?? { action: "allow", reason: "未发现当前版本定义的不可逆操作。" };
}

function bytes(path: string): number {
	const stat = lstatSync(path);
	if (!stat.isDirectory() || stat.isSymbolicLink()) return stat.size;
	return readdirSync(path).reduce((total, child) => total + bytes(join(path, child)), stat.size);
}

export async function prepareMoveBackup(plan: MovePlan, options: { backupRoot: string; cwd: string; toolCallId: string }): Promise<{ backupPath: string; bytes: number }> {
	await mkdir(options.backupRoot, { recursive: true });
	if (lstatSync(plan.destination).dev !== lstatSync(options.backupRoot).dev) throw new Error("备份目录与目标不在同一文件系统，第一版不执行跨磁盘备份。");
	const size = bytes(plan.destination);
	const filesystem = statfsSync(options.backupRoot);
	const available = Number(filesystem.bavail) * Number(filesystem.bsize);
	if (available < size + BACKUP_MARGIN_BYTES) throw new Error(`备份空间不足：需要约 ${size + BACKUP_MARGIN_BYTES} bytes，可用 ${available} bytes。`);
	const operation = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID()}`;
	const backupPath = join(options.backupRoot, operation, "target");
	await mkdir(dirname(backupPath), { recursive: true });
	await cp(plan.destination, backupPath, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false, dereference: false });
	if (bytes(backupPath) !== size) throw new Error(`备份校验失败，备份位置保留待检查：${backupPath}`);
	await appendFile(join(options.backupRoot, "operations.jsonl"), `${JSON.stringify({ version: 1, timestamp: new Date().toISOString(), operation: "mv-overwrite", source: plan.source, destination: plan.destination, backupPath, bytes: size, cwd: options.cwd, toolCallId: options.toolCallId })}\n`, "utf8");
	return { backupPath, bytes: size };
}

function loadConfig(): RuntimeConfig {
	const agentHome = process.env.PI_AGENT_HOME ?? join(homedir(), ".pi", "agent");
	const configPath = process.env.PI_SAFETY_CONFIG ?? join(agentHome, "extensions", "pi-safety", "config.json");
	let raw: SafetyConfig = {};
	let configError: string | undefined;
	if (existsSync(configPath)) {
		try {
			const parsed = JSON.parse(readFileSync(configPath, "utf8"));
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("配置必须是 JSON 对象");
			raw = parsed as SafetyConfig;
		} catch (error) {
			configError = `配置无法读取：${message(error)}`;
		}
	}
	const paths = (key: keyof SafetyConfig, fallback: string[]): string[] => {
		const value = raw[key] ?? fallback;
		if (!Array.isArray(value)) {
			configError = `${key} 必须是路径数组`;
			return fallback.map(realPath);
		}
		return value.flatMap((item) => {
			if (typeof item !== "string" || !isAbsolute(expand(item))) {
				configError = `${key} 只接受绝对路径`;
				return [];
			}
			return [realPath(expand(item))];
		});
	};
	return { allowedDestructivePaths: paths("allowedDestructivePaths", []), temporaryPaths: paths("temporaryPaths", DEFAULT_TEMPORARY_PATHS), backupRoot: join(agentHome, "safety-backups"), configError };
}

const ALLOW_ONCE = "只允许本次调用";
const ALLOW_SESSION = "允许本次对话中的同类命令";
const DENY = "拒绝";

export async function guard(
	decision: SafetyDecision,
	ctx: ExtensionContext,
	sessionAllowed: Set<string>,
): Promise<{ block: true; reason: string } | undefined> {
	if (decision.action === "allow") return undefined;
	if (decision.action === "deny") return { block: true, reason: `[pi-safety] ${decision.reason}` };
	if (!ctx.hasUI) return { block: true, reason: `[pi-safety] ${decision.reason} 当前运行模式无法人工确认。` };
	if (decision.kind && sessionAllowed.has(decision.kind)) return undefined;
	const options = decision.kind ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY];
	const choice = await ctx.ui.select("Pi safety check", options);
	if (choice === ALLOW_ONCE) return undefined;
	if (choice === ALLOW_SESSION && decision.kind) {
		sessionAllowed.add(decision.kind);
		return undefined;
	}
	return { block: true, reason: "[pi-safety] 用户未批准当前调用。" };
}

export default function piSafety(pi: ExtensionAPI): void {
	const config = loadConfig();
	const sessionAllowed = new Set<string>();
	pi.on("session_start", () => sessionAllowed.clear());
	pi.on("session_start", (_event, ctx) => {
		if (config.configError) ctx.ui.notify(`pi-safety 配置问题：${config.configError}`, "warning");
	});
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "edit" || event.toolName === "write") {
			const path = typeof event.input.path === "string" ? pathFrom(event.input.path, ctx.cwd) : undefined;
			if (path && hardPath(path)) return { block: true, reason: `[pi-safety] ${event.toolName} 触及系统保护路径，禁止执行。` };
			return;
		}
		if (event.toolName !== "bash") return;
		const command = typeof event.input.command === "string" ? event.input.command : undefined;
		if (!command) return;
		const decision = classifyBashCommand(command, ctx.cwd, config);
		const blocked = await guard(decision, ctx, sessionAllowed);
		if (blocked) return blocked;
		if (!decision.move) return;
		try {
			const backup = await prepareMoveBackup(decision.move, { backupRoot: config.backupRoot, cwd: ctx.cwd, toolCallId: event.toolCallId });
			ctx.ui.notify(`已备份原目标：${backup.backupPath}`, "info");
		} catch (error) {
			return { block: true, reason: `[pi-safety] 自动备份失败，原 mv 未执行：${message(error)}` };
		}
	});
}

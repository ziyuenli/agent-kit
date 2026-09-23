import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const SESSION_NAME_MAX_CHARS = 58;
const MIN_GOAL_CHARS = 6;

const UNCLEAR_GOAL =
	/^(?:none|n\/a|na|tbd|unknown|unclear|not specified|not stated|goal not yet clear|no clear goal|still exploratory|尚不明确|未明确|还不清楚|待定|暂无明确目标|探索中)$/iu;
const UNCLEAR_GOAL_PHRASE =
	/\b(?:not yet (?:clear|defined)|not specified|not stated|to be determined|still exploratory|no clear goal)\b|尚不明确|未明确|还不清楚|待定|暂无明确目标|探索中/iu;
const GENERIC_GOAL =
	/^(?:work on|handle|address|continue|help the user with|assist the user with|do|fix|build|create|implement|review|discuss|explore)\s+(?:this|it|the task|the request|the problem|the issue|something|options?)$/iu;

export function sanitizeSessionName(
	value: string,
	maxChars = SESSION_NAME_MAX_CHARS,
): string {
	const name = value
		.replace(/[\u0000-\u001f\u007f]+/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[`*_]/g, "")
		.trim();

	if (!name || !/[\p{L}\p{N}]/u.test(name)) return "";
	if (name.length <= maxChars) return name;
	return `${name.slice(0, maxChars - 1).trimEnd()}…`;
}

function isClearTitle(text: string): boolean {
	if (text.length < MIN_GOAL_CHARS || UNCLEAR_GOAL.test(text)) return false;
	if (/^\[[^\]]+\]$|^\([^)]*\)$/u.test(text)) return false;
	return !UNCLEAR_GOAL_PHRASE.test(text) && !GENERIC_GOAL.test(text);
}

export function titleFromSummary(summary: string): string | undefined {
	// ponytail: deterministic clarity gate; never spend a model call to resolve ambiguity.
	const lines = summary
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const start = lines.findIndex((line) => /^##\s+Goal\s*$/iu.test(line));
	if (start < 0) return undefined;
	const end = lines.findIndex((line, i) => i > start && /^##\s+/u.test(line));
	for (const raw of lines.slice(start + 1, end < 0 ? lines.length : end)) {
		const goal = raw
			.replace(/^\s*(?:[-*+]|\d+[.)])\s*(?:\[[ xX]\]\s*)?/, "")
			.replace(/^\s*>\s*/, "")
			.trim();
		if (!goal || !isClearTitle(goal)) continue;
		const title = sanitizeSessionName(goal);
		if (title) return title;
	}
	return undefined;
}

interface ContentBlock {
	type?: string;
	text?: unknown;
}

function userMessageText(entry: unknown): string | undefined {
	const e = entry as {
		type?: string;
		message?: { role?: string; content?: unknown };
	};
	if (e?.type !== "message" || e.message?.role !== "user") return undefined;
	const content = e.message.content;
	const parts: string[] = [];
	if (Array.isArray(content)) {
		for (const b of content as ContentBlock[]) {
			if (b?.type === "text" && b.text !== undefined) parts.push(String(b.text));
		}
	} else {
		parts.push(String(content ?? ""));
	}
	const text = parts.join(" ").replace(/\s+/g, " ").trim();
	return text || undefined;
}

function hasSessionName(pi: ExtensionAPI): boolean {
	try {
		return Boolean(pi.getSessionName());
	} catch {
		return true; // stale ctx: treat as named so we never overwrite.
	}
}

function trySetName(pi: ExtensionAPI, title: string | undefined): void {
	if (!title || hasSessionName(pi)) return;
	try {
		if (pi.getSessionName()) return;
		pi.setSessionName(title);
	} catch {
		// Ignore a session replacement racing the metadata write.
	}
}

function nameFromSummary(pi: ExtensionAPI, summary: string): void {
	trySetName(pi, titleFromSummary(summary));
}

const LOG_LIKE =
	/(?:TypeError|ReferenceError|SyntaxError|\bError:)|https?:\/\//i;

/**
 * Local extract + synthesize from ALL user messages (zero model calls):
 * drop vague/log-like texts, then prefer the most descriptive one (longest
 * within 60 chars, earliest wins ties — the goal is usually stated first).
 */
function nameFromUserMessages(pi: ExtensionAPI, ctx: ExtensionContext): void {
	if (hasSessionName(pi)) return;
	const entries = ctx.sessionManager.getBranch();
	const clear: string[] = [];
	for (const entry of entries) {
		const text = userMessageText(entry);
		if (text && isClearTitle(text) && !LOG_LIKE.test(text)) clear.push(text);
	}
	if (clear.length === 0) return;

	let best: string | undefined;
	for (const text of clear) {
		if (text.length > 60) continue;
		if (!best || text.length > best.length) best = text;
	}
	trySetName(pi, sanitizeSessionName(best ?? clear[0]));
}

function nameFromExistingSummary(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): void {
	const entries = ctx.sessionManager.getBranch();
	for (let i = entries.length - 1; i >= 0; i -= 1) {
		const entry = entries[i] as { type?: string; summary?: string };
		if (entry.type !== "compaction") continue;
		nameFromSummary(pi, entry.summary ?? "");
		return;
	}
}

export default function sessionSummaryNameExtension(pi: ExtensionAPI): void {
	pi.on("session_start", (_event, ctx: ExtensionContext) => {
		nameFromExistingSummary(pi, ctx);
		// No startup model call: the goal may still be forming.
	});

	pi.on("session_compact", (event) => {
		nameFromSummary(pi, event.compactionEntry.summary);
	});

	// Short-session path: no compaction ever fired. Name from ALL user messages
	// via a local extract+synthesize pick — pure string ops (zero model calls,
	// zero context).
	pi.on("session_shutdown", (_event, ctx: ExtensionContext) => {
		nameFromUserMessages(pi, ctx);
	});
}

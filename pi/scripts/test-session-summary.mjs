import assert from "node:assert/strict";

const {
	default: registerExtension,
	sanitizeSessionName,
	titleFromSummary,
} = await import("../extensions/session-summary/index.ts");

function createHarness({ name, entries = [] } = {}) {
	const events = new Map();
	const calls = { setName: [], compact: 0 };
	let sessionName = name;
	const handle = {};
	const ctx = {
		sessionManager: {
			getSessionId: () => "session-1",
			getBranch: () => entries,
		},
	};

	const exists = () => {
		// The stateless observer must never trigger its own compaction.
		assert.equal(calls.compact, 0, "extension must never call ctx.compact()");
	};

	const pi = {
		on(event, handler) {
			events.set(event, handler);
			return handle;
		},
		getSessionName() {
			return sessionName;
		},
		setSessionName(value) {
			sessionName = value;
			calls.setName.push(value);
		},
	};

	registerExtension(pi);
	return {
		events,
		calls,
		ctx,
		getName: () => sessionName,
		exists: handle,
		assertNoCompact: exists,
	};
}

const clearSummary = `## Goal
- Build a session title extension for Pi

## Constraints & Preferences
- Keep the context cost low
`;

assert.equal(
	titleFromSummary(clearSummary),
	"Build a session title extension for Pi",
);
assert.equal(
	titleFromSummary(
		"## Goal\n- Goal not yet clear\n\n## Progress\n- Explore options",
	),
	undefined,
);
assert.equal(titleFromSummary("## Goal\n- Work on this"), undefined);
assert.equal(
	titleFromSummary("## Progress\n- Build a session title extension for Pi"),
	undefined,
);
assert.equal(
	titleFromSummary("## Goal\n- 尚不明确\n- 修复 session-summary 的命名时机"),
	"修复 session-summary 的命名时机",
);
assert.equal(
	sanitizeSessionName("`Fix` **session-summary**\nnow"),
	"Fix session-summary now",
);
assert.equal(sanitizeSessionName("---"), "");

const fresh = createHarness();
await fresh.events.get("session_start")({ reason: "new" }, fresh.ctx);
assert.equal(fresh.getName(), undefined, "startup must not invent a title");
fresh.assertNoCompact();

const withSummary = createHarness({
	entries: [{ type: "compaction", summary: clearSummary }],
});
await withSummary.events.get("session_start")(
	{ reason: "startup" },
	withSummary.ctx,
);
assert.equal(withSummary.getName(), "Build a session title extension for Pi");
withSummary.assertNoCompact();

const onCompact = createHarness();
await onCompact.events.get("session_compact")(
	{
		compactionEntry: {
			summary: "## Goal\n- Goal not yet clear\n\n## Progress\n- Explore",
		},
	},
	onCompact.ctx,
);
assert.equal(
	onCompact.getName(),
	undefined,
	"unclear goals must remain unnamed",
);
await onCompact.events.get("session_compact")(
	{ compactionEntry: { summary: clearSummary } },
	onCompact.ctx,
);
assert.equal(onCompact.getName(), "Build a session title extension for Pi");
assert.deepEqual(onCompact.calls.setName, [
	"Build a session title extension for Pi",
]);
onCompact.assertNoCompact();

const named = createHarness({ name: "User title" });
await named.events.get("session_compact")(
	{ compactionEntry: { summary: clearSummary } },
	named.ctx,
);
assert.equal(
	named.getName(),
	"User title",
	"existing names must not be overwritten",
);
assert.deepEqual(named.calls.setName, []);
named.assertNoCompact();

// Short session: no compaction ever fires; shutdown synthesizes from ALL user messages.
const shortSession = createHarness({
	entries: [
		{ type: "message", message: { role: "user", content: "继续" } },
		{
			type: "message",
			message: {
				role: "user",
				content: "修复 auto-compaction 的 fetch failed 报错",
			},
		},
	],
});
await shortSession.events.get("session_start")(
	{ reason: "new" },
	shortSession.ctx,
);
await shortSession.events.get("session_shutdown")(
	{ reason: "quit" },
	shortSession.ctx,
);
assert.equal(
	shortSession.getName(),
	"修复 auto-compaction 的 fetch failed 报错",
	"short session gets a local title from the most descriptive user message",
);
shortSession.assertNoCompact();

// Last message is a short follow-up; the earlier goal is more descriptive → earliest-longest wins.
const followUp = createHarness({
	entries: [
		{
			type: "message",
			message: {
				role: "user",
				content: "重构 session-summary 扩展并补充回归测试",
			},
		},
		{ type: "message", message: { role: "user", content: "帮我跑一下测试" } },
	],
});
await followUp.events.get("session_shutdown")({ reason: "quit" }, followUp.ctx);
assert.equal(
	followUp.getName(),
	"重构 session-summary 扩展并补充回归测试",
	"the most descriptive message wins, not mechanically the last one",
);

// Pasted stack traces are skipped as titles.
const logPaste = createHarness({
	entries: [
		{
			type: "message",
			message: { role: "user", content: "TypeError: fetch failed at main.ts:1" },
		},
		{
			type: "message",
			message: { role: "user", content: "排查网络抖动导致的压缩失败" },
		},
	],
});
await logPaste.events.get("session_shutdown")({ reason: "quit" }, logPaste.ctx);
assert.equal(
	logPaste.getName(),
	"排查网络抖动导致的压缩失败",
	"log-like messages never become the title",
);

const vague = createHarness({
	entries: [{ type: "message", message: { role: "user", content: "继续" } }],
});
await vague.events.get("session_shutdown")({ reason: "quit" }, vague.ctx);
assert.equal(vague.getName(), undefined, "vague last message stays unnamed");

console.log("session-summary self-check passed");

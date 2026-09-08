/**
 * Inline transcript comments.
 *
 * Fullscreen mode owns transcript selection, so this extension can open an
 * editor beside the selected range without polling the system clipboard.
 * Comments are staged and packaged with the next normal user prompt.
 *
 * Usage:
 *   /inline-comments         Toggle selection commenting
 *   /inline-comments:open    Open inline comment for last selected assistant text (optionally: /inline-comments:open "<selected text>")
 *   /inline-comments:send    Send staged inline comments without another request
 *   /inline-comments:clear   Discard staged comments
 *
 * Shortcut:
 *   Alt+E (preferred) / Alt+Shift+E (fallback)
 *   Add a comment to the last selected assistant text
 */

import {
	type ExtensionAPI,
	type ExtensionContext,
	ExtensionEditorComponent,
	type TranscriptSelection,
} from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { findAssistantEntryId } from "./inline-comments-utils.ts";

interface StagedComment {
	entryId: string;
	quote: string;
	comment: string;
}

interface PendingSelectionComment {
	entryId: string;
	quote: string;
	selection: TranscriptSelection;
}

/** Selection APIs were added after older Pi releases; keep manual comments working there. */
interface TranscriptSelectionUI {
	onTranscriptSelection?: (
		listener: (selection: TranscriptSelection) => void,
	) => () => void;
	getTranscriptSelection?: () => TranscriptSelection | undefined;
}

function getSelectionUI(ctx: ExtensionContext): TranscriptSelectionUI {
	// SAFETY: Pi's UI object is structurally compatible when these optional APIs exist.
	return ctx.ui as unknown as TranscriptSelectionUI;
}

function packageComments(
	request: string,
	comments: readonly StagedComment[],
): string {
	const sections = comments.map(
		(comment, index) =>
			`Comment ${index + 1} on assistant entry ${comment.entryId}:\n` +
			`> ${comment.quote.replaceAll("\n", "\n> ")}\n\n${comment.comment}`,
	);
	const trimmedRequest = request.trim();
	const requestSection = trimmedRequest ? `Request:\n${request}\n\n` : "";
	return `${requestSection}Inline feedback:\n\n${sections.join("\n\n---\n\n")}`;
}

export default function inlineComments(pi: ExtensionAPI) {
	let enabled = false;
	let dialogOpen = false;
	let comments: StagedComment[] = [];
	let pendingSelection: PendingSelectionComment | undefined;
	let unsubscribeSelection: (() => void) | undefined;
	let supportsTranscriptSelection = false;

	function getWidgetLines(): string[] {
		const lines: string[] = [];

		if (comments.length > 0) {
			lines.push(
				`${comments.length} inline comment${comments.length === 1 ? "" : "s"} staged`,
				...comments.map(
					(comment, index) =>
						`${index + 1}. ${comment.comment.replaceAll("\n", " ")}`,
				),
				"Submit your main prompt to send them together.",
			);
		}

		if (!enabled) {
			return lines;
		}

		lines.push(
			supportsTranscriptSelection
				? `${comments.length > 0 ? " • " : ""}Select assistant text and press Alt+E (or Alt+Shift+E) to comment.`
				: "This Pi version has no transcript-selection API. Use /inline-comments:open <quoted text>.",
		);
		return lines;
	}

	function refresh(ctx: ExtensionContext): void {
		ctx.ui.setStatus(
			"inline-comments",
			enabled ? `inline comments: ${comments.length} staged` : undefined,
		);
		const lines = getWidgetLines();
		ctx.ui.setWidget("inline-comments", lines.length > 0 ? lines : undefined);
	}

	async function openCommentEditor(
		selection: TranscriptSelection | undefined,
		entryId: string,
		quote: string,
		ctx: ExtensionContext,
	): Promise<void> {
		if (dialogOpen || !ctx.isIdle()) return;
		dialogOpen = true;
		try {
			const result = await ctx.ui.custom<string | undefined>(
				(tui, _theme, keybindings, done) =>
					new ExtensionEditorComponent(
						tui,
						keybindings,
						`Comment on: ${quote.replaceAll("\n", " ").slice(0, 80)}`,
						undefined,
						(value) => done(value),
						() => done(undefined),
					),
				{
					overlay: true,
					...(selection
						? {
								overlayOptions: {
									row: selection.viewport.end.row + 1,
									col: selection.viewport.start.column,
									width: "60%",
									maxHeight: "50%",
								},
							}
						: {}),
				},
			);
			const comment = result?.trim();
			if (!comment) return;
			comments.push({ entryId, quote, comment });
			refresh(ctx);
		} finally {
			dialogOpen = false;
		}
	}

	function stageSelection(
		selection: TranscriptSelection,
		ctx: ExtensionContext,
	): void {
		const quote = selection.text.trim();
		if (!quote) {
			pendingSelection = undefined;
			return;
		}
		const entryId = findAssistantEntryId(ctx, quote);
		if (!entryId) {
			pendingSelection = undefined;
			ctx.ui.notify("Selection is not within any assistant message.", "warning");
			return;
		}
		pendingSelection = { selection, entryId, quote };
	}

	async function openPendingComment(
		ctx: ExtensionContext,
		selectionText?: string,
		requireEnabled = true,
	): Promise<void> {
		if (requireEnabled && !enabled) {
			ctx.ui.notify(
				"Enable /inline-comments to use the shortcut key flow.",
				"info",
			);
			return;
		}
		if (!pendingSelection && !selectionText) {
			ctx.ui.notify(
				"No selected assistant text to comment. Select text in agent output first, or pass /inline-comments:open <text>.",
				"warning",
			);
			return;
		}

		if (!ctx.isIdle()) {
			ctx.ui.notify(
				"Wait until the assistant is idle before opening the comment editor.",
				"warning",
			);
			return;
		}

		if (!pendingSelection && selectionText) {
			const quote = selectionText.trim();
			if (!quote) {
				ctx.ui.notify(
					"No selected assistant text to comment. Enter text after the command.",
					"warning",
				);
				return;
			}
			const entryId = findAssistantEntryId(ctx, quote);
			if (!entryId) {
				ctx.ui.notify(
					"Unable to attach comment to an assistant message. Try after a response appears.",
					"warning",
				);
				return;
			}
			await openCommentEditor(undefined, entryId, quote, ctx);
			refresh(ctx);
			return;
		}

		const { selection, entryId, quote } = pendingSelection!;
		await openCommentEditor(selection, entryId, quote, ctx);
		pendingSelection = undefined;
		refresh(ctx);
	}

	function sendComments(ctx: ExtensionContext): void {
		if (comments.length === 0) {
			ctx.ui.notify("No inline comments are staged.", "info");
			return;
		}
		const message = packageComments("", comments);
		comments = [];
		refresh(ctx);
		if (ctx.isIdle()) pi.sendUserMessage(message);
		else pi.sendUserMessage(message, { deliverAs: "followUp" });
	}

	pi.on("session_start", (_event, ctx) => {
		unsubscribeSelection?.();
		const selectionUI = getSelectionUI(ctx);
		supportsTranscriptSelection =
			typeof selectionUI.getTranscriptSelection === "function";
		unsubscribeSelection =
			typeof selectionUI.onTranscriptSelection === "function"
				? selectionUI.onTranscriptSelection((selection) =>
						stageSelection(selection, ctx),
					)
				: undefined;
		pendingSelection = undefined;
		refresh(ctx);
	});

	pi.on("session_shutdown", () => {
		unsubscribeSelection?.();
		unsubscribeSelection = undefined;
		pendingSelection = undefined;
		dialogOpen = false;
	});

	pi.on("input", (event, ctx) => {
		if (comments.length === 0) return;
		const pending = comments;
		comments = [];
		refresh(ctx);
		return {
			action: "transform",
			text: packageComments(event.text, pending),
			images: event.images,
		};
	});

	pi.registerCommand("inline-comments", {
		description: "Toggle inline commenting for fullscreen transcript selections",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			if (!enabled) {
				pendingSelection = undefined;
			}
			refresh(ctx);
			ctx.ui.notify(
				`Inline commenting ${enabled ? "enabled" : "disabled"}.`,
				"info",
			);
		},
	});

	pi.registerCommand("inline-comments:send", {
		description: "Send staged inline comments without another request",
		handler: async (_args, ctx) => sendComments(ctx),
	});

	const openPendingShortcut = async (ctx: ExtensionContext) => {
		const selection = getSelectionUI(ctx).getTranscriptSelection?.();
		if (selection) {
			stageSelection(selection, ctx);
		} else if (!supportsTranscriptSelection) {
			ctx.ui.notify(
				"This Pi version cannot read transcript selections. Use /inline-comments:open <quoted text>.",
				"warning",
			);
			return;
		}
		await openPendingComment(ctx, undefined, false);
	};

	pi.registerShortcut(Key.alt("e"), {
		description: "Open inline comment for selected assistant text",
		handler: (ctx) => openPendingShortcut(ctx),
	});

	pi.registerShortcut(Key.altShift("e"), {
		description: "Open inline comment for selected assistant text",
		handler: (ctx) => openPendingShortcut(ctx),
	});

	pi.registerCommand("inline-comments:open", {
		description:
			"Open inline comment editor for the last selected assistant text or provided text",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const selection = getSelectionUI(ctx).getTranscriptSelection?.();
			if (selection) stageSelection(selection, ctx);
			await openPendingComment(ctx, trimmed ? trimmed : undefined, false);
		},
	});

	pi.registerCommand("inline-comments:clear", {
		description: "Discard staged inline comments",
		handler: async (_args, ctx) => {
			comments = [];
			refresh(ctx);
			ctx.ui.notify("Staged inline comments discarded.", "info");
		},
	});
}

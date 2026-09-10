---
name: pane-trace
description: Diagnose live Pi panes non-intrusively with temporary file-trace instrumentation. Use when unit tests or isolated canaries cannot produce the needed evidence and the question is what a running pane actually loaded or how it behaves at runtime (selection payloads, TUI interaction, loaded module identity). Covers the trace protocol, diagnosis branching, and permission fallbacks for herdr/tmux-style panes.
---

# Live Pane Trace

Use when the needed evidence is real-pane behavior that unit tests and isolated canaries cannot produce - for example, which extension module and version a running Pi process actually loaded, or runtime selection/TUI payloads in the user's real session.

## Protocol

1. Identify the target pane and confirm the user authorizes reload or restart. A restart is recoverable when the session is persisted and the same command resumes it; reload covers extension-only changes, core/TUI changes need a restart.
2. Temporarily instrument the target extension (or the smallest relevant file) to append bounded JSON lines to a `/tmp` trace file: `{event, pid, timestamp, ...payload}`. Wrap writes in try/catch so tracing never breaks the host.
3. Have the user reload extensions or restart, then perform the minimal representative actions. Keep the payload bounded (truncate text previews) and never route sensitive content into the trace.
4. Read the trace file and branch the diagnosis on its events, for example: no `module-loaded` → load path or stale process; module loaded but no event → hook or registration path; event present without the expected field → core binding path. Each branch points at a different owner (extension, TUI hook, core).
5. Remove the instrumentation before committing; restore the file to its committed state.

## Permission fallback

- Prefer evidence gathering that is reversible and non-destructive: file traces, read-only pane reads, process metadata. Reversibility, not the absence of a rule, is what makes an action safe to request - mirror the safety-extension posture: actions that cannot cause irreversible harm or data loss should not be trapped behind approval rituals.
- If the user denies or cannot grant reload/restart authorization, report that portion as **blocked** under the pi-ext-check evidence statuses and fall back to an isolated idle-pane canary or a structural repro. Do not substitute weaker evidence or present unverified premises as facts.
- Never send keys, text, or signals to a user pane, and never restart it, without explicit authorization.

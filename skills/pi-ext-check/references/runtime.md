# Runtime Validation

Use this reference when extension behavior depends on a running Pi process, terminal interaction, extension reload, or another process boundary.

## Permission and fallback

- Perform read-only inspection and other low-risk reversible work when it is already within the task authorization and host policy.
- Reversibility does not itself grant permission. Request authorization before sending input or signals to, reloading, restarting, or otherwise changing a user-owned pane or process. Use the host's approval mechanism when one exists.
- A denied action remains denied across tools. Do not bypass it with a different command or transport.
- If authorization or host capability is unavailable, complete independent local checks and isolated canaries, then mark the affected live-runtime acceptance check **Blocked**. Do not promote weaker evidence to verified runtime behavior.

## Runtime identity evidence

Record the pane or process, executable, working directory, session mode, configured extension source, and relevant host version.

A configured path, `import.meta.url`, process metadata, file modification time, or commit timestamp identifies context but does not alone prove the exact bytes loaded by a running process. Prefer a fresh process started after the tested files are finalized. When exact loaded-version evidence matters, expose an explicit build/version identifier or a precomputed content hash through a safe runtime-visible event.

## Temporary runtime tracing

Use temporary tracing only when unit tests and isolated canaries cannot produce the required real-runtime evidence, such as transcript-selection payloads.

1. Identify the smallest event boundary that distinguishes the remaining hypotheses.
2. Add bounded structured output, such as JSON Lines containing event name, process ID, timestamp, version identifier when available, and only the relevant payload fields. Truncate text and exclude secrets or unrelated content.
3. Make tracing failure-safe so it cannot break the extension or host.
4. With authorization, reload extensions for extension-only changes or start a fresh process for core/TUI changes. Exercise the minimum representative actions.
5. Read the trace and branch the diagnosis from observed events. For example: no load event suggests discovery or stale-process state; load without the target event suggests hook registration; the event without an expected field suggests an upstream binding problem.
6. Remove only the instrumentation introduced by the task. Do not restore the whole file to a committed version when concurrent edits may exist. Remove sensitive temporary artifacts after recording bounded evidence.

Herdr and tmux are optional transports, not requirements. Prefer their read-only pane and process inspection where available. Never infer that a transport delivered input successfully without observing the resulting process or application state.

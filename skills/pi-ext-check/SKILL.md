---
name: pi-ext-check
description: Validate Pi extensions with targeted regression tests, repository checks, conditional isolated-runtime canaries, and bounded fix–retest loops. Use when implementing, fixing, integrating, or validating Pi extensions, including their TUI hooks and extension packages. Explanation-only and documentation-only tasks use relevant guidance without runtime validation.
---

# Pi Extension Checks

Use this as a tight validation loop for Pi extensions, not plugins for other products. Explanation-only and documentation-only tasks require only relevant content checks. Pure helper changes without loading, TUI, session, or environment dependencies need targeted local checks, not a runtime canary.

## Stop contract (apply before testing)

- Define acceptance from the user's requested behavior and select the smallest relevant regression/check set before execution. Track each user-reported failure against its corresponding acceptance check and evidence; close it only when that check passes, not when other cases succeed. Keep failures without corresponding verification unresolved or blocked. A brief checklist is sufficient.
- Finish when the requested behavior and applicable selected checks pass. Stop with a partial or blocked report when required evidence cannot be obtained within the budget; do not equate stopping with passing.
- Reuse user-confirmed runtime evidence only when the tested behavior, relevant code, dependencies, configuration, and host version remain unchanged. Record its source and scope. Test-only or documentation changes do not by themselves require a runtime restart.
- Investigate failures only far enough to establish relevance. Fix failures caused by this change; report unrelated, baseline, inferred-project, or stale diagnostics separately without expanding the task.
- A fix–retest cycle is one attempted fix followed by a retest of the same acceptance blocker. After two unsuccessful cycles, stop and report evidence and a proposed next step; changing the root-cause hypothesis does not reset the count. Allow at most two environment-only retries per task, counted separately. Further attempts require user agreement.
- Local restructuring necessary for the requested fix is in scope. Independent refactoring, additional features, optional broad scans, dependency cleanup, commits, and rebases require separate scope approval. A compacted history's future-work list is not fresh authorization.
- Scope diagnostics to edited files. Run broader mandatory repository checks once initially; apply section 5 for reruns. Report their unrelated findings without adopting them as new work.

## 1. Establish the real environment

- Read project instructions and identify the authoritative check commands.
- For runtime validation, trace the active extension from Pi settings/package metadata to its exact source path. Do not assume duplicate or archived copies are active.
- Record the source path under test. For runtime validation, also record the Pi executable, source checkout/package version, working directory, and session mode.
- Keep core/runtime patches separate from extension changes when both are involved.

Completion criterion: the test target is identified; when runtime validation applies, the file actually loaded by Pi is identified without unresolved duplicate-path ambiguity. Otherwise, report that runtime loading was not checked.

## 2. Add a regression before changing behavior

- Reproduce the failure with the smallest deterministic test.
- Add the regression before implementing the fix whenever practical.
- Cover the happy path and the nearest no-op or invalid-input path.
- For UI behavior, select affected dimensions from layout, input dispatch, lifecycle reset, scrolling/reflow, and collisions. Test at the lowest stable seam available; justify additional dimensions by a concrete risk from this change.

Completion criterion: the regression fails for the original defect or missing behavior and passes after implementation. If a deterministic regression is impractical or this is validation-only work, record why and provide the smallest relevant alternative evidence; do not claim a red–green cycle that was not observed.

## 3. Run authoritative local checks

- Format and lint changed files using applicable repository tooling.
- Use official repository scripts for the selected relevant typecheck/build/test checks. Run full-repository gates only when repository instructions require them; report unrelated failures without adopting them as new work.
- When supported, use LSP diagnostics on edited files before builds and a final scoped diagnostics pass. If tooling is unavailable, record the limitation and use an authoritative alternative where available.
- Separate pre-existing/environment failures from regressions; do not silently relabel them as success.

Completion criterion: selected tests, repository checks, and diagnostics have recorded statuses and evidence under section 7. A baseline failure that prevents relevant validation leaves that validation blocked, not passed.

## 4. Perform the conditional isolated-runtime canary

Run this phase when behavior depends on extension discovery, module resolution, Pi settings, TUI input/layout, session lifecycle, native clipboard/terminal behavior, or another process boundary.

If reusable evidence satisfies the stop contract, cite it instead of launching another canary. Otherwise:

1. Choose an isolated runtime with the capabilities needed for the affected boundary. An available Herdr idle pane with no Pi process is one option, not a prerequisite.
2. Leave existing user panes and sessions untouched. Use only an authorized idle pane or a task-created process; do not reset, close, or rewrite user sessions to create a canary.
3. Start the target executable and working directory, recording relevant dependency, configuration, and host versions. Restart only canary processes created by this task and confirmed to belong to it when relevant runtime code changes.
4. Verify activation from process metadata and Pi-visible evidence (registered command, startup extension list, status, or a safe command). A terminal title alone is not evidence.
5. Exercise the smallest safe behavior that crosses the boundary. Avoid unnecessary model calls, network calls, clipboard polling, and PTY scraping.
6. Capture the observed output and process state.

The canary complements local tests; it does not replace them. A non-TTY subprocess may verify loading or non-interactive behavior, but cannot establish TUI interaction correctness. If the required terminal or host capability is unavailable, report that portion as blocked rather than substituting weaker evidence.

Completion criterion: fresh-process or eligible reused evidence confirms the intended extension loaded and the relevant runtime action succeeded. Record warnings and errors with their relevance; mark an inapplicable canary skipped, and missing required runtime evidence blocked.

## 5. Bounded fix and retest

For each in-scope failure, within the stop contract's retry budget:

1. Preserve the failure evidence.
2. Identify whether it is code, stale process state, wrong extension path, dependency resolution, configuration, or test-environment noise.
3. Make the smallest fix in the correct repository.
4. Rerun the failing check and selected checks affected by the fix, including the canary when applicable. Restart only the task-owned canary after relevant runtime changes. Rerun a broad mandatory gate only when required by repository instructions or affected by the fix.
5. Stop when acceptance passes or the retry budget is reached; report a concrete blocker rather than starting another diagnostic loop.

Do not declare success from a passing unit test when the active Pi process loaded a different file.

## 6. Extension-specific safety rules

Apply each rule only when the extension uses the corresponding capability; these are not requirements to add unrelated features or tests.

- Lifecycle hooks should be idempotent and should unsubscribe/reset state on reload, session replacement, and shutdown.
- Input handlers should inspect the input source and transform only their intended inputs; unrelated extension-generated input must pass through.
- Selection/annotation hooks may observe content outside their domain. Ignore unmatched automatic observations; reserve warnings for explicit user actions.
- Reject ambiguous semantic attachments rather than guessing the latest message or object.
- Paint transient UI after layout when possible so markers do not change wrapping; keep collision policy non-obscuring or explicit.
- Keep a stable source of truth for activation and persistence. Do not rely on terminal scrollback as state.

## 7. Evidence report

Use these statuses per selected check:

- **Passed:** the check ran and satisfied its criterion, or explicitly eligible reused evidence satisfies it.
- **Failed:** the check ran and its criterion was not met; identify whether it is change-related, baseline, or unresolved.
- **Skipped:** not applicable, with a reason. Missing tooling is not an applicability exemption.
- **Blocked:** required evidence could not be obtained, including environment or baseline faults that prevented relevant validation.

Claim overall acceptance only when relevant acceptance checks pass and required repository gates pass. Report unrelated baseline gate failures separately as a qualification, not as a clean pass. A missing required check keeps the corresponding validation blocked.

Return a concise report with applicable fields; omit runtime metadata for documentation-only work:

- **Target:** exact extension path, Pi executable/source, cwd, and mode.
- **Regression:** test name and result.
- **Checks:** commands, statuses, and evidence.
- **Canary:** isolated environment identifier, fresh-process or eligible reused evidence, action exercised, and result; otherwise the skipped/blocked reason.
- **Fix loop:** failures found and changes made.
- **Residual risk:** known limitations, baseline failures, or untested host-specific behavior.

Use "verified" only for evidence actually observed in the stated environment; label inference and untested behavior separately.

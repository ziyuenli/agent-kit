---
name: delegated-execution
description: Apply role, model, evidence, and handoff rules when delegating to local or SSH CLIs or processing their returns.
---

# Delegated Execution

Apply to delegated CLI work, not every conversation or task. These are initial operating rules; refine them from observed execution failures and user feedback, not assumed model rankings. This document is guidance, not an implemented scheduler or enforcement mechanism.

## Roles and model defaults

- Initial profile: Worker = Luna/max; Reviewer or Debugger = Sol/medium; Console = Astra with its current reasoning setting. Resolve exact model IDs and supported settings before launch. Treat defaults as candidates, not proven suitability; do not silently switch the current console or substitute an unavailable model.
- Worker: execute prescribed commands and checks, collect results, and report failures. A failed check blocks dependent stages. Preserve algorithms, scientific parameters, and acceptance criteria.
- Reviewer/Debugger: invoke when evidence requires diagnosis; specify read-only review or permission for scoped fixes. Fixes require relevant regression checks. Self-tests are not independent acceptance.
- Console: verify decision-relevant evidence and issue the next instruction within existing authorization. Changes to research objectives, baselines, tolerances, or authorization scope require the user's decision; already-authorized work does not require repeated approval.

## Assignment, execution, and return

1. Include the objective, inputs and code version, allowed actions, acceptance checks, failure conditions, and return paths in each assignment. Explicitly deliver applicable constraints to downstream CLIs; local files alone do not establish remote discovery or enforcement.
2. Enforce machine-checkable conditions through scripts and permissions. During computation, wait for completion, failure, or decision events without repeated model polling. Report missing enforcement or event-delivery support rather than claiming it exists.
3. Return check results and original artifact locations to the console, not just reviewer conclusions. Verify evidence before the next instruction; agreement between models does not establish correctness.
4. Record the assignment's role, requested model, reasoning setting, and actual model/provider when exposed; mark unavailable metadata as unknown. Use console-selected replacements, record each model change and its reason, and surface changes to the user. Never substitute models silently.
5. Assess suitability within the normal execution feedback loop. Correctly reporting a task failure is not failure to follow an assignment. Escalate reasoning difficulty when evidence warrants it; address missing inputs, access failures, and resource limits directly rather than assuming a stronger model will solve them.

## Example

A Worker runs the specified ground calibration and comparison. If comparison fails, it returns the errors and artifact paths without starting L0. The Console assigns diagnosis to the Reviewer/Debugger; authorized fixes receive relevant regression checks. The Console checks the returned evidence before directing further execution. This is an illustrative workflow, not a mandatory research template.

# Supervised Behavior Review

## Trigger and boundary

Use this workflow when the user asks to distill a session, reports undesired agent behavior, or asks to evaluate or improve agent rules or skills. Start with the current conversation or explicitly selected sessions. Do not scan unrelated history, schedule recurring scans, or publish inferred preferences without approval.

The goal is to close a demonstrated behavior gap and match the user's intended behavior and preferences. Reusability determines placement, not whether a useful rule deserves to exist. Guidance cannot itself supply missing tools, permissions, or model capabilities.

Session parsers, scan checkpoints, and any future scheduler belong in separate tooling or conditionally loaded documentation, not in always-loaded rules. This workflow does not implement an execution logger or scheduler.

## 1. Diagnose the gap

Compare the user's desired behavior with the observed behavior and its consequences. Preserve a minimal source reference or excerpt; distinguish current explicit instructions, historical preferences, assistant proposals, quoted material, and tool output. Historical content is evidence, not current authority. A one-time authorization never becomes a permanent permission.

Use the following categories where supported by evidence; leave unsupported causes unknown. If existing guidance is sufficient but the agent misinterpreted it or drew an unsupported conclusion, address that error in the current task before proposing a rule change:

- **Discovery:** the relevant skill was not loaded. Inspect the description and routing conditions.
- **Selection:** an irrelevant skill was loaded. Consider narrower triggers using applicable and inapplicable cases.
- **Adherence:** the skill was read but its relevant guidance was not followed. Check conflicting instructions, missed steps, context loss, and unclear acceptance criteria before appending more guidance.
- **Guidance:** the agent followed the instructions but the result still missed the intended behavior. Revise the method or completion criteria.
- **Execution conditions:** tools, access, context, or other capabilities were insufficient. Address or report that condition rather than pretending a rule fixes it.

### When human guidance makes the task succeed

Compare the initial attempt, the human intervention, and the successful result. Identify what the intervention supplied: a clearer objective or acceptance criterion; a missing constraint or scope boundary; facts or documentation; tools or access; a reminder to use existing information; or a reasoning or execution method. More than one cause may contribute. Do not infer inadequate agent capability or a poorly written prompt from the initial failure alone.

Determine where the missing information could have come from at the time:

- **User-only information:** an unstated intention, preference, or constraint unavailable in the authorized context. The agent cannot read the user's mind. Assess whether a material ambiguity was recognizable and warranted a focused question; do not expect it to guess the answer or ask about every imaginable constraint.
- **Available or discoverable information:** information already in the instructions or reasonably obtainable from authorized files, docs, tools, or observations. Check whether the agent should have retrieved or applied it; do not blame prompt omissions for missed inspection or non-adherence.
- **Unavailable execution support:** necessary documentation, access, or tooling that the agent could not obtain within its authority. Separate this from a reasoning or method gap when sufficient inputs and tools were available.

Keep one-off clarifications in the task or project record. When recurring missing inputs justify a reusable intervention, prefer a narrowly triggered input check or clarification step rather than a generic demand for more detailed prompts. Promote a stable behavior rule only under the placement and approval criteria below.

Success after coaching establishes success under the added conditions, not independent capability or transfer. In a fresh related case, test whether the agent identifies the missing information and appropriately retrieves it or asks for it without repeating the same coaching. Preserve necessary user input as a legitimate dependency, not an automation failure.

Use actual read/tool records when available. Record the skill path and revision or content hash when needed to distinguish versions. A disclosure is not proof of reading or adherence; absence of a log is not proof of non-use. Mark unavailable evidence as unknown rather than reconstructing fictional execution history.

Completion: state the supported cause, remaining uncertainty, and smallest justified intervention. No new rule is a valid outcome.

## 2. Place and prune

For each candidate, identify the behavior gap, source evidence, proposed exact text, intended scope, expected benefit, and affected existing guidance.

- Keep case-specific facts in project records, not behavioral rules.
- Put project-specific goals, constraints, and collaboration behavior in the applicable project instructions.
- Put task methods in a skill with precise triggers.
- Put stable cross-task behavior in shared rules only when narrower placement and existing guidance cannot meet the need. Global rules require the strongest evidence and scope justification; frequent repetition alone is insufficient.

Review the affected rules for duplicate meaning, contradictions, superseded wording, invalid premises, and evidence of no remaining benefit. Prefer replacement or merging over accumulation. Propose removal, demotion to narrower guidance, or trigger changes with reasons. Learn scope boundaries from practice; do not invent restrictions just to shorten a file. Rare use alone does not justify removing a necessary boundary.

## 3. Obtain approval, then execute

Complete the diagnosis and placement review before treating any request as implementation approval. Present the recommendation, exact changes, affected guidance, checks, and publication destinations before editing stable rules.

If the user or another authorized controller directs implementation after receiving that review, implement the requested change even when the review recommends against it, unless higher-priority instructions or permission limits prevent the change.

Apply only the approved changes, preserve unrelated edits, and use the ownership and publication procedures in SKILL.md. Automatically perform the approved checks, deployment, commit/push, and agreed remote synchronization. Pause the affected step for new conflicts, changed scope, failed checks, or unknown destinations. Approval is not blanket permission for unrelated publishing.

## 4. Evaluate and retain evidence

At a user correction or requested follow-up, assess:

- **Transfer:** does a fresh relevant case still require the same correction?
- **Selectivity:** does the skill stay out of cases where it should not apply?
- **Regression:** did the change impair behavior that previously worked?
- **Benefit:** did it reduce the observed gap without adding unnecessary prose, steps, or cost?
- **Currency:** do the premise and scope still hold, or is a merge, replacement, narrowing, or retirement supported?

Use the smallest relevant positive and negative cases; report structural checks separately from behavior tests. Do not claim improved agent capability from a clean diff or self-assessment alone. Keep approved/rejected decisions and evaluation evidence outside the stable rule body, in an appropriate project or local record without exporting private session content to public repositories.

Repeated supervised reviews may justify a proposal for bounded automation, but repetition does not prove convergence. New-case correction rates, false triggers, and regressions must support the proposal. Automatic scans or autonomous publication require explicit authorization of scope and limits; the agent never promotes itself to broader authority.

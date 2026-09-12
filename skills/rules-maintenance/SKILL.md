---
name: rules-maintenance
description: Review and improve personal or project agent rules and skills. Use for user-requested session distillation, behavior-gap diagnosis, rule evaluation, pruning, edits, and approved publication.
---

# Rules Maintenance

## Scope and ownership

Shared rules have one manually maintained source: `~/.agents/AGENTS.md`. Edit it directly; no repository copy or synchronization is required. The Codex entry point is maintained directly at `${CODEX_HOME:-~/.codex}/AGENTS.md`. Resolve the actual home directory and environment override rather than treating that notation as a literal path.

Only the Pi entry point is maintained at `profile/AGENTS.md` in this repository and deployed to `${PI_CODING_AGENT_DIR:-~/.pi/agent}/AGENTS.md`. Keep it a short shared-file read instruction plus necessary Pi-specific guidance. The synchronization script owns only this Pi entry point, not shared rules or Codex configuration. Pi extensions, skills, and their tooling remain maintained in this repository.

Maintain this skill and `pi-ext-check` in the repository's `skills/` directory. Expose each through a same-named link under `~/.agents/skills/` so shared routing does not depend on Pi's installation directory. Resolve links before identifying the source repository. Other agents must read the shared entry point or explicitly load these skills; installation is not proof of discovery or adherence.

Before editing, inspect the affected files and preserve unrelated concurrent changes. Git-tracked source files use Git for rollback; do not create redundant copies. Before directly editing an active shared or Codex file outside Git, run `node scripts/manage-rule-backups.mjs create --target=PATH --reason=SLUG` from this repository and retain the returned record path. After the edit and relevant checks pass, run `node scripts/manage-rule-backups.mjs verify --record=PATH` followed by `node scripts/manage-rule-backups.mjs prune --apply`, then inspect the final diff and report any pruned paths. The helper deduplicates identical content and removes only managed, verified, unpinned backups outside both the newest-five and 30-day retention windows; `prune` without `--apply` is a dry run. For Pi deployment, also inspect the source, deployed copy, and available last-synced snapshot. If source or tooling is missing, report that instead of claiming synchronization works.

## Choose the work

- For user-requested session distillation, undesired agent behavior, or review and improvement of personal or project rules and skills, read [behavior-review.md](behavior-review.md) and complete its diagnosis, placement, and approval steps before editing. A request to add a rule does not skip those steps.
- For rule wording or placement, use the review criteria below.
- For deployment differences, read [reconciliation.md](reconciliation.md).
- For the rationale or original user requirements, read [provenance.md](provenance.md). Routine edits do not require rereading the conversation or article.

## Review criteria

- Preserve explicit user preferences. Distinguish user instructions from assistant suggestions, quoted commands, and historical tool output.
- Start with a demonstrated gap between actual behavior and the user's desired behavior, not reusability alone. Check whether missing guidance, non-adherence, conflicting instructions, or execution conditions caused it before adding rules.
- When evaluating a correction or coaching, also ask what tool, check, or technique would have detected or prevented the failure faster than guidance; route that capability work to the owning skill or tooling instead of codifying discipline alone.
- Put project goals and project-specific behavior in project rules, task procedures in narrowly triggered skills, and stable cross-task behavior in shared AGENTS.md. Shared additions require the highest bar: evidence of the gap, alignment with explicit preferences, a reason for global scope, and an explanation of why existing guidance is insufficient.
- Write agent-authored Markdown entirely in English. This does not restrict conversational reply language.
- Replace or merge equivalent rules rather than appending paraphrases. Review affected guidance for duplication, contradictions, supersession, invalid premises, portability, and loss of behavioral benefit. Propose pruning or narrower scope from observed cases; inactivity alone does not make a rule obsolete. Confirm semantic removals or scope changes before applying them.
- Report only supported issues. A review may conclude that no changes are needed; do not invent defects or enforce an arbitrary length quota.
- Keep skill descriptions short and specific. Use conditional links for longer workflows, not an exhaustive catalog or mandatory reading list for every task.
- Define relevant completion evidence and stop boundaries. Scale checks to the change; document-only edits do not inherently require runtime or full-repository tests. Do not weaken safety or verification merely because a model is claimed to be more capable.

## Synchronize only after editing the Pi entry point

For shared-rule or Codex-only changes, skip this section. Never deploy the shared file through the Pi synchronization script.

Resolve this skill directory to its real path first if it is installed through a symlink. The repository root is two directories above it.

Run `node scripts/sync-agent-rules.mjs --check` from that root to inspect status. After an authorized source edit, run `node scripts/sync-agent-rules.mjs --apply`. For reviewed deployment conflicts, pass `--approve=<token>` from the current check; this approves the exact reviewed inputs, not future changes. Incorporate accepted global edits into the source before deployment. The script reads `PI_CODING_AGENT_DIR` when configured. It never commits or pushes.

Run `node scripts/test-agent-rules.mjs` when changing synchronization code. File edits and Git pulls do not invoke the script by themselves; this workflow must call it. There is no background watcher.

## Approved publication

Approval of a concrete maintenance plan authorizes its edits, relevant checks, deployment, Git commit/push, and synchronization to the agreed remote targets. Do not ask again for these same approved steps. Include only approved changes; preserve unrelated work. Verify the configured repository, branch, remote, and deployment destinations before publishing. Unknown destinations, changed scope, conflicts, or failed relevant checks block the affected publication step, not independent authorized work. Never guess a remote machine from unrelated history.

Shared and Codex files remain directly maintained outside this repository; do not add a shared-rule copy to Git merely to publish it. Git push publishes repository content, not external local files or another machine's active configuration. Synchronize agreed remote deployments separately, with backups and post-write comparison; report partial publication honestly.

## Completion

For a content edit, inspect the final diff, check English-only prose and changed links, and identify unresolved meaning conflicts. When a change affects entry-point loading, shared-rule placement, or instruction precedence, verify the affected entry points and references: they must explicitly require reading the shared file, avoid duplicating its rules, and preserve the referenced guidance's owning scope. A static check does not prove model adherence; report fresh-session behavioral tests separately when performed. For synchronization, additionally require backup and post-write comparison evidence as described in reconciliation.md. Report content, deployment, and Git status separately. Editing a file does not prove discovery by Pi; pulling Git does not prove deployment. Commit, push, or change remote files only within the user's authorization.

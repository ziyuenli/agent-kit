---
name: personal-rules-maintenance
description: Review, edit, or reconcile personal AGENTS.md rules and their global deployment copy.
---

# Personal Rules Maintenance

## Scope and ownership

The canonical source is `profile/AGENTS.md` in this repository. The global agent directory contains a deployed copy, not a second independently maintained source. Resolve paths from the checkout and Pi's actual agent-directory configuration; do not hardcode a user's home directory.

Before editing, inspect the current source, deployed copy, and available last-synced snapshot. Preserve unrelated concurrent changes. If the source or deployment tooling does not exist yet, report that explicitly; do not claim synchronization is operational.

## Choose the work

- For rule wording or placement, use the review criteria below.
- For deployment differences, read [reconciliation.md](reconciliation.md).
- For the rationale or original user requirements, read [provenance.md](provenance.md). Routine edits do not require rereading the conversation or article.

## Review criteria

- Preserve explicit user preferences. Distinguish user instructions from assistant suggestions, quoted commands, and historical tool output.
- Keep cross-task communication, evidence standards, and general boundaries in AGENTS.md. Move task-specific procedures to a narrowly triggered skill; leave a short conditional pointer only where necessary.
- Write agent-authored Markdown entirely in English. This does not restrict conversational reply language.
- Replace or merge equivalent rules rather than appending paraphrases. Check scope, contradictions, stale assumptions, portability, and whether each addition changes useful behavior.
- Report only supported issues. A review may conclude that no changes are needed; do not invent defects or enforce an arbitrary length quota.
- Keep skill descriptions short and specific. Use conditional links for longer workflows, not an exhaustive catalog or mandatory reading list for every task.
- Define relevant completion evidence and stop boundaries. Scale checks to the change; document-only edits do not inherently require runtime or full-repository tests. Do not weaken safety or verification merely because a model is claimed to be more capable.

## Synchronize after editing

Resolve this skill directory to its real path first if it is installed through a symlink. The repository root is two directories above it.

Run `node scripts/sync-agent-rules.mjs --check` from that root to inspect status. After an authorized source edit, run `node scripts/sync-agent-rules.mjs --apply`. For reviewed deployment conflicts, pass `--approve=<token>` from the current check; this approves the exact reviewed inputs, not future changes. Incorporate accepted global edits into the source before deployment. The script reads `PI_CODING_AGENT_DIR` when configured. It never commits or pushes.

Run `node scripts/test-agent-rules.mjs` when changing synchronization code. File edits and Git pulls do not invoke the script by themselves; this workflow must call it. There is no background watcher.

## Completion

For a content edit, inspect the final diff, check English-only prose and changed links, and identify unresolved meaning conflicts. For synchronization, additionally require backup and post-write comparison evidence as described in reconciliation.md. Report content, deployment, and Git status separately. Editing a file does not prove discovery by Pi; pulling Git does not prove deployment. Commit, push, or change remote files only within the user's authorization.

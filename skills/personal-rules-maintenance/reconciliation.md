# Reconciliation and Deployment

The synchronization script implements the file comparison and deployment steps below. Semantic review remains the agent's responsibility. Its lock serializes script runs; input checks detect observed external edits but cannot prevent a non-cooperating editor from writing between the final check and atomic replacement. Avoid concurrent manual edits during deployment.

Compare the canonical source (S), global destination (D), and last successfully deployed snapshot (B). Preserve original inputs while reviewing differences.

- S equals D: no replacement is needed; establish or verify the snapshot.
- Only S differs from B: back up D, then deploy S.
- Only D differs from B: review the global edits and propose incorporating appropriate changes into S; do not silently overwrite D or promote all its edits.
- Both differ from B: prepare a three-way merge draft. Textual merge success does not establish semantic consistency. Check scope and meaning before deployment; ask the user to resolve genuine policy choices.
- B is missing: treat this as first-time reconciliation. Compare both files and obtain a decision for meaningful differences rather than assuming either is disposable.

For an authorized deployment, the script must:

1. Serialize synchronization and recheck that reviewed inputs have not changed before writing. Stop on concurrent edits.
2. Back up the existing destination with a unique name and restrictive permissions. If backup fails, stop.
3. Write through a temporary file in the destination directory and replace atomically. Preserve appropriate access permissions; never truncate the live file in place.
4. Verify destination bytes against the approved source, then record the successful snapshot and hashes. A partial failure must be reported, not treated as a successful sync.
5. Report destination, backup location, and result. Never delete user backups as an incidental cleanup step.

Keep backups and synchronization state out of Git. The canonical source and maintenance tooling belong in Git. A pull alone does not deploy global rules. A skill alone does not watch files or trigger synchronization; an explicit script invocation or configured install/update hook is required.

Validate implemented tooling with disposable fixtures covering first deployment, unchanged files, source-only edits, global-only edits, changes on both sides, missing snapshots, backup failures, and concurrent edits. Do not use the user's live configuration as a test fixture.

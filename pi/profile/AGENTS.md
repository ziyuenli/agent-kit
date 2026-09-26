# Pi Entry Point

Before responding or performing task work, read `~/.agents/AGENTS.md` in full for shared defaults, precedence, and task routing, unless its full current content is already supplied in context. If it cannot be read completely, report the blocker before proceeding. After context compaction, reread it if its full content is no longer available.

The referenced file remains shared guidance, regardless of when it is read; it does not override applicable project rules. This is an explicit instruction to read a file, not a native Markdown import.

## Maintenance

Before changing this Pi entry point, read `~/.agents/skills/rules-maintenance/SKILL.md` for source ownership and deployment checks. Maintain `pi/profile/AGENTS.md` in the `agent-kit` repository and deploy it with `node pi/scripts/sync-agent-rules.mjs` from that repository root. Shared rules are maintained separately at `~/.agents/AGENTS.md`; do not copy them into this file.

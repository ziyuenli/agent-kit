# Claude Entry Point

Before responding or performing task work, read `~/.agents/AGENTS.md` in full for shared defaults, precedence, and task routing, unless its full current content is already supplied in context. If it cannot be read completely, report the blocker before proceeding. After context compaction, reread it if its full content is no longer available.

@~/.agents/AGENTS.md

The referenced file remains shared guidance, regardless of when it is read; it does not override applicable project rules.

## Maintenance

Shared rules are maintained only at `~/.agents/AGENTS.md` (source: `agent-kit/AGENTS.md`); do not copy them into this file. This entry point's source is `claude/CLAUDE.md` in the `agent-kit` repository. Deploy it as the symlink `~/.claude/CLAUDE.md -> ~/agent-kit/claude/CLAUDE.md`.

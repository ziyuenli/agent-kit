# Principles to existing owners and checks

**Pending review; reference snapshot dated 2026-09-26.** This map locates existing capabilities and candidate gaps. It grants no execution authority. Project observations come from local documents and the dated harness audit; no remote runtime was probed for this extraction. Refresh a live owner before using its current stage or authorization. Absolute PHU links are local-machine references, not portable deployment paths.

## Status meanings

- **Existing:** a relevant artifact or tool exists; the evidence column states what was actually checked.
- **Guidance only:** a procedure exists, without demonstrated automatic enforcement.
- **Missing implementation:** the dated audit identified a requested capability that had not been implemented; inspect the live runtime before starting implementation.
- **Not currently required:** no demonstrated requirement or authorization justifies building it. This is not permanent rejection.

All course-note review groups remain Pending regardless of these implementation statuses.

## Instruction, tool and environment entries

| Principles / harness part | Status | Actual owner | Verification entry and limit |
|---|---|---|---|
| L01, L04: rule diagnosis and placement / instructions | Existing | [rules-maintenance](../../skills/rules-maintenance/SKILL.md), [behavior review](../../skills/rules-maintenance/behavior-review.md) | Use the existing failure diagnosis and review criteria. Presence was inspected; model transfer is not proved. |
| L04: shared source and short native entries / instructions | Existing | [shared AGENTS](../../AGENTS.md), [Pi source](../../pi/profile/AGENTS.md), local [Codex entry](/Users/leetzeyuen/.codex/AGENTS.md) | Existing sync check below. Prior repair `270bd5b` passed source/link/path checks and Pi deployment byte comparison; no fresh cross-agent test was run. |
| L06: Pi deployment / tools and environment | Existing | [sync helper](../../pi/scripts/sync-agent-rules.mjs), [backup helper](../../pi/scripts/manage-rule-backups.mjs), [Pi README](../../pi/README.md) | Use `--check` before a separately authorized deployment. This verifies file relationships, not scientific environments or model compliance. |
| L07, L09, L11: scoped delegation / instructions and feedback | Guidance only | [delegated-execution](../../skills/delegated-execution/SKILL.md) | Inspect actual assignment and returned evidence for a selected authorized task. The shared skill link works; the skill is not a scheduler or enforcement engine. |
| L06, L09, L10: scientific setup and verification / environment and tools | Existing | [PHU architecture](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/ARCHITECTURE.md), [current experiment plan](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/BASELINE_PREPARATION.md), [runtime procedure](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/docs/formal-runtime-convergence.md) | Retrieve the exact selected contract and verification entry through the current plan. Do not embed an obsolete repair command here. Existence is established; no runtime result is claimed by this map. |

## State and feedback entries

| Principles / harness part | Status | Actual owner | Verification entry and limit |
|---|---|---|---|
| L03, L08: scope, current work and evidence routing / state | Existing | [PROJECT](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/PROJECT.md), [plan](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/BASELINE_PREPARATION.md), [CATALOG](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/CATALOG.md) | Recover the research goal, selected stage, inputs/source, next authorized work and checks. These owners exist; the map does not duplicate their changing progress. |
| L03, L05, L12: reasons, alternatives and deprecation / state | Guidance only | [record maintenance](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/docs/research-record-maintenance.md), [ledger](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/RESEARCH_LEDGER.md) | Inspect a selected material decision for source, reasons, implementation/evidence locators, unknowns and reopening conditions. Field presence cannot prove truthful or complete reasoning. |
| L03, L05: fresh-session recovery / feedback | Existing, bounded historical test | [recovery answer](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/temporary/harness-review-2026-09-25/recovery-answer.md), [audit limits](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/temporary/harness-review-2026-09-25/REVIEW.md) | Reuse the dated result only within its scope. The test retained normal startup context and predates later restructuring; it is not a pristine off-machine or current-version pass. |
| L05: automatic occupancy trigger, rationale capture and compaction recovery / state | Missing implementation at the dated audit | [automatic handoff gap](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/temporary/harness-review-2026-09-25/REVIEW.md#automatic-context-handoff-gap) | No runnable end-to-end acceptance entry exists in that record. Future implementation needs real runtime events/telemetry and a recovery test; never claim a documentation-only pass. |
| L03, L04: module knowledge near code / instructions and state | Guidance only for general deployment | [record maintenance](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/docs/research-record-maintenance.md), [architecture locator](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/ARCHITECTURE.md) | Follow the actual module locator and compare descriptions with code/evidence. A local rule does not deploy module documentation to the separate scientific repository. |
| L09-L11: acceptance and original results / feedback | Existing records and stage-specific checks | [QUALITY](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/QUALITY.md), [selected plan](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/BASELINE_PREPARATION.md) | Use the bound result and applicable check for the claim. Delivery, smoke, raw products and scientific acceptance are separate facts; no new scientific check ran here. |
| L12: versioned checkpoints and off-machine recovery / state | Existing local Git; backup destination unresolved in audit | [project audit](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/temporary/harness-review-2026-09-25/README.md), [artifact inventory](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/temporary/harness-review-2026-09-25/external-artifacts.json) | Git recovery covers tracked bytes. An inventory/hash is not a data backup; external products and environment require their own recovery path. |
| L13: new autonomous loop / tools | Not currently required | Selected task would own any future loop; [delegation guidance](../../skills/delegated-execution/SKILL.md) applies where relevant | Require an actual authorized repeated workflow and stopping/verification design before choosing implementation. |
| L14: research branching versus orchestration / state | Existing recovery index; new graph engine not currently required | [ledger recovery points](/Users/leetzeyuen/Documents/ChatGPT/phu-in-forest/RESEARCH_LEDGER.md#research-recovery-points) | Existing dated parent/evidence links support navigation and scoped branching. Document recovery does not replay computations. |

## Minimal executable entries already available

Use these only for the indicated review. They are not a mandatory preflight for unrelated tasks. No new checker was introduced for this distillation.

From the `agent-kit` repository root:

```sh
# Inspect local modifications and their formatting.
git status --short --branch
git diff --check

# Inspect the existing Pi source/deployment relationship and shared link.
node pi/scripts/sync-agent-rules.mjs --check
```

The synchronization check can create its local state directory and a temporary lock; it does not deploy source without `--apply`. Do not run it concurrently with deployment. The previously approved repair already exercised it; this extraction did not rerun unchanged deployment checks.

From the PHU repository root, a known historical documentation retrieval example is:

```sh
git show e82559a:RESEARCH_LEDGER.md
```

This reads a historical blob without replacing current files. Historical instructions do not become active through retrieval. For scientific verification, follow the current plan's selected entry rather than copying a command into this review queue.

## Proposed order after review

1. Decide which distilled principles to retain or adapt using the review queue.
2. Reuse existing owners and checks. Add a small check only for a demonstrated recurring, mechanically decidable gap.
3. Treat compaction automation as a separate implementation proposal with runtime evidence and a scoped recovery test.

Neither a valid path nor a populated decision field proves scientific validity, complete reasoning, correct execution or user acceptance.

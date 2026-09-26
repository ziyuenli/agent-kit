# Distilled harness principles

**Unreviewed reference.** This condenses the previously scanned 14 lectures. Each numbered entry separates the course idea from a candidate adaptation for Li's research. Read [the provenance and review queue](README.md) before adopting changes. These notes do not override current instructions.

## L01 — Diagnose the failure before adding a rule

[Lecture 01](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-01-why-capable-agents-still-fail/)

**Course idea:** Strong reasoning cannot compensate for missing requirements, hidden conventions, unavailable tools, incomplete environments or absent verification. Identify what information or feedback the failed task lacked.

**Candidate use:** Retain the observed failure, expected behavior and supported cause; choose a rule, tool or environment repair accordingly. Reuse `rules-maintenance` for guidance failures. Evidence of improvement is a relevant task behaving correctly, not merely a longer prompt. Do not infer model inadequacy or a global rule gap from one failed task.

## L02 — Inspect all five parts of the harness

[Lecture 02](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)

**Course idea:** Instructions specify the task; tools enable actions; the environment supports execution; state supports continuity; feedback establishes what happened.

**Candidate use:** Map existing artifacts and capabilities across those five parts. Missing filenames do not prove missing capability. A documented command does not prove that a tool or environment actually works. Use the implementation map before proposing additions.

## L03 — Persist knowledge where the next session can find it

[Lecture 03](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/)

**Course idea:** Put project purpose, architecture, constraints, decisions, progress and verification paths in durable, discoverable records. Keep module knowledge near its code and update it with implementation. Test recovery in a fresh session.

**Candidate use:** Reuse the project's designated owners and Git checkpoints. Ask a fresh session to locate scope, organization, run/check entries, current work and evidence. Retain precise external artifact locators where inputs cannot live in Git. Repository descriptions do not replace current runtime observations; external evidence remains usable when explicitly accessible. Recovery of documents does not restore excluded data or remote environments.

## L04 — Use a short entry and conditional detail

[Lecture 04](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-04-why-one-giant-instruction-file-fails/)

**Course idea:** Large instruction files consume context, mix unrelated concerns, hide important conditions and accumulate contradictions. Keep the entry short, with essential constraints and topic links stating when to read them. Retain rule sources, applicability and retirement reasons.

**Candidate use:** Put stable cross-task behavior in shared rules, project concerns in project owners, and task procedures in narrowly routed skills/docs. Treat the course's 50-200-line suggestion as a heuristic, not a quota. Preserve conditions, exceptions and obligation strength during shortening. Link checks establish reachability; changed task behavior establishes usefulness. Attention effects do not guarantee that a particular rule will be missed or followed.

## L05 — Save why before context is lost

[Lecture 05](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/)

**Course idea:** New sessions and compaction can lose rationale even when action summaries survive. Persist progress, decision reasons and checkpoints; recover from those records before continuing. The lecture suggests preparing a handoff around 60% of the context window.

**Candidate use:** Record material decisions incrementally: choice, reason, alternatives, known scope, unknowns, implementation, verification and next action. Before compaction save the remaining delta; after it reload the selected route and verify its checkpoint. A real occupancy trigger needs runtime telemetry; cumulative token usage is not retained context. A hook alone cannot recover unstored reasons. Reopening a decision remains legitimate when new evidence or user intent changes its basis.

## L06 — Establish the working entry before implementation

[Lecture 06](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-06-why-initialization-needs-its-own-phase/)

**Course idea:** Initialization makes the environment, task list, run commands, verification and handoff usable for later work.

**Candidate use:** For an existing project, locate and check its actual entries rather than scaffold a replacement. Record missing prerequisites and the smallest relevant probe. Reuse unchanged validation; avoid a full setup on each session. A setup description is weaker evidence than an executed check in the relevant environment.

## L07 — Bound the current work unit

[Lecture 07](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-07-why-agents-overreach-and-under-finish/)

**Course idea:** Broad assignments invite scope creep and multiple unfinished tasks. The course uses one active work unit, WIP=1, as a default with a defined completion condition.

**Candidate use:** Give an assignment a clear boundary and return evidence. Do not turn WIP=1 into a global prohibition on independent authorized experiments. Plans may pause, fail, fork or be replaced; retain their reasons and outputs. Completion is scoped to the assigned work, not closure of the whole research question.

## L08 — Track behavior, verification and state together

[Lecture 08](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/)

**Course idea:** Durable task items describe expected behavior, how it is checked, current state and evidence. Writing code does not establish that a feature works.

**Candidate use:** Reuse the selected plan/task/contract; avoid another progress registry. For research, distinguish hypothesis, decision, implementation, observed result and acceptance. Acceptance is scoped to inputs and methods. Do not force an exploratory question into an irreversible Boolean completion field.

## L09 — Require evidence beyond self-assessment

[Lecture 09](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-09-why-agents-declare-victory-too-early/)

**Course idea:** Agent confidence is not verification. Static checks, actual execution and system-level checks establish different facts; feedback should identify concrete failures.

**Candidate use:** Link original results and relevant independent checks. A successful command exit, delivered report or reviewer agreement alone is insufficient for numerical or scientific claims. Reuse applicable evidence; do not add universal approval gates. Report exactly what each check covers and what remains unknown.

## L10 — Exercise the relevant integrated path

[Lecture 10](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-10-why-end-to-end-testing-changes-results/)

**Course idea:** Unit checks can miss integration failures across interfaces, state transitions and target environments. Repeatable, mechanically recognizable defects can become executable checks.

**Candidate use:** Select the smallest actual path that exposes the changed behavior. Preserve a failing witness where useful, then check the affected integration. Do not rerun expensive unchanged science merely because documentation changed. Harness smoke success and scientific acceptance remain distinct.

## L11 — Observe execution and retain evaluation context

[Lecture 11](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-11-why-observability-belongs-inside-the-harness/)

**Course idea:** Logs, runtime state and result artifacts make failures diagnosable; evaluation context explains the basis of acceptance.

**Candidate use:** Retain assignment, source/input identity, relevant process/controller evidence, result locations, criteria and limitations. Prefer durable worker reports and event delivery under the project's execution policy. More logs or repeated model polling do not inherently improve observability. A listener's success establishes transport only.

## L12 — Leave an honest handoff and maintain the harness

[Lecture 12](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-12-why-every-session-must-leave-a-clean-state/)

**Course idea:** End sessions with recoverable progress, verification, artifact locations and next steps. Retire stale or unnecessary harness instructions.

**Candidate use:** Save coherent checkpoints and preserve reasons. A valid research handoff may be blocked, failed or superseded. Retain failed results and deprecation history; clean up only known unnecessary task artifacts. A clean Git status is not proof of scientific correctness, and historical evidence must not regain execution authority merely through a link.

## L13 — Automate only a bounded, verifiable loop

[Lecture 13](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-13-loop-engineering/)

**Course idea:** Repeated autonomous work needs an objective, verification, stop conditions and external state. Automation magnifies weak checks, loss of understanding and cost.

**Candidate use:** Establish a reliable single run and a demonstrated repetition need first. Specify authority, resources, failure handling and human decision points for that loop. No loop is installed or authorized by these notes. Do not treat an open research objective as permission for indefinite execution.

## L14 — Make dependencies explicit when coordination needs it

[Lecture 14](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-14-graph-engineering/)

**Course idea:** A task graph can expose dependencies, shared state, branches and failure routes when coordination complexity warrants the maintenance cost.

**Candidate use:** Reuse research recovery nodes and supported parent/evidence links first. Add orchestration only for a concrete execution need. Navigable research history already supports revisiting and branching without requiring a graph engine. A link establishes neither causal proof nor permission to replay work.

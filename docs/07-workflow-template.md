# 07 - Workflow Template

The contract every workflow in this repository follows. The nine files under
`workflows/` are written to it; this document is the reason they look alike, and
the test a new workflow has to pass before it is accepted.

## 1. What a workflow is

A **workflow** is a gated process. It is the long, ordered part of a domain:
the phases, the gate each phase must clear, the recovery path when a gate
fails, and the checklist that proves the work is finished.

A **skill** is short and decisive. It answers "what is this, which of the
options do I take, and where do I look next" in a few hundred lines. It points
at the workflow for the procedure.

| Question | Answered by |
|---|---|
| Which option is correct here? | the skill |
| In what order do I do the work? | the workflow |
| How do I know the step worked? | the workflow gate |
| What do I do when it breaks? | the workflow recovery path |
| What may I never do? | the doctrine |

Reading both is cheap: the skill is loaded to route, the workflow is read to
execute. A workflow that is loaded always has failed the context budget
([06-context-budget.md](06-context-budget.md)).

## 2. The section contract

Every workflow uses these eight second-level sections, in this order.

```
# <Domain> workflow
## When to use
## When not to use
## Before you start
## Steps
## Limitations
## If a step fails
## Done when
```

What each section owes the reader:

| Section | Contract |
|---|---|
| `When to use` | Three to six bullets naming the request shapes that belong here. |
| `When not to use` | Three to six bullets; each names the workflow that owns that request instead. |
| `Before you start` | The prerequisites, the operating tier, the fallback for a missing tier, and what must already be true. |
| `Steps` | The ordered phases. Every phase carries a `**Gate:**` line. |
| `Limitations` | What this workflow does not cover, and the known limits of the approach. |
| `If a step fails` | The recovery order: what to stop, what to revert, what to re-read, when to hand to a human. |
| `Done when` | A checkbox list of observable facts, each naming its evidence. |

An annotated, short example of one step and one gate:

```markdown
### Phase 2 - Package set

- [ ] Pin every package version in `Packages/manifest.json` (ADR-0004).
- [ ] Commit `Packages/packages-lock.json` beside it.
- **Gate:** the lock file parses and the editor reports no missing package.
```

The gate is observable: a parse, a log line, a test result, a build artefact.
"Felt right", "looks good" and "the profiler was fine" are not gates.

## 3. Vocabulary

| Term | Meaning in this repository |
|---|---|
| **Gate** | A pass or fail a step must clear before the next step starts. |
| **Evidence** | The artefact that clears the gate: a log line, a test result, a build output, a read-back value, a stored capture. |
| **Tier** | The capability level the agent operates at: T0 file edit, T1 Unity CLI, T2 live editor, T3 device ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)). |
| **Handoff** | A transfer of a step to a human, written as a `HUMAN HANDOFF` block with What, Why, Steps and Verify. |
| **Deviation record** | A written note that a step was departed from: the gate, the reason, the person who accepted it, the date. |
| **Done when** | The final checklist. It names the observable proof for every claim, and it stays open while anything is unproven. |

## 4. Why gates and read-backs

A tool that reports success is not evidence. A build script that exits 0, a
linter that prints no errors and a profiler window that looks healthy are all
claims about a state nobody read back.

The gate therefore names the read-back: the value that is fetched after the
change and compared against the expectation. Where the workflow cannot perform
the read-back itself, it says who will, or it degrades the tier and records
that the result is unverified on hardware. A gate that cannot be observed at
the current tier is a handoff, not a silent pass.

The same rule decides precedence: a measured artefact beats a default, and a
default beats an opinion ([doctrine/00-precedence.md](../doctrine/00-precedence.md)).

## 5. Workflow, skill, or doctrine

| Need | Use |
|---|---|
| A rule that applies everywhere, with no procedure | doctrine |
| A decision between options, plus where to look next | a skill |
| An ordered procedure with a gate per step and a recovery path | a workflow |

If a request needs two of these, it needs all of them: the doctrine sets the
rule, the skill picks the option, the workflow runs the procedure. A workflow
that states a rule that doctrine already owns is a restatement, and the
validator fails the build on it.

## 6. How to write one

1. Write the sections in the contract order, and no other second-level
   heading. Subsections inside `Steps` are `###` and carry the phase name.
2. Number the steps. A step that cannot be numbered is not a step; it is a
   note, and it belongs in `Limitations` or in the owning skill.
3. Give every step exactly one gate, and make the gate observable. If two
   gates are needed, the step is two steps.
4. Write the finish line as a checklist of facts, each with its evidence.
5. Write the recovery path before you write the first step. A workflow without
   a recovery path is fiction: it assumes the happy path always happens.
6. Keep every step executable. A CLI command, an editor script, a file edit,
   or a `HUMAN HANDOFF` block. No window instructions.
7. Link to doctrine, claims and ADRs instead of copying them. One fact, one
   place.
8. State the numbers as either an API fact with a claim id, or a project
   default labelled `Project default - tune against <measurable>`. An
   uncited number is a guess.
9. Say which document lives in the user's project and which lives in this
   repository. A project document that does not exist yet is a phase 1
   blocker, never a broken link.
10. Keep the file inside the workflow budget: 520 lines and 28,000 bytes.

## 7. The growth protocol

The repository caps the number of workflows
([06-context-budget.md](06-context-budget.md) §5). A new workflow must
therefore **replace or merge an existing one**, and the proposal says which.

| Requirement | Why |
|---|---|
| It replaces or merges a named workflow | The cap exists so every workflow stays reachable and every domain keeps one entry point. |
| It has disjoint triggers from every other workflow | Two workflows claiming the same request means the router cannot choose. |
| It has a decision record when it settles a contested default | A default that two sources disagreed about needs a written owner, or the disagreement returns. |
| It names the skill that owns it | A workflow with no owner is an orphan, and the validator fails the build. |
| Its gates are observable at the tier it runs at | Otherwise the workflow cannot be executed. |

A capability that does not need a gated process ships as a reference, not as a
workflow (ADR-0015).

## 8. Failure modes of workflows

| Failure | Symptom | Fix |
|---|---|---|
| A step is too big | The gate needs three different proofs, so nobody can name the evidence | Split the step; one gate per step. |
| A gate cannot be observed | The step ends with "verified" and no artefact | Degrade the tier, or write a handoff that names the reader. |
| The recovery path is fiction | It says "revert and retry" without saying what to revert or how to confirm the revert | Name the revert, the re-read, and the point where a human takes over. |
| The workflow restates doctrine | The same rule now exists in two files and the two drift | Link to the owner; keep the procedure. |
| The workflow has no owner | Nothing routes to it, so it is never read | Give it a skill, or fold it into one that has. |
| Every step passes on the first try | The gates measure nothing, because they cannot fail | Write the gate so a wrong result is visible. |
| The workflow drifts from the skill | The skill says one thing, the workflow another | The skill owns the decision; the workflow owns the procedure. |

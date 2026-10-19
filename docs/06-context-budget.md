# 06 — Context Budget

Unity Loom's budgets exist to stop **fluff and duplication**, not to police the
size of useful content. A file that teaches a domain thoroughly is not bloat; a
file that repeats another file in slightly different words is. This document
defines the difference, the numbers that are machine-enforced, and how to
change them.

The machine copy of the numbers lives in `manifest.json` → `budgets`. This
document is the human copy and the rationale. `docs/02-build-plan.md` §7 points
here instead of restating the table, so the two can never disagree.

## 1. What a budget is for

| Budget protects against | How |
|---|---|
| A skill that never loads | frontmatter schema and length lint |
| A skill that floods the context | per-file line/byte cap, and the total core figure |
| The same advice in three files | the no-restatement rule (canonical lines must be unique) |
| A rule that stops being checked | the validator's self-test |

## 2. Why the budget exists at all

The cost of a file is paid on **every** task that loads it, not on the task
that wrote it.

- The router loads on every Unity request, so every byte of it is a byte of
  tax on every task.
- A domain skill loads on every task in its domain, and so does its workflow.
- The core corpus is what a harness has to hold, or page, to be useful at all.

So a file that is 40 percent fluff is 40 percent tax: the reader pays for the
padding on every use, and the padding never pays anything back. That is the
whole argument for the caps, and the reason the caps are measured in bytes
rather than in lines of prose: the reader pays for the token, not for the
sentence.

The corollary is that **a cap is not a target**. A file that sits well under its
cap because it says one thing clearly is finished. A file at its cap with
nothing left to say is finished too, and should be deleted rather than grown.

## 3. Per-artifact limits

| Artifact | Lines | Bytes | Rationale |
|---|---|---|---|
| Router `unity-loom/SKILL.md` | 140 | 8,000 | Always resident; every line taxes every task |
| Domain `SKILL.md` | 340 | 16,000 | A domain skill must carry its decision tree, defaults, code and gates — not a summary of them |
| Workflow | 520 | 28,000 | A workflow is the deep part: phases, gates, tables, failure triage |
| Doctrine file | 170 | 7,000 | The law stays short so it is obeyed, not skimmed |
| Reference file | 520 | 48,000 | Detail lives here on demand; a reference earns its size by being dense, not long |
| **Total core** (all `SKILL.md`) | — | **140,000** | The whole system still fits comfortably in a fraction of a modern context window |
| Skill count | **12** | — | Growth requires removing one first |
| Workflow count | **10** | — | One per domain, no orphans |
| Reference count | **8** | — | New capability ships as a reference, not a skill (ADR-0015) |
| Orphan files | 0 | — | Every file listed in `manifest.json` |
| Duplicated canonical lines | 0 | — | No-restatement rule |
| External dependencies (core) | **0** | — | Markdown only |

The core total is the ten `SKILL.md` files: one router and nine domain skills.
They measure **about 104,000 bytes** today, so roughly three quarters of the
budget is in use. The headroom is deliberate: it is room for substance to grow
into without a raise, and it is why a raise is a decision rather than an
accident.

## 4. What counts as fluff

Remove these, always:

- Restatement of doctrine, a claim, or another file in different words (the
  no-restatement lint catches long lines; a human catches the rest).
- Motivation, apology, hedging, and "it's important to note" prose.
- A rule with no action attached ("be careful with performance").
- Examples that teach nothing the surrounding text does not already say.
- A checklist item that no workflow step can produce evidence for.
- Empty scaffolding: sections with a heading and no content.

Keep these, always, even when they cost bytes:

- A decision and the reason for it.
- A table that collapses a comparison the reader would otherwise have to hold
  in their head.
- A code pattern that is correct, allocation-aware, and short enough to copy.
- A gate with the observable evidence that clears it.
- A failure symptom mapped to its cause and the first thing to check.
- The exact command, and the exact handoff for the parts a machine cannot do.

## 5. Structural limits

| Limit | Value | Meaning |
|---|---|---|
| Skills | 12 | Growth requires removing one |
| Workflows | 10 | One per domain; no orphans |
| Doctrine files | 8 | Stable; additions need justification |
| References | 8 | Detail on demand |
| Orphan files | 0 | Every file is in `manifest.json` |
| Duplicated canonical lines | 0 | One fact, one place |
| External core dependencies | 0 | Markdown only |

The repository holds **10 skills** and **9 workflows** today: one router, nine
domain skills, and one workflow per domain. Those are the current counts, not
the caps. The caps are 12 and 10, and the growth protocol in §8 is the only
route past them. A new skill that does not replace or merge an existing one
does not fit under the cap, whatever its merit, so it becomes a reference
instead.

## 6. Why these numbers

- **A fraction of a context window.** Even a 200k-token window should not
  spend more than a fraction on *instructions*, leaving room for code and tool
  output.
- **Line caps over word caps.** Lines are what agents skim; a line ceiling
  keeps a document navigable.
- **Byte caps measured CRLF-normalized.** Prevents the Windows-checkout failure
  seen upstream (F11). `.gitattributes` forces LF in the repository as well.
- **The router stays the smallest.** It loads on every request; every line
  there taxes every task.

## 7. How to measure the real cost of a task

A task does not load the repository. It loads a **working set**, and everything
else is a lookup.

| Layer | What the task loads | When |
|---|---|---|
| The router | `skills/unity-loom/SKILL.md` | Every request |
| One domain skill | `skills/<domain>/SKILL.md` | Once the router has decided |
| One workflow | `workflows/<domain>.md` | When the procedure starts |
| Everything else | `doctrine/`, `references/`, `docs/` | On demand, at the moment a rule or a fact is needed |

So the working set of a typical task is three files: **router plus one domain
skill plus one workflow**. At the current budgets that is at most about 8,000
bytes of router, 16,000 bytes of skill and 28,000 bytes of workflow, or roughly
52,000 bytes — a quarter of the core corpus, and a small fraction of a modern
context window.

Everything else in `doctrine/` and `references/` is a lookup: it is read when a
specific rule or a specific claim is needed, and it is not held resident. This
is the reason the reference budget is the most generous one in the table. A
reference that is never consulted costs nothing; a skill that is always
consulted costs everything.

To measure the cost of a change, count the files the change adds to that
working set, not the files it touches in the editor.

## 8. Growth protocol

To add a skill, open a proposal that states: (1) the workflow it owns, (2) its
verification gate, (3) its disjoint triggers, (4) **which existing skill it
replaces or merges with**. Without those four, the content belongs in
`references/`.

To add a workflow, the same four, with a named workflow to replace or merge
([docs/07-workflow-template.md](07-workflow-template.md) §7).

To add a claim, add a row to `references/claims.md` with a source and a
version. No prose elsewhere.

To add a failure mode, follow the template in `docs/04-failure-modes.md` and
add its traceability row.

To change a budget, change `manifest.json` → `budgets` and this document in
the same commit, and say in the pull request why the content is substance
rather than fluff.

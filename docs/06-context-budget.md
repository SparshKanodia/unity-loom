# 06 — Context Budget

Unity Loom's budgets exist to stop **fluff and duplication**, not to police the size of useful content. A file that teaches a domain thoroughly is not bloat; a file that repeats another file in slightly different words is. This document defines the difference, the numbers that are machine-enforced, and how to change them.

The machine copy of the numbers lives in `manifest.json` → `budgets`. This document is the human copy and the rationale. `docs/02-build-plan.md` §7 points here instead of restating the table, so the two can never disagree.

## 1. What a budget is for

| Budget protects against | How |
|---|---|
| A skill that never loads | frontmatter schema and length lint |
| A skill that floods the context | per-file line/byte cap, and the total core figure |
| The same advice in three files | the no-restatement rule (canonical lines must be unique) |
| A rule that stops being checked | the validator's self-test |

## 2. Per-artifact limits

| Artifact | Lines | Bytes | Rationale |
|---|---|---|---|
| Router `unity-loom/SKILL.md` | 120 | 6,000 | Always resident; every line taxes every task |
| Domain `SKILL.md` | 320 | 14,000 | A domain skill must carry its decision tree, defaults, code and gates — not a summary of them |
| Workflow | 480 | 24,000 | A workflow is the deep part: phases, gates, tables, failure triage |
| Doctrine file | 140 | 6,000 | The law stays short so it is obeyed, not skimmed |
| Reference file | 420 | 32,000 | Detail lives here on demand; a reference earns its size by being dense, not long |
| **Total core** (all `SKILL.md`) | — | **120,000** | The whole system still fits comfortably in a fraction of a modern context window |
| Skill count | **12** | — | Growth requires removing one first |
| Workflow count | **10** | — | One per domain, no orphans |
| Reference count | **8** | — | New capability ships as a reference, not a skill (ADR-0015) |
| Orphan files | 0 | — | Every file listed in `manifest.json` |
| Duplicated canonical lines | 0 | — | No-restatement rule |
| External dependencies (core) | **0** | — | Markdown only |

## 3. The numbers are guards, not goals

- A file **at** its cap is not a finished file; a file **over** its cap is not automatically bloat.
- When a file is over the cap and the content is **substance** — a unique decision, a code pattern, a table, a gate, a triage row — the cap is **raised**, here and in `manifest.json`, in the same change. The cap moves to fit the content; it does not push the content out.
- When a file is over the cap because of **fluff**, the fluff is removed instead. See §4.

## 4. What counts as fluff

Remove these, always:

- Restatement of doctrine, a claim, or another file in different words (the no-restatement lint catches long lines; a human catches the rest).
- Motivation, apology, hedging, and "it's important to note" prose.
- A rule with no action attached ("be careful with performance").
- Examples that teach nothing the surrounding text does not already say.
- A checklist item that no workflow step can produce evidence for.
- Empty scaffolding: sections with a heading and no content.

Keep these, always, even when they cost bytes:

- A decision and the reason for it.
- A table that collapses a comparison the reader would otherwise have to hold in their head.
- A code pattern that is correct, allocation-aware, and short enough to copy.
- A gate with the observable evidence that clears it.
- A failure symptom mapped to its cause and the first thing to check.
- The exact command, and the exact handoff for the parts a machine cannot do.

## 5. Structural limits

| Limit | Value | Meaning |
|---|---|---|
| Skills | ≤ 12 | Growth requires removing one |
| Workflows | ≤ 10 | One per domain; no orphans |
| Doctrine files | 6 | Stable; additions need justification |
| References | ≤ 8 | Detail on demand |
| Orphan files | 0 | Every file is in `manifest.json` |
| Duplicated canonical lines | 0 | One fact, one place |
| External core dependencies | 0 | Markdown only |

## 6. Why these numbers

- **A fraction of a context window.** Even a 200k-token window should not spend more than a fraction on *instructions*, leaving room for code and tool output.
- **Line caps over word caps.** Lines are what agents skim; a line ceiling keeps a document navigable.
- **Byte caps measured CRLF-normalized.** Prevents the Windows-checkout failure seen upstream (F11). `.gitattributes` forces LF in the repository as well.
- **The router stays the smallest.** It loads on every request; every line there taxes every task.

## 7. Growth protocol

To add a skill, open a proposal that states: (1) the workflow it owns, (2) its verification gate, (3) its disjoint triggers, (4) **which existing skill it replaces or merges with**. Without those four, the content belongs in `references/`.

To add a claim, add a row to `references/claims.md` with a source and a version. No prose elsewhere.

To add a failure mode, follow the template in `docs/04-failure-modes.md` and add its traceability row.

To change a budget, change `manifest.json` → `budgets` and this document in the same commit, and say in the PR why the content is substance rather than fluff.

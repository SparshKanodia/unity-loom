# Doctrine 06 — Collaboration

Two agents, or an agent and a human, work the same project. This doctrine says how
they share it without overwriting each other.

## 1. Principle

- One agent owns one tree at a time.
- A file has one owner at a time.
- Nothing is committed that another agent did not ask to be committed.

## 2. Branch and worktree strategy

| Rule | Detail |
|---|---|
| One worktree per agent | Each agent works in its own worktree, in the repository's parent directory, named `<repo>-<agent>-<task>` |
| Scratch space | A worktree in the parent directory is the agent's own space; it needs no approval, and the agent states the path it used |
| One branch per task | Branch from the current base, named `<type>/<task>`, before the first edit |
| Default branch | The default branch is not edited directly unless the user asks for it |
| No history rewriting | Never force-push, rebase or reset a branch another agent or a human owns (see [doctrine/01-safety.md](01-safety.md) §1) |
| Clean up | A finished worktree is merged and removed, or left with a note saying why it stays |

The worktree path, the branch name and the project path appear in every reply, so
a second agent always knows whose tree it is reading.

## 3. A dirty working tree is reported before it is used

Before reading a tree for a task, report its state:

```text
git status --short
```

- A clean tree is stated in one word: `clean`.
- A dirty tree names every dirty file and says whether the change is mine, the
  user's, or unknown.
- An unknown change is never reverted, stashed or overwritten. Re-read the file
  first, then decide.
- `git reset --hard`, `git checkout --` and `git clean` are DESTRUCTIVE actions:
  they need the confirmation in [doctrine/01-safety.md](01-safety.md) §1.

## 4. Never commit secrets — generated files included

The rule in [doctrine/01-safety.md](01-safety.md) §2 covers every file an agent
writes, not only hand-written source. A generated file is a secret carrier too:

| Generated file | Why it leaks |
|---|---|
| A test or build report | prints environment variables and command lines |
| An exported log or crash dump | carries headers, tokens and device identifiers |
| A build manifest | records the environment of the build machine |
| A local settings or override file | holds a key the developer pasted |
| A captured screenshot | shows a token typed into a field |

- Scan the staged diff for credential-shaped strings before every commit; the
  validator does the same for tracked files (ADR-0014).
- A secret reaches the machine from the environment or from a config outside the
  repository, never from a file that is about to be committed.
- A secret found in an already committed file is reported with the file and line
  plus a rotation plan, and the history is not rewritten to hide it.

## 5. Commit granularity

- One commit is one coherent change: one behaviour, one fix, one rename.
- Two unrelated changes in one commit are split into two.
- No drive-by reformat, rename or whitespace sweep in a feature commit.
- The message says what changed and why, in one line, and names the evidence.
- A commit that leaves the project uncompilable is not a commit; it is a branch.
- Generated output that is not meant to be read by a human does not go in the
  commit unless the project tracks it (see [doctrine/05-non-invasiveness.md](05-non-invasiveness.md) §4).

## 6. Merge order

Merge in dependency order, so a merged tree always compiles:

1. Doctrine and the claim registry — the rules other files cite.
2. Skills — the decision trees and red lines.
3. Workflows — the processes that cite a skill or a claim.
4. References — the shared tables and ledgers.
5. Tooling and manifests — the machine registry that lists the files above.

- A workflow that cites a claim id merges after the registry row exists.
- A skill that links to a reference merges after the reference exists.
- One merge conflict is resolved by the file's owner, in the owner's tree.

## 7. Handing work to another agent

A hand-over is a written note, not a conversation. It states:

| Field | Content |
|---|---|
| Tree | the worktree path and the branch |
| Done | the files changed, with the commit id |
| Claim ids | every new or changed id in the registry, and where it was added |
| Evidence | the log line, test id, capture or artifact that proves it |
| Not done | the steps that remain, and why they stopped |
| Next | the single next step, in the receiving agent's words |

The receiving agent re-reads the state before acting; a hand-over is a report, not
a substitute for the freshness gate ([doctrine/03-state-freshness.md](03-state-freshness.md) §1).

## 8. Two agents, one file

- A file has one owner at a time. The owner is the agent whose task names the file.
- An agent that needs a file it does not own asks for it; it does not edit it.
- A claim id is added once. A second agent that needs the same fact reuses the id
  and adds a citation, never a second row (ADR-0012).
- A file that two agents must change is split first: one file per concern, or one
  agent per file, decided before either edits.
- A merge that touches another agent's file is reported to that agent, not resolved
  silently in the merger.

## 9. What an agent does

1. Creates or claims a worktree and a branch, and states both.
2. Reports the tree state before using it; a dirty tree is named file by file.
3. Reads the file it is about to change, and checks the last commit that touched it.
4. Keeps one coherent change per commit, and scans the staged diff for secrets.
5. Merges in the order of §6, so the merged tree compiles at every step.
6. Hands work over in the shape of §7, with the evidence and the next step.
7. Never edits a file another agent owns, and never reverts a change it did not make.

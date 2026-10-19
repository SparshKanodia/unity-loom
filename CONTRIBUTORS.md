# Contributors

Unity Loom is built in the open. This file is the roster: everyone whose
work is in the repository, and how they got there.

The roster is generated, not hand-maintained. A scheduled workflow reads the
contributor list from the GitHub API and rewrites the table between the
markers below, then opens a pull request if anything changed. The pull request
goes through the same review and the same validator as any other change, so
the roster is never an unreviewed write to `main`.

<!-- BEGIN CONTRIBUTORS -->
| Contributor | Contributions |
|---|---|
| [@SparshKanodia](https://github.com/SparshKanodia) | 12 |
<!-- END CONTRIBUTORS -->

**Maintainer:** [@SparshKanodia](https://github.com/SparshKanodia) — the
account that reviews and merges every pull request, and the only one that may
bypass the branch ruleset.

## How to be listed

Every commit that lands on `main` counts, whatever its size. A one-line
typo fix, a broken link, a claim row with a source, a failure mode from a
real project — all of them count. The workflow is not judging the size of a
change; it is recording that a person did it.

The mechanics:

1. Land a commit with your GitHub identity attached, so the commit is
   attributed to your account.
2. Sign off your commits, as the [DCO](CONTRIBUTING.md#dco-sign-off)
   requires: `git commit -s`.
3. The next scheduled run of the roster workflow picks it up and opens a
   pull request that adds your row.

If a row is missing or wrong after the next run, open an issue and say so.
The roster is a record, and a record that is wrong is worse than no record.

## How to contribute at all

[CONTRIBUTING.md](CONTRIBUTING.md) is the guide: the rules a change must
satisfy, how to add a skill, a workflow, a claim, an ADR or a failure mode,
and the checklist to run before opening a pull request. In short:

- One coherent change per pull request.
- `node tools/validate.mjs` exits 0. It is the only acceptance test.
- Every fact is stated once, in the file that owns it, and cited from
  everywhere else.
- Every new claim carries a source and a version it was verified against.
- Evidence, not assertion: a log line, a test id, a build output or a
  read-back value.

## Who decides what

Until the project has more than one maintainer, the maintainer merges the
pull requests, and the rules that decide them are written down rather than
held in someone's head:

- The **doctrine** in [`doctrine/00-precedence.md`](doctrine/00-precedence.md)
  is the law. A pull request
  that contradicts it is a proposal to change the law, and it has to say so
  and carry an ADR.
- The **budget** in [`manifest.json`](manifest.json) caps the size of the
  corpus. Growth is by substitution, not addition.
- The **decision records** in
  [`docs/03-decision-records.md`](docs/03-decision-records.md) hold the
  defaults that were argued and settled.
- The **CODEOWNERS** file in [`.github/CODEOWNERS`](.github/CODEOWNERS)
  names who reviews which surface.

The [roadmap](ROADMAP.md) says what the project intends to build next, and
what it will not build. Proposing something that is on it is the fastest way
to get it merged.

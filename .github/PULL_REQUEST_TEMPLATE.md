# Pull request

One coherent change per pull request. A drive-by reformat, a rename or a
whitespace sweep is a separate pull request.

## What changed

<!-- One or two sentences. What is different after this pull request? -->

## Why

<!-- The problem this solves, or the conflict it settles. Link the issue. -->

## Checklist

- [ ] `node tools/validate.mjs` exits 0.
- [ ] `node tools/validate.mjs --selftest` is green.
- [ ] The budget statement: the size of every file touched, and the budget it
      sits under. A file over its cap carries a raised cap in `manifest.json`
      and in [`docs/06-context-budget.md`](../docs/06-context-budget.md), in
      this same change.
- [ ] Every new claim is a row in
      [`references/claims.md`](../references/claims.md) with a source and a
      `verified-against` version, and it is cited from the skill or workflow
      that needs it.
- [ ] The "Done when" evidence: the log line, the test id, the build output
      or the read-back value that proves this works. "It compiles" is not
      evidence.
- [ ] No secrets: no credential, token, key or connection string in a tracked
      file, a log line, a screenshot or a generated report.
- [ ] One fact, one place: nothing here restates a doctrine, a claim or
      another file.
- [ ] `manifest.json` lists every file added here, and every path it lists
      exists on disk.

## Scope

<!-- Which files changed, and why each one needed to change. -->

## Evidence

<!-- The output that proves it. Paste the log line or the test result. -->

## Notes for the reviewer

<!-- Anything the reviewer cannot derive from the diff. -->

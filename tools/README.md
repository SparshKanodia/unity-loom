# tools

## validate.mjs

Zero-dependency validator for the repository. Node 20+, no npm packages, no
network access, no writes to disk. It only reads files and reports. It
enforces the contracts defined in
[docs/02-build-plan.md](../docs/02-build-plan.md).

```bash
node tools/validate.mjs
```

### CLI

| Flag | Effect |
|---|---|
| _(none)_ | Human report: the summary lines on success, grouped failures on error. |
| `--json` | Machine-readable JSON report on stdout. The exit code is unchanged. |
| `--quiet` | Errors only. No summary lines, no headers - just the problem lines. |
| `--selftest` | Runs every check against synthetic in-memory documents and prints a PASS/FAIL table. No file is read or written. |
| `--help`, `-h` | Usage text. |

| Exit code | Meaning |
|---|---|
| `0` | All checks passed (or every self-test case passed). |
| `1` | One or more checks failed, or a self-test case failed. |
| `2` | Bad command line usage (unknown flag). |

### Checks

Every failure names the file, the line when one applies, the rule, and the fix.
Messages are grouped by rule and capped at 20 per rule (`+N more`), so a
broken repository cannot flood a CI log (context-budget doctrine).

| Rule | Catches |
|---|---|
| `manifest-integrity` | A manifest entry with no file on disk; a `.md`/`.mjs` file that the manifest does not list; more skills or workflows than the budget allows. |
| `frontmatter` | Missing or unterminated frontmatter; a `name` that differs from the directory or from `manifest.json`; a missing `metadata` block; a missing `metadata.verified-against`. |
| `frontmatter-portability` | A top-level key other than `name`, `description`, `allowed-tools`, `metadata`; an empty `allowed-tools`; a missing `metadata` key (`loom`, `domain`, `tier`, `triggers`, `budget`, `verified-against`, `sources`); a `description` that is not a single double-quoted line of at most 1024 characters, or that contains an unescaped inner quote. |
| `triggers` | A trigger that is not lowercase, is banned, is router-only, or is claimed by two skills. |
| `trigger-drift` | `manifest.skills[].triggers` differing from the `metadata.triggers` of the matching `SKILL.md`; the router routing table listing a different trigger set than the manifest; a routing row that links to a skill or workflow the manifest does not declare. |
| `wiring` | A skill pointing at an unknown workflow; a router skill whose workflow is not `null`; a tier that is not an integer rank in `0..skills-1`, or a `metadata.tier` that disagrees with the manifest; a workflow no skill owns; a `SKILL.md` on disk that the manifest does not list. |
| `budgets` | A file over its line or byte budget; total core bytes over budget; a skill whose `metadata.budget` disagrees with the budget the manifest enforces. Measured after CRLF normalisation, so Windows checkouts measure the same as Linux. |
| `links` | A relative link that does not resolve. |
| `no-restatement` | The same guidance written in two operational files. |
| `safety` | A GUI-click instruction; an unfinished-work marker. |
| `secrets` | Credential material committed to the repository (see below). |
| `workflow-gates` | A workflow without a `## Done when` section. |

The router is special-cased in `trigger-drift`: its own broad triggers live in
`manifest.routerOnlyTriggers` and are mirrored in the router frontmatter, while
`manifest.skills[].triggers` stays empty for the router.

### Secret scanning

Every `.md`, `.mjs`, `.json`, `.yml` and `.yaml` file in the working tree is
scanned for:

- AWS access key ids (`AKIA...`, `ASIA...`)
- private key blocks (`-----BEGIN ... PRIVATE KEY-----`)
- GitHub tokens (`ghp_`, `gho_`, `ghs_`, `github_pat_`)
- Slack tokens (`xox...`)
- JWT-looking strings
- `Bearer` followed by a long literal
- connection strings with an inline password
- assignments such as `api_key = "..."` to a name that contains
  `key`, `secret`, `token`, `password`, `passwd` or `credential`
- high-entropy literals (24+ characters, several character classes) assigned to
  such a name

Findings report `file:line` and a **redacted** excerpt - at most a four
character prefix plus the length. The secret itself is never printed.

If a credential-looking value is deliberate, exempt the line with the
allowlist marker, followed by a reason:

```markdown
api_key = "example-value-not-a-real-key" <!-- loom-allow-secret: documented placeholder -->
```

The marker may sit on the offending line or on the line directly above it. A
marked line is exempt from every secret rule; a marker without a reason is
still accepted, but a reason is required by review.

### install.mjs

Zero-dependency installer. It reads the skill catalogue from `manifest.json`,
so the installed copy can never drift from the registry, and it never invents a
harness-specific file layout: the generated plugin manifest is printed, not
written to a guessed path.

```bash
node tools/install.mjs plan    --target agents     # show what would be installed, and where
node tools/install.mjs install --target agents     # copy the skills into the target directory
node tools/install.mjs install --dest <dir> --dry-run
node tools/install.mjs install --target claude --link   # junction instead of a copy
node tools/install.mjs manifest --pretty           # the generated plugin manifest, on stdout
node tools/install.mjs verify  --target agents     # prove the installed copy matches the repo
```

| Target | Default destination |
|---|---|
| `claude` | `~/.claude/skills` |
| `agents` | `~/.agents/skills` |
| `cursor` | `~/.cursor/skills` |
| `project` | `./.agents/skills` |

Any other harness is used with `--dest <dir>`. `verify` compares each
installed `SKILL.md` with the repository copy and exits non-zero when one has
drifted, so an upgrade is a two-command operation: `install`, then `verify`.

## How to add a new check

1. Write the rule in `tools/validate.mjs` as a `rule("<id>", "<title>", fn)`
   block. The callback receives `(model, report)`; call
   `report({ file, line, message, fix })` for every problem. `file` and `line`
   are required in spirit: a message without them is much less useful.
2. Keep the rule id stable - it is the key used in the JSON report and in the
   grouped human output.
3. Add a case to `SELFTEST_CASES`: mutate a copy of the good fixture so the
   new rule must fire, and make sure the case passes. The self-test also
   asserts that the untouched fixture produces no findings at all, so a new
   rule must not fire on valid input.
4. Add a row to the table above and mention the rule in the CI logs if it
   needs a special exit code.
5. Run `node tools/validate.mjs --selftest` and `node tools/validate.mjs`
   before opening a pull request.

### JSON report

`--json` prints one object:

```json
{
  "tool": "unity-loom-validate",
  "ok": false,
  "exitCode": 1,
  "summary": { "skills": 10, "workflows": 9, "coreBytes": 0, "triggers": 0 },
  "problemCount": 1,
  "ruleCount": 1,
  "rules": [
    { "rule": "budgets", "title": "...", "count": 1,
      "problems": [ { "file": "...", "line": 12, "message": "...", "fix": "..." } ] }
  ]
}
```

Rules always appear in the same order, problems are sorted by file, line and
message, and file paths use forward slashes, so the report is byte-identical
across operating systems.

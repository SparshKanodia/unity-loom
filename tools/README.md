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
node tools/install.mjs install --target agents     # copy the skills and the shared corpus
node tools/install.mjs install --dest <dir> --dry-run
node tools/install.mjs install --target claude --link   # junction instead of a copy
node tools/install.mjs install --all-targets            # every harness detected on this machine
node tools/install.mjs manifest --pretty           # the generated plugin manifest, on stdout
node tools/install.mjs verify  --target agents     # prove the installed copy matches the repo
node tools/install.mjs doctor  --target claude     # prove the installation is usable
```

#### Install layout

For a chosen skills root `D` the installer writes exactly two kinds of entry:

| Path | Content |
|---|---|
| `D/<skill-name>/SKILL.md` | one directory per skill, filename exactly `SKILL.md` |
| `D/loom-shared/` | the shared corpus: `skills/`, `workflows/`, `doctrine/`, `references/`, `docs/`, `tools/`, `.github/`, plus the root files `AGENTS.md`, `GUIDE.md`, `HARNESSES.md`, `CONTRIBUTING.md`, `README.md`, `manifest.json` and `LICENSE` |

The corpus is copied at install time, so the installed tree always matches the
checkout. Only `.git`, `node_modules`, `artifacts/` and `dist/` are excluded.

#### The `../../` rewrite rule

A skill body links to a shared file with a repo-relative prefix, for example
`../../workflows/2d.md`. Two levels up is correct in the
repository, where the file lives at `skills/<name>/SKILL.md`. It is wrong after
an install, where the file lives at `D/<name>/SKILL.md` and two levels up
escapes the skills root.

The installer therefore rewrites every occurrence of `](../../` to
`](../loom-shared/` in the installed copies of `SKILL.md` only:

| File | Link before | Link after install |
|---|---|---|
| `D/loom-2d/SKILL.md` | `../../workflows/2d.md` | `../loom-shared/workflows/2d.md` |
| `D/loom-shared/skills/loom-2d/SKILL.md` | `../../workflows/2d.md` | unchanged |

Inside `loom-shared/` the original `../../` links are already correct, because
`loom-shared/skills/<name>/` is two levels below `loom-shared/`. They resolve to
`loom-shared/workflows/2d.md` and are never rewritten. Sibling links such as
`../loom-performance/SKILL.md` keep working in both places and are not touched.

#### Targets

`--target <id>` picks a harness, `--scope user|project` picks the level
(default `user`), and `--dest <dir>` overrides both for any harness that is not
in the table. `~` is the operating system home directory.

| id | Harness | User dir | Project dir |
|---|---|---|---|
| `claude` | Claude Code | `~/.claude/skills` | `.claude/skills` |
| `codex` | OpenAI Codex CLI | `~/.agents/skills` | `.agents/skills` |
| `antigravity` | Google Antigravity | `~/.gemini/config/skills` | `.agents/skills` |
| `grok` | Grok Build | `~/.grok/skills` | `.grok/skills` |
| `cursor` | Cursor | `~/.cursor/skills` | `.cursor/skills` |
| `opencode` | opencode | `~/.config/opencode/skills` | `.opencode/skills` |
| `openrouter` | OpenRouter | `~/.agents/skills` | `.agents/skills` |
| `hermes` | Hermes | `~/.hermes/skills` | `.hermes/skills` |
| `zai` | Z.AI ZCode | `~/.zcode/skills` | `.zcode/skills` |
| `kimi` | Kimi Code | `~/.config/agents/skills` | `.agents/skills` |
| `gemini` | Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| `windsurf` | Windsurf | `~/.codeium/windsurf/skills` | `.windsurf/skills` |
| `copilot` | GitHub Copilot | `~/.copilot/skills` | `.agents/skills` |
| `amp` | Amp | `~/.agents/skills` | `.agents/skills` |
| `zed` | Zed | `~/.agents/skills` | `.agents/skills` |
| `goose` | Goose | `~/.agents/skills` | `.agents/skills` |
| `cline` | Cline | `~/.agents/skills` | `.agents/skills` |
| `kilo` | Kilo Code | `~/.kilocode/skills` | `.kilocode/skills` |
| `junie` | JetBrains Junie | `~/.junie/skills` | `.junie/skills` |
| `trae` | Trae | `~/.trae/skills` | `.trae/skills` |
| `qoder` | Qoder | `~/.qoder/skills` | `.qoder/skills` |
| `droid` | Factory Droid | `~/.factory/skills` | `.factory/skills` |
| `agents` | Generic Agent Skills | `~/.agents/skills` | `.agents/skills` |
| `project` | Project-local | `~/.agents/skills` | `.agents/skills` (in the working directory) |
| `all` | every detected harness | every user dir above | — |

`project` defaults to the project scope, so `install --target project` keeps
writing to `./.agents/skills` exactly as before. Pass `--scope user` to send it
to `~/.agents/skills` instead. An unknown id is a usage error that lists the
known ids.

#### Commands

| Command | Effect |
|---|---|
| `plan` | Show the target, the scope, the destination, the skills and the shared corpus size. |
| `install` | Write the skills and the shared corpus into the destination. Idempotent. |
| `install --dry-run` | Print the full list of files that would be written, and write nothing. |
| `install --link` | Point each skill directory at the repository with a junction (Windows) or a symlink (macOS, Linux). The shared corpus is always copied, never linked. |
| `install --all-targets` | Install into every user-level destination whose harness is installed on this machine. A harness that is not installed never gets a directory. The run reports which harnesses were detected and which were skipped. |
| `manifest` | Print the generated plugin manifest. `--pretty` indents it. |
| `verify` | Compare the installed `SKILL.md` files with the repository copies (the `../../` rewrite applied) and check the presence and the freshness of `loom-shared/`. Exits non-zero when anything is stale. |
| `doctor` | Report whether the destination exists, whether the skills are present, whether the shared corpus is complete, and print the activation note. Exits 0 when the installation looks usable, 1 when a required part is missing. |

#### Activation notes

Every install prints the activation note for its target. The note is the one
fact a user needs after the files are in place:

| Target | Note |
|---|---|
| `claude` | Claude Code picks up new top-level skill directories after `/reload-skills`; it ignores the reserved directory names `synced` and `anthropic-skills`. |
| `codex` | Codex needs `[features] skills = true` in `~/.codex/config.toml`, otherwise skills do not load at all. |
| `antigravity` | Antigravity reads `~/.gemini/config/skills`; restart the editor so the skills index is rebuilt. |
| `grok` | Grok Build reads `~/.grok/skills`; the shared corpus is reached through the rewritten links, not as a skill of its own. |
| `cursor` | Cursor reads `~/.cursor/skills`; it indexes skills at session start, so reopen the project after installing. |
| `opencode` | opencode reads `~/.config/opencode/skills` and `.opencode/skills`; `name` and `description` are required. |
| `openrouter` | OpenRouter ships no skills loader; point your own loader at the installed directory (their reference implementation reads `~/.claude/skills`). |
| `hermes` | Hermes reads `~/.hermes/skills`; add `~/.agents/skills` to `skills.external_dirs` in `~/.hermes/config.yaml` to pick up the shared dir. |
| `zai` | ZCode silently drops a skill whose `description` is missing or longer than 1024 characters. |
| `kimi` | Kimi merges every brand directory; `~/.agents/skills` and `.agents/skills` are the interop path. |
| `gemini` | Gemini CLI reads `~/.gemini/skills`; it discovers skills at startup, so restart the CLI after installing. |
| `windsurf` | Windsurf reads `~/.codeium/windsurf/skills`; reload the Cascade panel so the new skills are indexed. |
| `copilot` | Copilot reads `~/.copilot/skills`; the extension rescans the skills root when the window reloads. |
| `amp` | Amp reads `~/.agents/skills`; restart the CLI so the skill index is rebuilt. |
| `zed` | Zed only scans a flat skills root; do not nest skill directories. |
| `goose` | Goose reads `~/.agents/skills` through its extensions; start a new session so the recipe list refreshes. |
| `cline` | Cline reads `~/.agents/skills` when the extension activates; reload the editor window after installing. |
| `kilo` | Kilo Code reads `~/.kilocode/skills`; reload the editor window so the skills index refreshes. |
| `junie` | Junie reads `~/.junie/skills`; start a new chat so the skill catalogue is rebuilt. |
| `trae` | Trae reads `~/.trae/skills`; restart Trae so the skills are indexed. |
| `qoder` | Qoder reads `~/.qoder/skills`; reload the workspace so the skills index refreshes. |
| `droid` | Droid reads `~/.factory/skills`; start a new session so the skills catalogue is rebuilt. |
| `agents` | The Agent Skills layout is shared by many harnesses; point your loader at the directory and restart it. |
| `project` | Project-local skills live in the working directory; commit or ignore `.agents/skills` as your team prefers. |

A full install matrix, with the activation step and one gotcha per harness,
lives in [HARNESSES.md](../HARNESSES.md).

#### How the installer stays honest

The catalogue is read from `manifest.json` at run time, never from a
hand-written list. A new skill that appears in the manifest is installed
without touching the installer, and a skill that is removed from the manifest
disappears from the next install. The installer therefore cannot drift from the
registry, and `verify` compares the installed tree against the same manifest,
so a stale install is a non-zero exit rather than a silent inconsistency.

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

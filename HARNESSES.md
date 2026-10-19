# Harnesses

The install matrix for AI coding harnesses. Every path in this file is the
documented path of that harness. The installer in
[tools/install.mjs](tools/install.mjs) writes exactly this layout.

## How to install in 60 seconds

```bash
node tools/install.mjs install --target claude   # write the skills and the shared corpus
node tools/install.mjs doctor  --target claude   # prove the installation is usable
node tools/install.mjs verify  --target claude   # prove it matches the repository
```

Replace `claude` with the id of your harness from the matrix below. To install
into every harness that is already on the machine, run:

```bash
node tools/install.mjs install --all-targets
```

The installer never creates a directory for a harness that is not installed.

## Install matrix

| Harness | `--target` | User dir | Project dir | Activate | Note |
|---|---|---|---|---|---|
| Claude Code | `claude` | `~/.claude/skills` | `.claude/skills` | `/reload-skills` in the session | `synced` and `anthropic-skills` are reserved names |
| OpenAI Codex CLI | `codex` | `~/.agents/skills` | `.agents/skills` | `[features] skills = true` in `~/.codex/config.toml` | `~/.codex/skills` is deprecated |
| Google Antigravity | `antigravity` | `~/.gemini/config/skills` | `.agents/skills` | restart the editor | shares the Gemini home directory |
| Grok Build | `grok` | `~/.grok/skills` | `.grok/skills` | restart the session | the shared corpus is reached through the rewritten links |
| Cursor | `cursor` | `~/.cursor/skills` | `.cursor/skills` | reopen the project | indexes skills at session start |
| opencode | `opencode` | `~/.config/opencode/skills` | `.opencode/skills` | restart opencode | `name` and `description` are required |
| OpenRouter | `openrouter` | `~/.agents/skills` | `.agents/skills` | supply your own loader | a library, not a harness |
| Hermes | `hermes` | `~/.hermes/skills` | `.hermes/skills` | add `~/.agents/skills` to `skills.external_dirs` | reads external skill roots from `~/.hermes/config.yaml` |
| Z.AI ZCode | `zai` | `~/.zcode/skills` | `.zcode/skills` | restart ZCode | drops a skill with a missing or oversized `description` |
| Kimi Code | `kimi` | `~/.config/agents/skills` | `.agents/skills` | restart Kimi | merges every brand directory |
| Gemini CLI | `gemini` | `~/.gemini/skills` | `.gemini/skills` | restart the CLI | discovers skills at startup |
| Windsurf | `windsurf` | `~/.codeium/windsurf/skills` | `.windsurf/skills` | reload the Cascade panel | the skills root sits under `.codeium` |
| GitHub Copilot | `copilot` | `~/.copilot/skills` | `.agents/skills` | reload the editor window | the extension rescans the skills root |
| Amp | `amp` | `~/.agents/skills` | `.agents/skills` | restart the CLI | uses the shared Agent Skills root |
| Zed | `zed` | `~/.agents/skills` | `.agents/skills` | restart Zed | scans a flat skills root only |
| Goose | `goose` | `~/.agents/skills` | `.agents/skills` | start a new session | loads skills through its extensions |
| Cline | `cline` | `~/.agents/skills` | `.agents/skills` | reload the editor window | reads the shared Agent Skills root |
| Kilo Code | `kilo` | `~/.kilocode/skills` | `.kilocode/skills` | reload the editor window | own skills root under `.kilocode` |
| JetBrains Junie | `junie` | `~/.junie/skills` | `.junie/skills` | start a new chat | the IDE rebuilds the catalogue per chat |
| Trae | `trae` | `~/.trae/skills` | `.trae/skills` | restart Trae | indexes the skills root on start |
| Qoder | `qoder` | `~/.qoder/skills` | `.qoder/skills` | reload the workspace | indexes the skills root per workspace |
| Factory Droid | `droid` | `~/.factory/skills` | `.factory/skills` | start a new session | the skills root sits under `.factory` |
| Generic Agent Skills | `agents` | `~/.agents/skills` | `.agents/skills` | point your loader at the directory | the interop path for every harness |
| Project-local | `project` | `~/.agents/skills` | `.agents/skills` in the working directory | none | defaults to the project scope |
| Every detected harness | `all` | every user dir above | — | — | only the harnesses installed on this machine |

## Per-harness notes

### Claude Code

- Command: `node tools/install.mjs install --target claude`
- Path: `~/.claude/skills/<skill-name>/SKILL.md`
- Activate: run `/reload-skills` in the session, then start a new request.
- Gotcha: `~/.claude/skills/synced` and `~/.claude/skills/anthropic-skills` are
  reserved by Claude Code. Never install a skill into either name; the loader
  ignores them.

### OpenAI Codex CLI

- Command: `node tools/install.mjs install --target codex`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: add `[features]` with `skills = true` to `~/.codex/config.toml`,
  then restart Codex.
- Gotcha: without the `skills = true` feature flag Codex does not load any
  skill at all, and the file is written to the deprecated `~/.codex/skills`
  path by the GitHub CLI installer.

### Google Antigravity

- Command: `node tools/install.mjs install --target antigravity`
- Path: `~/.gemini/config/skills/<skill-name>/SKILL.md`
- Activate: restart the editor so the skills index is rebuilt.
- Gotcha: Antigravity shares the Gemini home directory, so the Gemini CLI
  skills root and the Antigravity skills root are two different directories
  under `~/.gemini`. Install into both when you use both tools.

### Grok Build

- Command: `node tools/install.mjs install --target grok`
- Path: `~/.grok/skills/<skill-name>/SKILL.md`
- Activate: restart the Grok session.
- Gotcha: Grok Build has no separate shared directory. The workflows and the
  doctrine reach the skill through the `loom-shared` copy, so an install that
  skips the shared corpus leaves every skill body with dead links.

### Cursor

- Command: `node tools/install.mjs install --target cursor`
- Path: `~/.cursor/skills/<skill-name>/SKILL.md`
- Activate: reopen the project; Cursor indexes skills at session start.
- Gotcha: Cursor ignores a skill whose directory name does not match the
  `name` field in the frontmatter, and it does not scan nested directories, so
  a skill must sit one level below the skills root.

### opencode

- Command: `node tools/install.mjs install --target opencode`
- Path: `~/.config/opencode/skills/<skill-name>/SKILL.md`
  (project level: `.opencode/skills/<skill-name>/SKILL.md`)
- Activate: restart opencode so the skill catalogue is reloaded.
- Gotcha: opencode has also shipped a singular `.opencode/skill/` variant of
  the project path. The installer writes the plural `.opencode/skills`, which
  is the documented path.

### OpenRouter

- Command: `node tools/install.mjs install --target openrouter`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: none. OpenRouter is a library, so you point your own loader at the
  installed directory.
- Gotcha: OpenRouter ships no skills loader. Their reference implementation
  reads `~/.claude/skills`, so install with `--target claude` as well when you
  follow that example.

### Hermes

- Command: `node tools/install.mjs install --target hermes`
- Path: `~/.hermes/skills/<skill-name>/SKILL.md`
- Activate: add `~/.agents/skills` to the `skills.external_dirs` list in
  `~/.hermes/config.yaml`, then restart Hermes.
- Gotcha: Hermes only reads the directories listed in `skills.external_dirs`.
  A skill outside that list is invisible, however correct it is.

### Z.AI ZCode

- Command: `node tools/install.mjs install --target zai`
- Path: `~/.zcode/skills/<skill-name>/SKILL.md`
- Activate: restart ZCode.
- Gotcha: ZCode silently drops a skill whose `description` is missing or
  longer than 1024 characters. There is no error message, so the skill simply
  never appears.

### Kimi Code

- Command: `node tools/install.mjs install --target kimi`
- Path: `~/.config/agents/skills/<skill-name>/SKILL.md`
- Activate: restart Kimi Code.
- Gotcha: Kimi merges every brand directory it finds. `~/.agents/skills` and
  `.agents/skills` are the interop path, so the same skill can be visible
  twice; keep the skill name identical in both roots.

### Gemini CLI

- Command: `node tools/install.mjs install --target gemini`
- Path: `~/.gemini/skills/<skill-name>/SKILL.md`
- Activate: restart the CLI; the skill list is built at startup.
- Gotcha: the Gemini skills root is `~/.gemini/skills`, not
  `~/.gemini/config/skills`. The latter is the Antigravity path, and the two
  are not interchangeable.

### Windsurf

- Command: `node tools/install.mjs install --target windsurf`
- Path: `~/.codeium/windsurf/skills/<skill-name>/SKILL.md`
- Activate: reload the Cascade panel so the new skills are indexed.
- Gotcha: the skills root lives under `.codeium`, the shared Windsurf home
  directory. `~/.codeium/skills` is not read.

### GitHub Copilot

- Command: `node tools/install.mjs install --target copilot`
- Path: `~/.copilot/skills/<skill-name>/SKILL.md`
- Activate: reload the editor window; the extension rescans the skills root.
- Gotcha: Copilot resolves a skill by its frontmatter `name`, and a mismatch
  between that name and the directory name makes the skill invisible.

### Amp

- Command: `node tools/install.mjs install --target amp`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: restart the Amp CLI.
- Gotcha: Amp shares `~/.agents/skills` with every other Agent Skills
  harness, so an install for one of them is an install for all of them.

### Zed

- Command: `node tools/install.mjs install --target zed`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: restart Zed.
- Gotcha: Zed only scans a flat skills root. Do not nest skill directories
  under it, and do not point Zed at a root that contains a skills root inside
  a skill directory.

### Goose

- Command: `node tools/install.mjs install --target goose`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: start a new Goose session so the recipe list refreshes.
- Gotcha: Goose loads skills as extensions from the shared Agent Skills root,
  so the skill must sit directly in `~/.agents/skills`.

### Cline

- Command: `node tools/install.mjs install --target cline`
- Path: `~/.agents/skills/<skill-name>/SKILL.md`
- Activate: reload the editor window so the extension activates again.
- Gotcha: Cline reads the shared root, not a Cline-specific one. Installing
  into `~/.cline/skills` has no effect.

### Kilo Code

- Command: `node tools/install.mjs install --target kilo`
- Path: `~/.kilocode/skills/<skill-name>/SKILL.md`
- Activate: reload the editor window so the skills index refreshes.
- Gotcha: Kilo Code keeps its own root under `.kilocode` and does not read
  `~/.agents/skills` for skills, only for configuration.

### JetBrains Junie

- Command: `node tools/install.mjs install --target junie`
- Path: `~/.junie/skills/<skill-name>/SKILL.md`
- Activate: start a new chat; Junie rebuilds the catalogue per chat.
- Gotcha: Junie reads the user-level root only. A project-level skills root
  is ignored by the IDE, so keep the project root for CI only.

### Trae

- Command: `node tools/install.mjs install --target trae`
- Path: `~/.trae/skills/<skill-name>/SKILL.md`
- Activate: restart Trae.
- Gotcha: Trae indexes the skills root when it starts, so a skill installed
  into a running editor stays invisible until the next start.

### Qoder

- Command: `node tools/install.mjs install --target qoder`
- Path: `~/.qoder/skills/<skill-name>/SKILL.md`
- Activate: reload the workspace so the skills index refreshes.
- Gotcha: Qoder builds one index per workspace. A user-level skill is visible
  in every workspace only after the workspace reload.

### Factory Droid

- Command: `node tools/install.mjs install --target droid`
- Path: `~/.factory/skills/<skill-name>/SKILL.md`
- Activate: start a new Droid session.
- Gotcha: the Droid skills root sits under `.factory`, next to the auth
  configuration, and it is not the shared `~/.agents/skills` root.

## Harnesses with no skills support

| Harness | Why | Fallback |
|---|---|---|
| Aider | No skills support, and no automatic `AGENTS.md` discovery | Add `read: AGENTS.md` to the `.aider.conf.yml` file, then point Aider at the shared corpus with `read: .agents/skills/loom-shared/AGENTS.md` |
| OpenRouter | A library, not a harness; it ships no skills loader | Install to `~/.claude/skills` with `--target claude` and let your own loader read that directory |

Aider reads its files from the repository root, so the shared corpus has to be
inside the project for the fallback to work:

```bash
node tools/install.mjs install --target project
```

That writes `.agents/skills/` in the working directory, including the
`loom-shared` copy that holds `AGENTS.md`.

## Installing from a published repository

The ecosystem installers take a repository reference instead of a checkout:

```bash
npx skills add SparshKanodia/unity-loom                 # every skill in the repository
npx skills add SparshKanodia/unity-loom --skill unity-loom   # one skill
gh skill install SparshKanodia/unity-loom unity-loom --agent codex --scope user
```

Two facts about the GitHub CLI installer matter. `gh skill install --agent
codex` writes to `~/.codex/skills`, which Codex no longer reads; the supported
user path is `~/.agents/skills`. And the ecosystem installers copy one skill
directory at a time, so they do not create the `loom-shared` directory and the
links inside the copied skill point at files that are not there. Use
`node tools/install.mjs install --target <id>` when the links have to work.

## The Agent Skills specification rules

| Rule | Detail |
|---|---|
| Filename | The skill file is `SKILL.md`, capital `S` and capital `MD`. Several harnesses ignore any other casing. |
| Directory | One directory per skill, named after the skill. |
| `name` | Required, equal to the directory name, and matching `^[a-z0-9]+(-[a-z0-9]+)*$`. |
| `description` | Required, one line, at most 1024 characters. A missing or oversized description makes the loader drop the skill. |
| Frontmatter keys | Only `name`, `description`, `allowed-tools` and `metadata` are portable. |
| Frontmatter position | The `---` fence must be the first bytes of the file. No byte order mark, no blank line before it. |

## Verifying the installation

```bash
node tools/install.mjs doctor --target <id>    # is it usable?
node tools/install.mjs verify --target <id>    # does it match the repository?
```

`doctor` reports the destination, the number of installed skills, the state of
the shared corpus and the activation note, and exits 1 when a required part is
missing. `verify` compares every installed `SKILL.md` with the repository copy,
with the `../../` rewrite applied, and checks the presence and the freshness of
`loom-shared/`. It exits non-zero when anything is stale.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| The skill does not load | The directory name does not match the frontmatter `name`, or the file is not named `SKILL.md` | Rename the file to `SKILL.md` and make `name` equal the directory name |
| The skill does not load | The harness is not looking at that directory | Install with the right `--target`, then restart the harness |
| The skill does not load | Codex has no `skills = true` feature flag | Add `[features] skills = true` to `~/.codex/config.toml` |
| The skill loads but never activates | The `description` does not mention the words the request uses | Rewrite the description so it carries the trigger words |
| The skill loads but never activates | The trigger is in the banned list, or two skills claim it | Check the routing table in [skills/unity-loom/SKILL.md](skills/unity-loom/SKILL.md) |
| The links inside the skill are broken | The shared corpus was not installed next to the skills | Run `node tools/install.mjs install --target <id>` again, then `verify` |
| The links inside the skill are broken | The skill was copied by an ecosystem installer that does not create `loom-shared` | Reinstall with `tools/install.mjs` |
| Windows symlink failed | Creating a link needs Developer Mode or an elevated shell | Use the default copy mode; it needs no privileges |
| The skills work in one harness and not in another | The two harnesses use different roots | Install with `--target` for each of them, or use `--all-targets` |

## The shared-corpus rule

`loom-shared/` exists because a skill body links to files that live outside
the skill directory. In the repository the link is `../../workflows/2d.md`,
which is two levels above `skills/<name>/`. After an install the skill sits at
`<root>/<name>/SKILL.md`, and the same two levels leave the root.

The installer therefore copies the shared corpus into `<root>/loom-shared/` and
rewrites every `](../../` in the installed skill copies to `](../loom-shared/`.

| Location | Link | Resolves to |
|---|---|---|
| `<root>/<name>/SKILL.md` | `../loom-shared/workflows/2d.md` | `<root>/loom-shared/workflows/2d.md` |
| `<root>/loom-shared/skills/<name>/SKILL.md` | `../../workflows/2d.md` | `<root>/loom-shared/workflows/2d.md` |

The shared corpus holds `skills/`, `workflows/`, `doctrine/`, `references/`,
`docs/`, `AGENTS.md`, `manifest.json`, `README.md` and `LICENSE`. It is always
copied, never linked, so that the installed tree always matches the checkout.
The links inside it are never rewritten, because they are already correct
there.

# 08 — MCP Integration Plan

The human-facing version of this plan is the [roadmap](../ROADMAP.md). This
document is the engineering record: the architecture, the contract, the file
layout, the failure modes, and the order the work lands in.

## 1. The problem

An agent using Unity Loom today can do the *decision* half of a game project
well: it can structure the project, build the scenes, wire the systems, tune
the performance, and ship it. It cannot do the *asset* half. "Make a voice-
over for these twelve lines", "generate a texture for this wall", "give me a
low-poly crate", "write a menu click sound" — each of these leaves the
agent's hands, because the corpus has no way to reach a generation service.

The obvious answer is to add MCP servers: ElevenLabs for voice, Meshy and
others for 3D, image-generation servers, sound servers, Hugging Face spaces
for image and audio models. The obvious answer is also the one that most
quickly produces an unmaintainable repository, because each new server
arrives with its own vocabulary, its own credentials, its own failure modes
and its own opinion about what a Unity asset is.

The plan is therefore not "add eleven MCP servers". It is: **add one
generation capability to the corpus, and make every provider a row in a
table.**

## 2. Goals and non-goals

| Goal | Non-goal |
|---|---|
| One request produces a finished, imported, verified asset | Shipping an MCP server inside this repository |
| Every provider is described by data, not by code | Being the best client of any one provider |
| A missing key, a rate limit or an outage degrades the task instead of failing it | Requiring any paid provider |
| The asset ends in the Unity project, verified | Generating assets that never reach the project |
| The provider list grows without touching the corpus budgets | A new skill per provider |

## 3. Architecture

### 3.1 An MCP server is an adapter, not a dependency

The corpus already has a tier model: T0 file edit, T1 Unity CLI, T2 live
editor, T3 device. A generation provider is a **T2-class adapter**: it is
reachable, it costs money per call, it can be absent, and it can fail in
ways the Editor never does.

That means a provider is described by the same kind of contract the existing
adapters use:

- **How to reach it** — transport, command or URL, and the configuration it
  needs.
- **How to know it is healthy** — a cheap call that proves reachability
  without paying for a generation.
- **How to retry** — idempotent or not, and what a retry costs.
- **How to read back** — the observable that proves the asset exists and is
  correct.

The corpus does not carry a provider's implementation, its SDK, or its
authentication logic. It carries the *description* and the *procedure*.

### 3.2 The provider registry

One reference file, `references/mcp-providers.md`, holds one row per
provider:

| Column | Meaning |
|---|---|
| Provider | Name as the vendor writes it |
| Capability | Voice, 3D, image, sound, music, video |
| Transport | stdio, HTTP, or a hosted space URL |
| Configuration | The environment variables that must be present, named but never valued |
| Health check | The cheapest call that proves the provider is reachable |
| Output | What the provider returns, and in what form the corpus expects it |
| Import path | How the result reaches the Unity project |
| Cost class | Free, metered, or billed per second or per asset |
| Fallback | The behaviour when the provider is absent or failing |

The registry is the single source of truth. The skill reads it, the doctor
reads it, and the workflow reads it. A new provider is a row plus, at most, a
line in the doctor.

### 3.3 The credential rule

Every credential comes from the environment of the process that runs the
agent. Never from a file in the repository, never from a URL with a key in
it, never from a commit.

The rule is enforceable: the validator's `secrets` rule already fails the
build on credential-shaped material in a tracked file, and the doctor refuses
to print a value — it prints the *name* of the variable and whether it is
set, never the value, not even a prefix of it.

### 3.4 The read-back contract

A generation call is not a result. The result is an asset in the project that
the project accepted. Every generation step in the workflow therefore ends
with a read-back:

| Step | The call | The read-back |
|---|---|---|
| Generate | The provider returns a file or a URL | The file exists locally, is non-empty, and has the expected format and size |
| Import | The asset is written into the project | The Editor or the importer reports the asset, and the asset is queryable |
| Verify | The asset is read back | The property that matters is the expected value: duration within tolerance, texture dimensions, model bounds, sample rate |

A provider that returns a URL and nothing else has produced nothing yet. The
workflow says so, and the "Done when" gate cannot be cleared.

### 3.5 The fallback ladder

Every provider is optional, and every step degrades instead of failing:

| Tier | Condition | Behaviour |
|---|---|---|
| 1 | Provider configured and healthy | Generate, import, verify |
| 2 | Provider configured but failing (rate limit, outage, error) | Retry per the provider's contract, then fall back to tier 3 |
| 3 | Provider not configured (no key) | Use the local placeholder, or the deterministic alternative, and **say so** |
| 4 | Nothing available | Stop, report exactly what is missing, and emit a `HUMAN HANDOFF` with the exact steps |

The rule that makes this safe: a downgrade is always **reported**. The
workflow's final summary says which tier each asset was produced at, so a
silent downgrade never becomes a silent defect in a shipped build.

### 3.6 Untrusted provider output

A provider's response is data from the internet. It is a file, a URL, or a
piece of text, and it is parsed as such:

- Downloads are size-capped and type-checked before they are written.
- A URL is only fetched from an allow-list of provider hosts; a redirect to
  an unexpected host is refused.
- Text returned by a provider is content, not instruction. It never reaches
  the agent's instruction channel as a command.
- A generated asset is treated as untrusted input to the importer, exactly as
  a file downloaded from the internet would be.

This is the same rule the corpus already applies to untrusted project content
in the safety doctrine, applied to a new source of it.

## 4. The file layout

| File | Role | Cap it sits under |
|---|---|---|
| `doctrine/08-generation.md` | The law for generated assets: credentials, read-back, fallback, untrusted output, cost | Doctrine cap (170 lines, 7,000 bytes) |
| `references/mcp-providers.md` | The provider registry: one row per provider, plus the health-check and retry contracts | Reference cap (520 lines, 48,000 bytes) |
| `skills/loom-media/SKILL.md` | The decision tree: which capability, which provider, when to fall back | Skill cap (340 lines, 16,000 bytes) |
| `workflows/media.md` | The procedure: generate, import, verify, report | Workflow cap (520 lines, 28,000 bytes) |
| `tools/mcp-doctor.mjs` | Lists configured providers, checks health, reports what is missing, prints no secret | Tooling (no cap) |
| `manifest.json` | Registers the new entries and the new triggers | — |

Triggers for the new skill must be disjoint from the existing 147, and the
validator's `triggers` and `trigger-drift` rules enforce that. Words like
"audio", "image" and "model" are already claimed elsewhere, so the
generation triggers have to be chosen carefully — the candidate set is in
`manifest.json` → `skills` once the skill is written, and the router table
in `skills/unity-loom/SKILL.md` has to carry exactly the same list.

## 5. The providers, in the order they land

| Order | Provider | Capability | Why first |
|---|---|---|---|
| 1 | ElevenLabs | Voice and sound effects | The output is a plain audio file, the read-back is a duration, and the import path is the simplest of all: a file in `Assets/` |
| 2 | A Meshy-style 3D server | 3D models and textures | The output needs an import step, so it exercises the importer path that later providers reuse |
| 3 | An image-generation server | Images, concept art, UI art | The output is a texture; the import step is a `TextureImporter` settings read-back |
| 4 | A sound and music server | Stingers, loops, music | Reuses the audio path from the first provider |
| 5 | Hugging Face spaces | Image and audio models, one host | A space is a provider like any other, with a host and a port; it proves the registry generalises beyond a vendor API |

Each one adds a registry row, a health check, and a fallback. The skill and
the workflow are written once, against the first provider, and the rest are
data.

## 6. The doctor

`tools/mcp-doctor.mjs` answers one question: **which providers can this
machine actually use right now?**

It:

- reads the registry,
- reports each provider as `configured`, `unconfigured` or `unreachable`,
- names the environment variable that is missing, and never its value,
- runs the provider's health check when one is defined and cheap,
- exits non-zero only when a *required* provider is unusable, so it can gate
  a release or a workflow.

It is offline-capable in its default mode: without `--probe` it checks only
the configuration, so it is safe to run in CI, in a pre-flight, or on a
machine with no network. It follows the same rules as the rest of the tooling:
no dependencies, no network unless asked, and the validator's self-test
covers it.

## 7. Security rules for MCP servers

An MCP server is third-party code with access to the project and to the
environment. The rules:

| Rule | Why |
|---|---|
| The server's version is pinned, and the source is read before it is trusted | The server runs with the agent's privileges |
| The server is granted the narrowest capability that works | A voice server does not need to write outside `Assets/Audio/` |
| Credentials are passed by environment variable, and the server is configured to read only those | A server that can read every variable can leak every variable |
| The server's output is untrusted input | See §3.6 |
| The server never runs on a pull request | The same rule the CI follows |
| The server's version appears in the registry | A provider that cannot be named cannot be audited |

## 8. The validator rules this plan adds

| Rule | What it fails on |
|---|---|
| `provider-registry` | A provider row without a configuration, a health check or a fallback; a row whose configuration names a variable the workflow never reads |
| `generation-credentials` | A credential value in a tracked file, or a provider whose configuration points at a file in the repository |
| `generation-readback` | A generation step in a workflow without a `**Gate:**` line that names the read-back |
| `generation-allowlist` | A download step whose host list is not an allow-list |

These are additions to `tools/validate.mjs`, and each one gets a case in the
self-test, in the same change that adds the rule.

## 9. Order of work

| Step | Work | Done when |
|---|---|---|
| 1 | The doctrine | `doctrine/08-generation.md` states the contract; the validator has no opinion yet, and the corpus is unchanged otherwise |
| 2 | The registry | `references/mcp-providers.md` exists with the first provider's row, real configuration names, and a health check that was actually run |
| 3 | The skill and the workflow | A request routes to `loom-media`, the workflow runs, and the "Done when" gate is clearable in principle |
| 4 | The doctor | `node tools/mcp-doctor.mjs` names the missing variable and prints no secret; `--selftest` is green |
| 5 | The first live provider | A real request produces a real asset in a real project, with a read-back |
| 6 | The rest of the providers | Each one is a registry row and a health check, and the corpus budget is unchanged |
| 7 | The validator rules | Each new rule has a failing case in the self-test |

## 10. Open questions

These are the decisions the plan does not settle, and each one wants an ADR
when it is settled.

| # | Question | Why it matters |
|---|---|---|
| Q1 | Is the generated asset committed to the project, or left outside it? | A generated asset is a binary in a public repository. The answer changes the import step, the repository's size, and the licence situation |
| Q2 | Who owns the licence of a generated asset? | The corpus is CC0. A generated asset is not, and the repository should say so where the asset lands |
| Q3 | Does the corpus ever *call* a provider, or only describe one? | Calling is what makes the doctor and the workflow real. It is also what makes the corpus depend on the network |
| Q4 | Is the provider registry sorted by capability or by preference? | Preference is a per-user choice, and a per-user choice does not belong in a shared table |
| Q5 | What is the cost ceiling for a single request? | An agent that can spend money without a limit is a bug waiting for a prompt injection |

## 11. What would make this plan wrong

- If the harnesses the corpus targets do not support MCP servers, the
  generation layer has to be a set of documented CLI invocations instead, and
  the registry becomes a table of commands. The shape of the plan survives
  that change; only the transport column moves.
- If the providers' terms forbid programmatic use, the generation layer
  becomes a documented manual step with a `HUMAN HANDOFF`, and the corpus
  still owns the import and the read-back.
- If the budget caps are reached before the providers are done — and the
  workflow and reference counts land exactly on their caps — then the
  generation layer merges into an existing skill rather than adding one, and
  the cost is that the media skill is smaller than the others. That is the
  trade the caps exist to force.

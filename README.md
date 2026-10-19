# Unity Loom

**One fabric for Unity agent skills, workflows, and engineering doctrine.**

Unity Loom is a small, governed, *markdown-first* repository for building Unity projects with AI coding agents. Unlike a "mega-collection", it keeps **one copy of every fact**, resolves upstream disagreements in writing, requires **no external tools**, and enforces its own size and correctness budgets in CI.

> Works with Claude Code, Codex, Cursor, Copilot, Gemini CLI, opencode, Windsurf, Cline, Amp and any Agent-Skills-compatible harness.

---

## 60-second install

From a clone — the path that works right now, for any harness:

```bash
node tools/install.mjs plan    --target agents      # show what will be installed, and where
node tools/install.mjs install --target agents      # copy the 10 skills into ~/.agents/skills
node tools/install.mjs verify  --target agents      # prove the installed copy matches the repo
```

`--target` accepts `claude`, `agents`, `cursor`, `project`, or any directory with `--dest <dir>`. The catalogue is read from `manifest.json`, so no per-client file can drift, and `verify` fails loudly if an installed copy has gone stale.

Once the repository is published under an organisation, the ecosystem installers work too — substitute your org:

```bash
npx skills add <org>/unity-loom                      # all skills
npx skills add <org>/unity-loom --skill unity-loom   # router only (recommended start)
gh skill install <org>/unity-loom unity-loom --agent codex --scope user
```

## 5-minute first task

1. The `unity-loom` **router** loads on any Unity request.
2. It runs the **pre-flight**: safety → capability tier → state freshness.
3. It routes to exactly **one** domain skill and its workflow, then you work the workflow's checklist.
4. Each workflow ends with **Done when** — the observable proof that the work is finished.

Say any of these and see it route:

> "My Quest project loses controller input after a pause."
> "Set up a 2D pixel-perfect project with rule tiles."
> "The build is 40 fps on device — profile and fix it."
> "Design a VR training procedure with scoring and xAPI export."

Worked end-to-end examples of all of the above live in [`references/examples.md`](references/examples.md).

---

## What's inside

| Layer | Purpose |
|---|---|
| `skills/` | 1 router + 9 domain skills (short, disjoint triggers, executable instructions) |
| `workflows/` | 9 ordered, gated processes (foundation, 2D, 3D, graphics, UI/audio, XR, simulation, performance, release) |
| `doctrine/` | The law: precedence, safety, capability tiers, state freshness, response budgets, non-invasiveness |
| `references/` | Claim registry, the single XR dialect, anti-patterns, adapter guide, worked examples, traceability, upstream ledger |
| `docs/` | Synthesis of the source repositories, product idea, build plan, ADRs, failure catalogue, attribution |
| `tools/` | `validate.mjs` (frontmatter, triggers, links, budgets, duplication, secrets) and `install.mjs` (one install path) |

Read in this order: [`docs/00-repository-synthesis.md`](docs/00-repository-synthesis.md) → [`docs/01-product-idea.md`](docs/01-product-idea.md) → [`docs/02-build-plan.md`](docs/02-build-plan.md).

## Why it won't conflict or bloat

- **One fact, one place.** Doctrine and references own the truth; skills link, never restate.
- **Router owns discovery.** Domain triggers are disjoint and machine-checked against the manifest *and* each skill's frontmatter — no skill can hijack another.
- **Precedence lattice.** Every disagreement (Resources vs Addressables, singleton vs DI, coroutine vs Awaitable, XRI dialects, locomotion defaults) is decided once in [`docs/03-decision-records.md`](docs/03-decision-records.md).
- **Hard budgets.** Per-file line/byte caps, a skill count and a workflow count that can only grow by replacing something, zero orphans — enforced by CI. The budgets are guards against fluff and duplication, not quotas: substance raises the cap, fluff is removed ([docs/06-context-budget.md](docs/06-context-budget.md)).
- **Zero-requirement core.** Unity CLI, MCP, UCP and `metavr` are optional tiers, never dependencies.
- **Secrets are a build failure.** Credential-shaped material in any tracked file fails the validator, redacted.

## Requirements

**None** for the core. Optional, detected at runtime:

| Tier | Tool | Enables |
|---|---|---|
| T1 | `unity` CLI | create/open editors, build, test |
| T2 | Unity MCP / UCP bridge | live scene authoring, screenshots, profiling |
| T3 | `metavr` / adb / Xcode | device deploy, logs, perf traces |

A missing tier is a **downgrade with a fallback**, never an error. See [`references/adapters.md`](references/adapters.md) for the health check, retry and read-back contract of each adapter.

## Validate

```bash
node tools/validate.mjs            # every rule, human-readable
node tools/validate.mjs --json     # machine-readable report
node tools/validate.mjs --selftest # the validator tests itself
```

Zero dependencies, Node ≥ 20, offline, and byte-identical on Windows, macOS and Linux.

## Contributing

A new skill must have a real workflow, a verification gate, disjoint triggers, **and** replace or merge an existing skill — otherwise the content belongs in `references/`. The rules, the growth protocol and the failure-mode intake template are in [`docs/06-context-budget.md`](docs/06-context-budget.md) and [`docs/04-failure-modes.md`](docs/04-failure-modes.md).

## License

MIT — see [`LICENSE`](LICENSE). Upstream projects are referenced and credited, never copied; see [`docs/05-attribution.md`](docs/05-attribution.md).

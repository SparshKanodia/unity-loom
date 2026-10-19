# 04 — Failure Modes (issue-derived)

Catalogue of the failure clusters found in the source repositories' issue trackers, each with its mitigation and the location that enforces it. Derived from `docs/00-repository-synthesis.md` §6.

**Review cadence:** quarterly. A new structural failure requires an evidence link, a mitigation, and a traceability row.

---

## F1 — Transport unreliability

**Symptoms.** Disconnects, "no session", HTTP server broken after upgrade, "port in use", context cancel, request timeouts; "task exception was never retrieved".
**Mitigation.** Capability tiers with a **health check** before use; idempotent retry contract; never assume a live session; verification is post-action.
**Enforced in.** `doctrine/02-capabilities.md`, `doctrine/03-state-freshness.md`.

## F2 — Stale editor state

**Symptoms.** Tools act before the asset database refreshes or scripts compile; edits appear lost or contradictory.
**Mitigation.** Mandatory **freshness gate**: refresh + wait for compile + read state → act → read back.
**Enforced in.** `doctrine/03-state-freshness.md`.

## F3 — Setup and install sprawl

**Symptoms.** Wrong plugin names, wrong per-client commands, auto-setup that fails for Codex/Cursor/Windsurf/opencode; docs drift.
**Mitigation.** One spec install path; generated plugin manifests; CI link/command checks; no hand-written per-client instructions in skills.
**Enforced in.** `README.md`, `manifest.json`, `tools/validate.mjs`.

## F4 — Hard dependencies

**Symptoms.** "Can't depend on Python/uv"; packs that require a CLI, bridge, or device before doing anything.
**Mitigation.** **Zero-requirement core.** Adapters are detected and optional; missing tier = downgrade + fallback.
**Enforced in.** `doctrine/02-capabilities.md`.

## F5 — Context bloat

**Symptoms.** ~13k-token tool responses; long unfiltered dumps; context exhaustion mid-task.
**Mitigation.** Response budget: filter → paginate → summarize → hard cap; prefer IDs over payloads; no dumping whole hierarchies.
**Enforced in.** `doctrine/04-responses.md`.

## F6 — Frontmatter/YAML failure (silent skill death)

**Symptoms.** A skill simply never loads. Root causes: unquoted `description:` containing `": "`, or description over a client limit.
**Mitigation.** Canonical schema: single-line, double-quoted, ≤ 1024 chars, custom keys under `metadata`; parse + length lint in CI.
**Enforced in.** `tools/validate.mjs`.

## F7 — Non-executable instructions

**Symptoms.** Skills tell the agent to "use the Sprite Editor", "bake via the menu", i.e. perform GUI clicks.
**Mitigation.** Executable-only rule; `HUMAN HANDOFF` block when a human is required.
**Enforced in.** `doctrine/00-precedence.md` (executability), `tools/validate.mjs` (GUI-phrase scan).

## F8 — Incorrect or overgeneralized claims

**Symptoms.** "A Rigidbody is always required"; deprecated XR methods presented as current.
**Mitigation.** Claim registry with primary sources and versions; verify-first pre-flight; no unsourced version-specific assertions.
**Enforced in.** `references/claims.md`, `docs/03-decision-records.md` (ADR-0012).

## F9 — Tooling breaks the Editor

**Symptoms.** Infinite recompile loop from an added detector; unbounded history causing a 13× slowdown; editor-wide exceptions.
**Mitigation.** Non-invasiveness rule; tooling perf budget; no auto-running hooks; bounded state; explicit opt-in.
**Enforced in.** `doctrine/05-non-invasiveness.md`.

## F10 — Asset/GUID collisions

**Symptoms.** A shipped `package.json.meta` GUID collides with another tool → "missing script" warnings project-wide.
**Mitigation.** No Unity package assets in v1. Any future package requires a GUID registry and a collision check.
**Enforced in.** `docs/01-product-idea.md` §7, `docs/02-build-plan.md` §12.

## F11 — Cross-platform / line-ending failures

**Symptoms.** A byte-budget test fails on every Windows checkout because CRLF inflates the measurement.
**Mitigation.** Normalize CRLF before measuring; run the validator on Windows/macOS/Linux in CI.
**Enforced in.** `tools/validate.mjs`, `.github/workflows/ci.yml`.

## F12 — Missing or drifting references

**Symptoms.** A skill referenced by four files has no directory; the same CLI skill shipped in three channels drifts.
**Mitigation.** Link-check every relative link and every manifest path; single generation source for catalogs; version recorded per claim.
**Enforced in.** `tools/validate.mjs`.

## F13 — XR interaction lifecycle bugs

**Symptoms (from XRI/UltimateXR issues).** Destroying a grabbed object throws `MissingReferenceException`; no manual release; two-hand steering wheel doesn't work; jittery hands on Quest; input lost after a pause/home-button resume; a Meta SDK update stops controllers; hand tracking absent on Quest 3; Mixamo rigs map poorly.
**Mitigation.** XR skill ships an **interaction lifecycle contract** (select → hold → release → destroy → despawn is explicit), a **resume/regain-input procedure**, and **SDK compatibility gates** with a version check. Disable-on-destroy and `InteractionManager` ordering rules are explicit.
**Enforced in.** `skills/loom-xr/SKILL.md`, `references/xr-dialect.md`, `workflows/xr.md`.

## F14 — AR session and visual failures

**Symptoms (from AR Foundation issues).** Black screen (the single largest thread); iOS camera jitter with multi-threaded rendering; ARCore reference-image library generation fails; image tracking stops updating; scene switching crashes; occlusion stops beyond a depth limit; Xcode/Play build failures.
**Mitigation.** Deterministic AR setup checklist plus a **triage table** mapping symptom → cause → check. Session lifecycle, permissions, and multi-threaded-rendering caveats are called out.
**Enforced in.** `workflows/xr.md`.

## F15 — Verification paradoxes

**Symptoms.** Over-engineered permission hooks and grading scripts that misfire, self-contradict, count a denial twice, or index the wrong directory.
**Mitigation.** Verification is **observable and minimal**: a log line, a test result, a screenshot, a build. No hidden hooks, no custom grader, no permission theatre.
**Enforced in.** `doctrine/03-state-freshness.md`, `doctrine/05-non-invasiveness.md`.

---

## F16 — Secret leakage

**Symptoms.** A token, key, keystore or service-account file lands in the repository, in a CI log, in a scene asset, or in a generated report; the agent echoes a stored secret back to the user.
**Mitigation.** Blocking secret scan over every tracked file (private-key headers, cloud access keys, provider tokens, JWTs, connection strings with inline passwords, high-entropy assignments to secret-shaped names); findings are reported **redacted**; placeholders require an explicit inline allowlist marker; credentials are read from environment variables or a config file outside the repository; secrets are never echoed.
**Enforced in.** `tools/validate.mjs` (secret scan), `doctrine/01-safety.md` §2, `docs/03-decision-records.md` (ADR-0014).

## F17 — Routing drift and trigger collisions

**Symptoms.** Two skills advertise the same trigger, a trigger exists in the manifest but not in a skill, or the router's table and the machine registry disagree — so a request routes to a different skill than the user expects, or to two.
**Mitigation.** The trigger vocabulary is written in exactly one authoring decision and materialised in three places (manifest, skill frontmatter, router table); the validator compares all three and fails the build naming the offending trigger. Domain triggers are disjoint, lowercase, and exclude banned bare tokens.
**Enforced in.** `tools/validate.mjs` (trigger drift + collision checks), `skills/unity-loom/SKILL.md`, `docs/03-decision-records.md` (ADR-0013).

## F18 — The checker rots

**Symptoms.** A rule silently stops being enforced (a renamed field, a changed file layout, a rule that no longer matches the content it inspects) while the build still reports green.
**Mitigation.** The validator self-tests: synthetic bad inputs must trip each rule and a good input must trip none, executed in CI on every push. Rule changes are therefore behaviour changes, visible in the diff.
**Enforced in.** `tools/validate.mjs` (`--selftest`), `.github/workflows/ci.yml`, `docs/03-decision-records.md` (ADR-0016).

---

## Failure-mode intake template

When adding a new failure mode:

```text
ID:            Fnn
Symptoms:      what the user sees
Evidence:      repo#issue link
Root cause:    one sentence
Mitigation:    one sentence
Enforced in:   file(s)
Validator rule: (only if mechanically checkable)
```

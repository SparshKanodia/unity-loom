# 03 — Decision Records (ADRs)

Every conflict found in `docs/00-repository-synthesis.md` §5 is decided here **once**. The default wins at precedence layer L1; departing from it is allowed only under the stated escape-hatch and must be recorded with evidence.

Format: **Context → Default → Escape hatch → Why.**

---

## ADR-0001 — Assets: Addressables by default, `Resources` only for bootstrap

- **Context.** Upstream packs disagree: some teach `Addressables` migration, others show `Resources.Load` in examples.
- **Default.** Use **Addressables** for anything that loads at runtime. A small `Resources/` set is allowed **only** for immutable bootstrap data (e.g. a device-settings asset) that must exist before Addressables initializes.
- **Escape hatch.** A single scene-loading spike (e.g. a game jam) may use direct serialized references; never `Resources`.
- **Why.** `Resources` cannot unload granularly, inflates build size, and is slow to open. Fixes C3.

## ADR-0002 — Composition first; singletons are a last resort

- **Context.** One upstream ships a "safe singleton" skill; another frames singletons as an anti-pattern.
- **Default.** Prefer **interfaces + composition**; wire via serialized references or a lightweight service locator. A singleton is permitted **only** for a genuinely single-instance service with explicit, documented lifetime (e.g. an audio bus facade).
- **Escape hatch.** Small prototypes may use one static accessor, clearly marked for refactor.
- **Why.** Global mutable state makes tests order-dependent and hides dependencies. Fixes C4.

## ADR-0003 — Async: `Awaitable` first, coroutines for frame-spread work

- **Context.** Upstreams mix coroutines, `Awaitable`, and UniTask.
- **Default.** Unity 6: use **`Awaitable`** for engine async with `CancellationToken`. Use **coroutines** for simple frame-spread or editor-only sequencing. Use **UniTask only** if it is already a project dependency.
- **Escape hatch.** Platform code that requires a specific library.
- **Why.** One async model per project avoids double-await and fake-null pitfalls. Fixes C5.

## ADR-0004 — Pin project versions; use the latest tooling CLI

- **Context.** Unity's CLI skill says use the latest CLI; issues show SDK/CLI drift breaking users.
- **Default.** **Pin** Unity editor and packages (`manifest.json` + lock, recorded in the build manifest). **Use the latest** agent tooling/CLI, and record its version. Detect mismatch and stop.
- **Escape hatch.** CI images that pin the CLI for reproducibility.
- **Why.** Content must be reproducible; tooling must be current. Fixes C9/F12.

## ADR-0005 — XR dialect: Unity 6 LTS + URP + XRI 3.x + AR Foundation 6.x

- **Context.** Upstream XR examples use three different API dialects (XRI 1.x/2.x/3.x; deprecated `OnSelectEntered` vs `selectEntered`).
- **Default.** Ship **one** dialect: current XRI interaction model (`selectEntered`/`selectExited`, `NearFarInteractor`, `InteractionLayerMask`), `XROrigin`, AR Foundation managers. A single compatibility appendix maps 2022 LTS names.
- **Escape hatch.** A project locked to an older LTS may use the appendix mapping; examples are not duplicated.
- **Why.** Mixed dialects are the top source of hallucinated XR code. Fixes C1/C7.

## ADR-0006 — XR locomotion defaults: teleport + snap turn + vignette

- **Context.** Generic guides default to smooth locomotion; comfort guidance demands options.
- **Default.** **Teleport** primary, **snap turn 30°/45°**, **vignette** on, plus a comfort menu. Continuous/smooth locomotion is opt-in.
- **Escape hatch.** Seated cockpit/simulation experiences where smooth motion is intrinsic — still offer comfort settings.
- **Why.** Comfort is a functional requirement, not a preference. Fixes C6.

## ADR-0007 — Executable instructions only

- **Context.** Upstream skills instruct GUI actions an agent cannot perform.
- **Default.** Every step is a CLI command, editor eval, or file edit. If a human is required, emit a `HUMAN HANDOFF` block with exact steps and the reason.
- **Escape hatch.** None.
- **Why.** Non-executable steps are dead weight and cause silent failure. Fixes C10/F7.

## ADR-0008 — Verify before and after every editor action

- **Context.** Tools run against stale editor state; verification tooling became fragile.
- **Default.** Health check → refresh/compile → read state → act → **read back** → log evidence. Verification is always observable (log line, test result, screenshot, build), never a hidden hook.
- **Escape hatch.** Pure file edits (T0) skip the editor checks but still run static validation.
- **Why.** Fixes F2/F15.

## ADR-0009 — Prefer typed editor scripting; reflection needs a read-back

- **Context.** Reflection bridges silently ignore wrong property names.
- **Default.** Use typed Editor APIs (`SerializedObject`, `SerializedProperty`, direct component APIs). Reflection is allowed only with a **pre-read** of the canonical API table and a **post-write read-back**.
- **Escape hatch.** Legacy components without a typed path.
- **Why.** Fixes C11.

## ADR-0010 — Tooling must be non-invasive and opt-in

- **Context.** An upstream detector caused an infinite recompile loop; a GUID collision broke a user project.
- **Default.** No auto-running editor hooks, no presence detectors, no unbounded state, no shipped Unity packages in v1. Anything that touches a project is explicit, reversible, and namespaced.
- **Escape hatch.** A future optional helper package must pass a GUID registry check and a non-invasiveness review.
- **Why.** Fixes F9/F10. This is a precedence-L0 rule.

## ADR-0011 — Test invocation is capability-tiered

- **Context.** One upstream says use `unity test`; others use `Unity -runTests -batchmode`.
- **Default.** **T1 (Unity CLI)** → `unity test`. **T0/no CLI** → documented batchmode recipe with `-runTests -testResults`.
- **Escape hatch.** Projects using an external runner (GameCI) use its documented invocation.
- **Why.** Both are correct in their tier; shipping both without a rule is what causes confusion. Fixes C2.

## ADR-0012 — One canonical claim per fact, cited with a version

- **Context.** Overgeneralized claims caused real bugs.
- **Default.** Any non-obvious technical statement must exist in `references/claims.md` with a primary source and `verified-against` version, or it is not asserted.
- **Escape hatch.** None.
- **Why.** Fixes C1/C8/F8.

## ADR-0013 — The trigger vocabulary is triplicated and machine-synchronised

- **Context.** The routing vocabulary must be readable by a human (router table), by the harness (each skill's frontmatter) and by the tooling (`manifest.json`). A single copy cannot serve all three; three unlinked copies will drift, and drift is how two skills end up claiming the same trigger — the exact "conflicting instructions" failure the system exists to prevent.
- **Default.** The three copies are **derived from one authoring decision** and are compared byte-for-byte by `tools/validate.mjs`: `manifest.json` → `metadata.triggers` of each `SKILL.md` → the router's routing table. Any difference fails the build with the offending trigger named. The router table shows the *full* trigger list per domain (not an abbreviation), so a human reading it sees exactly what the machine sees.
- **Escape hatch.** None. If a trigger cannot be expressed in all three places, the trigger is wrong.
- **Why.** Fixes F17. Makes "one fact, one place" enforceable rather than aspirational.

## ADR-0014 — Secret scanning is a blocking CI rule

- **Context.** Agents and humans both paste credentials into project files, CI logs and docs. A single leaked token is a project-ending incident, and the repository is public-facing.
- **Default.** `tools/validate.mjs` fails the build on credential-shaped material in any tracked file: private-key headers, cloud access keys, provider tokens, JWTs, connection strings with inline passwords, and high-entropy assignments to secret-shaped names. The finding is reported **redacted** — the value is never echoed back. A legitimate placeholder (a documented example key) is permitted only with an inline `<!-- loom-allow-secret: reason -->` marker, which is itself visible in review.
- **Escape hatch.** None for real credentials. The marker is for placeholders only.
- **Why.** Fixes F16. The upstream failure "a token was committed" is unrecoverable after the fact; a blocking rule is the only cheap defence.

## ADR-0015 — New capability ships as a reference, not a new skill

- **Context.** The adapter guide (health checks, retry contract, per-tool failure signatures) and the worked examples (end-to-end task walkthroughs) are both large, both are *read on demand* rather than *loaded always*, and neither owns a disjoint trigger set.
- **Default.** They live in `references/adapters.md` and `references/examples.md` and are linked from the skills that need them. The skill count stays at 10 and the core context cost stays flat.
- **Escape hatch.** A capability earns its own skill only if it satisfies all four conditions in the growth protocol in `docs/06-context-budget.md`.
- **Why.** Keeps the anti-bloat charter (`docs/01-product-idea.md` §7) intact while still shipping the content.

## ADR-0016 — The validator tests itself

- **Context.** A linter that silently stops checking a rule is worse than no linter: it reports a green build while the property it protects has rotted. Every upstream failure in this catalogue is a rule that was believed to hold.
- **Default.** `tools/validate.mjs --selftest` runs the checks over synthetic, deliberately-bad inputs and asserts that each rule fires, and over a good input and asserts that none fires. It runs in CI on every push. The validator's own rules are therefore versioned behaviour, not intentions.
- **Escape hatch.** None.
- **Why.** Fixes F18. Makes the safety net itself a tested artefact.

## ADR-0017 — Evidence beats defaults, in every layer

- **Context.** Upstream packs disagree about what "correct" is, and the disagreement is usually resolvable by measurement (a profiler capture, a device run, a test result). The precedence lattice (L0–L4) already says so, but skills restated defaults in ways that read as absolutes.
- **Default.** A measured artefact (profiler capture, device trace, test run, build log) overrides any default in L1–L3, provided the artefact is cited by path or command. Defaults govern only the *unmeasured* case. A skill that states a default also states the observation that would override it.
- **Escape hatch.** Safety, secrets, privacy and non-invasiveness (L0) are never overridden by measurement.
- **Why.** Fixes C6/F5. Prevents a "best practice" from outranking reality.

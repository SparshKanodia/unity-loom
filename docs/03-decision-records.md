# 03 — Decision Records (ADRs)

Every conflict found in `docs/00-repository-synthesis.md` §5 is decided here **once**. The default of an ADR sits at precedence layer **L2** (see `doctrine/00-precedence.md` §1). A measured artefact at **L1** overrides it under ADR-0017; any other departure is allowed only under the escape hatch the ADR states, and must be recorded as a deviation.

Format: **Context → Default → Escape hatch → Why → Consequences → Status.** The first four fields say what was decided and why. **Consequences** says what the decision makes harder, what it forbids, and what follow-up work it creates. **Status** says whether the record still stands.

## How to read an ADR

1. **Context** names the disagreement that forced a decision. If the context is not in the conflict register (`docs/00-repository-synthesis.md` §5), the ADR is either new ground or a restatement in disguise.
2. **Default** is the rule that applies when nothing overrides it. It is written as a rule, not as a preference, so that a skill can apply it without asking.
3. **Escape hatch** is the one condition under which the default does not apply. An ADR with no hatch has none. The hatch belongs to the ADR, and the departure is written down.
4. **Why** is the reasoning, short enough to be read in full.
5. **Consequences** is the cost. A decision without a stated cost is a decision nobody can argue with, and therefore one nobody has really made.
6. **Status** is one of the values in the vocabulary below.

**Status vocabulary.** `Accepted` — the record stands as written. `Partially superseded by ADR-00xx` — a later record narrows or replaces part of it; the rest still stands. `Superseded by ADR-00xx` — a later record replaces it entirely; the older text is kept for the reasoning, not for the rule.

| id | Subject | Status | Fixes |
|---|---|---|---|
| ADR-0001 | Assets: Addressables by default, `Resources` only for bootstrap | Accepted | C3 |
| ADR-0002 | Composition first; singletons are a last resort | Accepted | C4 |
| ADR-0003 | Async: `Awaitable` first, coroutines for frame-spread work | Accepted | C5 |
| ADR-0004 | Pin project versions; use the latest tooling CLI | Accepted | C9, F12 |
| ADR-0005 | XR dialect: Unity 6 LTS + URP + XRI 3.x + AR Foundation 6.x | Accepted | C1, C7 |
| ADR-0006 | XR locomotion defaults: teleport + snap turn + vignette | Accepted | C6 |
| ADR-0007 | Executable instructions only | Accepted | C10, F7 |
| ADR-0008 | Verify before and after every editor action | Accepted | F2, F15 |
| ADR-0009 | Prefer typed editor scripting; reflection needs a read-back | Accepted | C11 |
| ADR-0010 | Tooling must be non-invasive and opt-in | Accepted | F9, F10 |
| ADR-0011 | Test invocation is capability-tiered | Accepted | C2 |
| ADR-0012 | One canonical claim per fact, cited with a version | Partially superseded by ADR-0013 | C1, C8, F8 |
| ADR-0013 | The trigger vocabulary is triplicated and machine-synchronised | Accepted | F17 |
| ADR-0014 | Secret scanning is a blocking CI rule | Accepted | F16 |
| ADR-0015 | New capability ships as a reference, not a new skill | Accepted | — |
| ADR-0016 | The validator tests itself | Accepted | F18 |
| ADR-0017 | Evidence beats defaults, in every layer | Accepted | F5 |
| ADR-0018 | Capability tiers and the zero-requirement core | Accepted | F4, and the architectural gap that the biggest decision in the repository had no record |
| ADR-0019 | The response and context budget | Accepted | F5, F6 |
| ADR-0020 | Test strategy | Accepted | F2, F15 |
| ADR-0021 | The UI stack | Accepted | C8 (the `ui`, `ui-ugui` and `ui-uitk` split) |
| ADR-0022 | Telemetry, analytics and crash reporting | Accepted | the conflation in `doctrine/01-safety.md` §9.1, and F3 |
| ADR-0023 | Git hygiene and multi-agent collaboration | Accepted | F12, F16 |
| ADR-0024 | Error handling, logging and determinism in generated code | Accepted | F8, F15 |

---

## ADR-0001 — Assets: Addressables by default, `Resources` only for bootstrap

- **Context.** Upstream packs disagree: some teach `Addressables` migration, others show `Resources.Load` in examples.
- **Default.** Use **Addressables** for anything that loads at runtime. A small `Resources/` set is allowed **only** for immutable bootstrap data (e.g. a device-settings asset) that must exist before Addressables initializes.
- **Escape hatch.** A single scene-loading spike (e.g. a game jam) may use direct serialized references; never `Resources`.
- **Why.** `Resources` cannot unload granularly, inflates build size, and is slow to open. Fixes C3.
- **Fixes.** C3, the `Resources` versus Addressables conflict.
- **Consequences.** Every runtime load becomes an explicit load-and-release, so code that used to "just work" from `Start` now has an address, a handle and an owner, and the project needs an addressables key per asset. Memory and build size become measurable instead of incidental, and the team must budget the addressable set before the first content drop. A project that has never used Addressables pays a one-off migration cost that this repository cannot hide.
- **Status.** Accepted.

## ADR-0002 — Composition first; singletons are a last resort

- **Context.** One upstream ships a "safe singleton" skill; another frames singletons as an anti-pattern.
- **Default.** Prefer **interfaces + composition**; wire via serialized references or a lightweight service locator. A singleton is permitted **only** for a genuinely single-instance service with explicit, documented lifetime (e.g. an audio bus facade).
- **Escape hatch.** Small prototypes may use one static accessor, clearly marked for refactor.
- **Why.** Global mutable state makes tests order-dependent and hides dependencies. Fixes C4.
- **Fixes.** C4, the singleton versus dependency-injection conflict.
- **Consequences.** Every service needs a place to be constructed and a place to be passed, so a new system costs a wiring step that a singleton made invisible. Test setup grows, because a test must now build the object graph it exercises. The exception is narrow on purpose: a singleton without a documented lifetime is a review failure, so the documentation burden falls on whoever introduces it.
- **Status.** Accepted.

## ADR-0003 — Async: `Awaitable` first, coroutines for frame-spread work

- **Context.** Upstreams mix coroutines, `Awaitable`, and UniTask.
- **Default.** Unity 6: use **`Awaitable`** for engine async with `CancellationToken`. Use **coroutines** for simple frame-spread or editor-only sequencing. Use **UniTask only** if it is already a project dependency.
- **Escape hatch.** Platform code that requires a specific library.
- **Why.** One async model per project avoids double-await and fake-null pitfalls. Fixes C5.
- **Fixes.** C5, the coroutine versus `Awaitable` versus UniTask conflict.
- **Consequences.** A project that already standardised on coroutines or on UniTask keeps its existing model under the hatch, and from that point on the repository has two async idioms to review against. Every cancellable operation must carry a token, which adds a parameter to many public signatures and makes the call sites longer. The awaitable path also demands that no code path ever awaits twice, so a careless refactor becomes a null or a hang rather than a compile error.
- **Status.** Accepted.

## ADR-0004 — Pin project versions; use the latest tooling CLI

- **Context.** Unity's CLI skill says use the latest CLI; issues show SDK/CLI drift breaking users.
- **Default.** **Pin** Unity editor and packages (`manifest.json` + lock, recorded in the build manifest). **Use the latest** agent tooling/CLI, and record its version. Detect mismatch and stop.
- **Escape hatch.** CI images that pin the CLI for reproducibility.
- **Why.** Content must be reproducible; tooling must be current. Fixes C9/F12.
- **Fixes.** C9, the latest-versus-pinned conflict, and F12, the drifting-reference cluster.
- **Consequences.** A pinned project cannot absorb a new package version on the day it ships, so every upgrade is a deliberate commit with a rebuilt artefact, and the lock file becomes a merge-conflict hotspot on a busy team. A version mismatch stops the work rather than degrading it, so an upgrade-related build failure is now a deliberate decision point instead of a surprise. The rule also splits the two version sets apart, which means a project carries two different notions of "current" and has to track both.
- **Status.** Accepted.

## ADR-0005 — XR dialect: Unity 6 LTS + URP + XRI 3.x + AR Foundation 6.x

- **Context.** Upstream XR examples use three different API dialects (XRI 1.x/2.x/3.x; deprecated `OnSelectEntered` vs `selectEntered`).
- **Default.** Ship **one** dialect: current XRI interaction model (`selectEntered`/`selectExited`, `NearFarInteractor`, `InteractionLayerMask`), `XROrigin`, AR Foundation managers. A single compatibility appendix maps 2022 LTS names.
- **Escape hatch.** A project locked to an older LTS may use the appendix mapping; examples are not duplicated.
- **Why.** Mixed dialects are the top source of hallucinated XR code. Fixes C1/C7.
- **Fixes.** C1, the deprecated-versus-current XR API conflict, and C7, the XRI version dialect.
- **Consequences.** A project on an older LTS cannot use an example verbatim; it must translate through the appendix, so every upstream fix and every new example lands one step further from that project. The appendix is a permanent maintenance surface, because a name that changes in the current dialect has to be followed there too. Pinning one dialect also means the XR content ages as a block: when XRI moves on, the whole surface moves with it.
- **Status.** Accepted.

## ADR-0006 — XR locomotion defaults: teleport + snap turn + vignette

- **Context.** Generic guides default to smooth locomotion; comfort guidance demands options.
- **Default.** **Teleport** primary, **snap turn 30°/45°**, **vignette** on, plus a comfort menu. Continuous/smooth locomotion is opt-in.
- **Escape hatch.** Seated cockpit/simulation experiences where smooth motion is intrinsic — still offer comfort settings.
- **Why.** Comfort is a functional requirement, not a preference. Fixes C6.
- **Fixes.** C6, the locomotion-default conflict.
- **Consequences.** A project that wants continuous locomotion by default has to invert the default and argue for it, so the comfort menu and the opt-in path are built even when the studio believes it does not need them. This ADR is the single owner of the numbers, so no other file may restate them: every example, workflow and skill that mentions comfort links here instead, and a change to the values touches exactly one place. **Every XR example must be re-verified on each XRI bump**, because the comfort defaults ride on the same input and rig surface that the XRI upgrade changes; an example that was not re-verified is treated as unverified.
- **Status.** Accepted.

## ADR-0007 — Executable instructions only

- **Context.** Upstream skills instruct GUI actions an agent cannot perform.
- **Default.** Every step is a CLI command, editor eval, or file edit. If a human is required, emit a `HUMAN HANDOFF` block with exact steps and the reason.
- **Escape hatch.** None.
- **Why.** Non-executable steps are dead weight and cause silent failure. Fixes C10/F7.
- **Fixes.** C10, the executability conflict, and F7, the non-executable-instruction cluster.
- **Consequences.** Some genuinely manual steps — an OS permission dialog, a store console form — can never become instructions, so they have to be written as handoffs, which are slower for a human to read and slower for an agent to act on. A handoff is a real cost in the task, and a workflow that ends in one is not a finished workflow. The rule also removes the comfortable middle ground of describing a UI path in prose and hoping the agent infers the API, which means more work up front for every instruction.
- **Status.** Accepted.

## ADR-0008 — Verify before and after every editor action

- **Context.** Tools run against stale editor state; verification tooling became fragile.
- **Default.** Health check → refresh/compile → read state → act → **read back** → log evidence. Verification is always observable (log line, test result, screenshot, build), never a hidden hook.
- **Escape hatch.** Pure file edits (T0) skip the editor checks but still run static validation.
- **Why.** Prevents acting on a stale editor and makes the result checkable by someone else. Fixes F2/F15.
- **Fixes.** F2, the stale-editor-state cluster, and F15, the verification-paradox cluster.
- **Consequences.** Every editor-touching step costs a compile and a read-back, so a session that makes ten edits pays for ten verifications, and the latency of a task rises even when nothing is wrong. Read-backs also constrain how code may be written: a change that cannot be observed from outside is hard to verify and therefore hard to ship. The escape hatch is deliberately narrow, because a file edit is the one case where the state on disk is the state.
- **Status.** Accepted.

## ADR-0009 — Prefer typed editor scripting; reflection needs a read-back

- **Context.** Reflection bridges silently ignore wrong property names.
- **Default.** Use typed Editor APIs (`SerializedObject`, `SerializedProperty`, direct component APIs). Reflection is allowed only with a **pre-read** of the canonical API table and a **post-write read-back**.
- **Escape hatch.** Legacy components without a typed path.
- **Why.** A wrong property name is a silent no-op, so the mistake has to be made visible. Fixes C11.
- **Fixes.** C11, the reflection-versus-typed-API conflict.
- **Consequences.** Typed editor scripting is more verbose than a string-keyed setter, and a team that has standardised on a reflection bridge will have to rewrite the bridge-facing parts of its tooling to gain the guarantee. A legacy component with no typed path becomes a standing exception that needs a named owner, because the read-back is the only thing standing between it and a silent failure. The read-back also has to be written somewhere, which grows the editor tooling surface that the non-invasiveness rules then have to police.
- **Status.** Accepted.

## ADR-0010 — Tooling must be non-invasive and opt-in

- **Context.** An upstream detector caused an infinite recompile loop; a GUID collision broke a user project.
- **Default.** No auto-running editor hooks, no presence detectors, no unbounded state, no shipped Unity packages in v1. Anything that touches a project is explicit, reversible, and namespaced.
- **Escape hatch.** A future optional helper package must pass a GUID registry check and a non-invasiveness review.
- **Why.** Tooling that runs on its own is tooling the user cannot turn off, and a project that breaks because of a tool is a project the tool has damaged. Fixes F9/F10. This is a precedence-L0 rule.
- **Fixes.** F9, the editor-breaking-tooling cluster, and F10, the asset and GUID collision cluster.
- **Consequences.** The repository ships no package, no `.meta` file and no asmdef, so anything a user wants in their project must be copied by hand, which is exactly the friction this rule is meant to remove. The performance win of a resident detector is given up: state that would be free to collect at load time has to be collected on demand. A future helper package is not a small addition; it needs a GUID registry and a review that do not exist yet, and that work is now on the roadmap.
- **Status.** Accepted.

## ADR-0011 — Test invocation is capability-tiered

- **Context.** One upstream says use `unity test`; others use `Unity -runTests -batchmode`.
- **Default.** **T1 (Unity CLI)** → `unity test`. **T0/no CLI** → documented batchmode recipe with `-runTests -testResults`.
- **Escape hatch.** Projects using an external runner (GameCI) use its documented invocation.
- **Why.** Both are correct in their tier; shipping both without a rule is what causes confusion. Fixes C2.
- **Fixes.** C2, the test-invocation conflict.
- **Consequences.** The test command in a workflow is tier-conditional, so a document that quotes a single command is wrong for half the audience, and a copy-pasted command from a tutorial can fail silently in CI where the CLI is absent. A project on GameCI carries a third invocation outside this record, and the CI has to be checked against the tier it actually runs at. What the rule buys is that a failure is always interpretable: the tier is named, so the reader knows which recipe was in force.
- **Status.** Accepted.

## ADR-0012 — One canonical claim per fact, cited with a version

- **Context.** Overgeneralized claims caused real bugs.
- **Default.** Any non-obvious technical statement must exist in `references/claims.md` with a primary source and `verified-against` version, or it is not asserted.
- **Escape hatch.** None.
- **Why.** Fixes C1/C8/F8.
- **Fixes.** C1, C8 and F8, the incorrect-claim cluster.
- **Consequences.** Writing a skill becomes slower, because every technical sentence either finds a claim or becomes a citation, and a claim needs a source and a version before it can be used. A claim that is wrong is now wrong in a place every skill points at, so a correction propagates to everything at once, which is a large blast radius for a single editing mistake. The registry also has to be maintained, and a stale row is worse than no row because it looks authoritative. The trigger vocabulary is the one deliberate exception to "one place": ADR-0013 materialises it three times and compares the copies mechanically.
- **Status.** Partially superseded by ADR-0013.

## ADR-0013 — The trigger vocabulary is triplicated and machine-synchronised

- **Context.** The routing vocabulary must be readable by a human (router table), by the harness (each skill's frontmatter) and by the tooling (`manifest.json`). A single copy cannot serve all three; three unlinked copies will drift, and drift is how two skills end up claiming the same trigger — the exact "conflicting instructions" failure the system exists to prevent.
- **Default.** The three copies are **derived from one authoring decision** and are compared byte-for-byte by `tools/validate.mjs`: `manifest.json` → `metadata.triggers` of each `SKILL.md` → the router's routing table. Any difference fails the build with the offending trigger named. The router table shows the *full* trigger list per domain (not an abbreviation), so a human reading it sees exactly what the machine sees.
- **Escape hatch.** None. If a trigger cannot be expressed in all three places, the trigger is wrong.
- **Why.** Fixes F17. Makes "one fact, one place" enforceable rather than aspirational.
- **Fixes.** F17, the routing-drift cluster.
- **Consequences.** Adding a trigger now means editing three files, which is friction the ADR-0012 rule would have forbidden, and a contributor who edits only the manifest gets a failing build rather than a silent misroute. The router table cannot be shortened, so its length is the visible cost of that guarantee, and the router's byte budget has to absorb it. The guarantee covers the trigger text only: it says nothing about whether a trigger deserves to be owned by that skill, so a poorly chosen trigger passes every check and still routes wrongly.
- **Status.** Accepted.

## ADR-0014 — Secret scanning is a blocking CI rule

- **Context.** Agents and humans both paste credentials into project files, CI logs and docs. A single leaked token is a project-ending incident, and the repository is public-facing.
- **Default.** `tools/validate.mjs` fails the build on credential-shaped material in any tracked file: private-key headers, cloud access keys, provider tokens, JWTs, connection strings with inline passwords, and high-entropy assignments to secret-shaped names. The finding is reported **redacted** — the value is never echoed back. A legitimate placeholder (a documented example key) is permitted only with an inline `<!-- loom-allow-secret: reason -->` marker, which is itself visible in review.
- **Escape hatch.** None for real credentials. The marker is for placeholders only.
- **Why.** The upstream failure "a token was committed" is unrecoverable after the fact; a blocking rule is the only cheap defence.
- **Fixes.** F16, the secret-leakage cluster.
- **Consequences.** A scan that matches shapes rather than meaning will occasionally stop a build over an innocent string, and the escape from that is a marker plus a reason in the pull request, so the cost is paid in review time rather than in code. A secret that is split across lines, spelled unusually or stored in a binary is not caught, which means the rule is a strong filter and not a guarantee. Keeping the value out of the finding matters: it means the report is safe to paste into a public issue, which is what makes a leak reportable at all.
- **Status.** Accepted.

## ADR-0015 — New capability ships as a reference, not a new skill

- **Context.** The adapter guide (health checks, retry contract, per-tool failure signatures) and the worked examples (end-to-end task walkthroughs) are both large, both are *read on demand* rather than *loaded always*, and neither owns a disjoint trigger set.
- **Default.** They live in `references/adapters.md` and `references/examples.md` and are linked from the skills that need them. The skill count stays at 10 and the core context cost stays flat.
- **Escape hatch.** A capability earns its own skill only if it satisfies all four conditions in the growth protocol in `docs/06-context-budget.md`.
- **Why.** Keeps the anti-bloat charter (`docs/01-product-idea.md` §7) intact while still shipping the content.
- **Fixes.** — (no upstream conflict; a structural decision about repository shape).
- **Consequences.** The content still has to be found, and a reference that is never linked from a skill is content nobody reaches, so the linking is now part of the work rather than an afterthought. A reference has no trigger, so a request that needs it depends on the agent choosing to open it; that is a discovery problem, not a correctness problem, and it is invisible until a task goes the wrong way. The reference count is capped, so the eighth reference displaces something, and the growth protocol becomes a standing argument rather than a one-time choice.
- **Status.** Accepted.

## ADR-0016 — The validator tests itself

- **Context.** A linter that silently stops checking a rule is worse than no linter: it reports a green build while the property it protects has rotted. Every upstream failure in this catalogue is a rule that was believed to hold.
- **Default.** `tools/validate.mjs --selftest` runs the checks over synthetic, deliberately-bad inputs and asserts that each rule fires, and over a good input and asserts that none fires. It runs in CI on every push. The validator's own rules are therefore versioned behaviour, not intentions.
- **Escape hatch.** None.
- **Why.** Fixes F18. Makes the safety net itself a tested artefact.
- **Fixes.** F18, the checker-rot cluster.
- **Consequences.** Every new rule carries a self-test case with it, so adding a check is roughly twice the work of writing it, and a rule that is hard to provoke synthetically will be argued into existence by its own test case. The fixtures have to be kept in step with the layout they imitate: when the repository's file structure changes, the good fixture can start failing for the wrong reason, and a failing baseline is the first thing that gets ignored. The benefit is that a green build now means something: each rule has been seen to fire.
- **Status.** Accepted.

## ADR-0017 — Evidence beats defaults, in every layer

- **Context.** Upstream packs disagree about what "correct" is, and the disagreement is usually resolvable by measurement (a profiler capture, a device run, a test result). The precedence lattice (L0–L5) already says so, but skills restated defaults in ways that read as absolutes.
- **Default.** A measured artefact (profiler capture, device trace, test run, build log) is **L1**, and it overrides any **L2** ADR default, provided the artefact is cited by path or command. Defaults govern only the *unmeasured* case. A skill that states a default also states the observation that would override it.
- **Escape hatch.** Safety, secrets, privacy and non-invasiveness (L0) are never overridden by measurement.
- **Why.** Prevents a "best practice" from outranking reality. Fixes F5.
- **Fixes.** F5, the context-bloat cluster. It does not fix C6; the locomotion conflict is owned by ADR-0006.
- **Consequences.** A default is now provisional, and a team that has measured its own case can ignore the recorded rule and write down why, which is a real reduction in the authority of this repository's defaults. A measurement also has to be produced before it can be cited, so the cost of a disagreement falls on whoever is willing to run the capture. The L0 carve-out is the part that must not slip: a fast measurement is not a reason to weaken a safety or privacy rule, and the boundary between "the default was wrong" and "the rule does not apply" is the line this ADR has to keep.
- **Status.** Accepted.

## ADR-0018 — Capability tiers and the zero-requirement core

- **Context.** An agent must work whether or not a Unity CLI, an editor bridge or a device is present. The tier system was the biggest decision in the repository and it had no record, so its rules were scattered across a doctrine file, a build-plan section and a reference table, and none of them could be cited, argued or superseded.
- **Default.** Four tiers: **T0** file edit, **T1** Unity CLI, **T2** live editor, **T3** device. A missing tier is a **downgrade with a fallback**, never an error. The core requires nothing: a text editor is enough to use every skill, and the adapters are detected, not installed. The tier in force is stated in the answer together with the probe output that supports it.
- **Escape hatch.** None.
- **Why.** The core must be useful to someone who has only a checkout, and a rule that can be cited is a rule that can be applied the same way twice.
- **Fixes.** F4, and the architectural gap that the repository's largest decision had no decision record.
- **Consequences.** The tier has to be probed before a task starts, which adds a step to every session even when the answer is obvious, and the probe output has to be kept as evidence, so a trivial request carries a line of ceremony. A downgrade changes the proof that can be offered, not the goal, which means a task can succeed with weaker evidence and the answer has to say which proof was given up. The core stays useful with no tooling at all, so the most valuable parts of the product — the doctrine, the claims, the decision records — are the parts that do not need an adapter, and the adapter work is the part that is optional.
- **Status.** Accepted.

## ADR-0019 — The response and context budget

- **Context.** Agents burn context on verbose output. The upstream issue corpus contains a single tool response of roughly thirteen thousand tokens, and a skill set that repeats itself in every file pays the same cost on every task.
- **Default.** The caps in `doctrine/04-responses.md` govern what an answer may contain, and the repository's own file budgets in `manifest.json` and `docs/06-context-budget.md` govern what a file may contain. A rule never restates a number it does not own: it links to the owner, and the owner is the only place the number changes.
- **Escape hatch.** A task that genuinely needs more must say so and name the cost — what the extra output is, why the cap does not fit, and what it will be spent on.
- **Why.** Context is the scarce resource; a product that spends it on repetition has nothing left for the work.
- **Fixes.** F5, the context-bloat cluster, and F6, the silent-skill-death cluster.
- **Consequences.** Every answer has a shape and a size, so a request for a full listing gets a count, a page and a summary instead of the listing, which is a worse answer for a reader who wanted the whole thing and a better one for an agent that has to keep working. Because the numbers live in one place, changing a budget means finding every reader of it, and a reader that copied the number into its own text is now wrong without knowing it. The escape hatch requires the agent to price its own request, which is a habit that only pays off if the cost is stated honestly; a habit that reports "I need more" every time is indistinguishable from no budget at all.
- **Status.** Accepted.

## ADR-0020 — Test strategy

- **Context.** A change with no test is unproven, and the upstream corpora show the same shape of failure in every pack: a behaviour that changed and nothing that would have noticed.
- **Default.** Every behaviour change ships with a test at the **cheapest layer that can prove it**: Edit Mode before Play Mode, Play Mode before device. A performance change ships with a measured before-and-after. A release candidate runs the full suite. A test that cannot fail is not a test.
- **Escape hatch.** A documented reason to skip, recorded — for example a change that only moves a file, where the compile and the build are the evidence.
- **Why.** The cheapest layer that can fail is the layer that will actually be run, and a test nobody runs proves nothing.
- **Fixes.** F2, the stale-state cluster, and F15, the verification-paradox cluster.
- **Consequences.** The cost of a change now includes writing the test that would have caught the bug, so a small change stops being small, and the cheap-layer rule means some changes are under-tested until a device is in the loop. A performance change is harder still: it needs a baseline capture before the change, so the expensive part happens first, and a "measured before-and-after" is only meaningful if the two captures were taken the same way. The recorded-skip escape hatch keeps the rule from becoming theatre, but it also means the number of untested changes is visible only if people are honest in the reason.
- **Status.** Accepted.

## ADR-0021 — The UI stack

- **Context.** UI Toolkit and uGUI both claim the HUD. Upstream packs ship `ui`, `ui-ugui` and `ui-uitk` as separate skills, and a project that mixes the two on one screen ends up with two input models, two layout systems and two sets of bugs.
- **Default.** **UI Toolkit** for menus, HUD, panels and settings. **uGUI** only for a world-space overlay in XR and in 3D. An existing uGUI screen stays uGUI until it is rewritten; it is not migrated piecemeal.
- **Escape hatch.** A platform limitation, recorded — a target or runtime where UI Toolkit does not reach.
- **Why.** One screen, one stack, one input model; the two stacks interleave badly and the failure is not visible until the overlay is on top of a world.
- **Fixes.** C8, and specifically the `ui`, `ui-ugui` and `ui-uitk` split it exposed.
- **Consequences.** A project that has built its whole interface in uGUI cannot adopt the default without a rewrite, so the price of the decision is high for exactly the projects with the most interface work done, and the rewrite is what the "stays uGUI until rewritten" clause deliberately defers. The world-space exception is narrow on purpose, and it means a mixed project is legitimate rather than wrong, which leaves the boundary to be argued per screen. The benefit is that a bug in the HUD has one place to live and one set of tools to debug it with.
- **Status.** Accepted.

## ADR-0022 — Telemetry, analytics and crash reporting

- **Context.** Two different subjects were conflated. The agent's own tooling sending data, and a user's product collecting data from its players, are different acts with different rules, and reading them as one produces either a product that cannot ship analytics or a tool that phones home.
- **Default.** The agent's own tooling **never phones home**: no analytics, no crash reporter, no usage ping, no help call, from anything this repository runs or installs. A user project's product telemetry requires all three of a consent gate the player can refuse before data leaves the device, a working opt-out the player can find without contacting support, and an in-product disclosure rather than a policy file alone.
- **Escape hatch.** None for the agent's own tooling. The three product conditions are requirements, not options, and a product that cannot meet them does not collect the data.
- **Why.** Consent that cannot be refused is not consent, and a tool the user did not install has no standing to report on their machine.
- **Fixes.** The conflation of the two subjects in `doctrine/01-safety.md` §9.1, and F3.
- **Consequences.** The repository cannot offer usage analytics, crash reporting or any opt-in update check, so every request for such a feature has to be answered with something the user runs themselves, and the cost of support moves to the user. A user project that wants analytics has to build the consent screen, the refusal path and the disclosure itself, which is real work that cannot be delegated to a package, and the release workflow has to check three conditions rather than one checkbox. The split is the point: the product side is allowed to collect data, the tool side is not, and keeping the two apart stops a helpful tool from becoming a reporting channel.
- **Status.** Accepted.

## ADR-0023 — Git hygiene and multi-agent collaboration

- **Context.** Several agents can edit one project. Two agents that both believe they own a file produce a merge conflict at best and a silently overwritten decision at worst, and a dirty working tree makes it impossible to tell whose change is being read.
- **Default.** One branch or worktree per agent, stated in every reply. One owner per file at a time. A dirty working tree is **reported before use**, file by file, and an unknown change is never reverted or overwritten. Generated files never carry secrets. One commit is one coherent change.
- **Escape hatch.** None.
- **Why.** Two agents and one file is a lost change; a dirty tree and a confident report is a wrong answer built on someone else's work.
- **Fixes.** F12, the missing-and-drifting-reference cluster, and F16, the secret-leakage cluster.
- **Consequences.** Every agent has to announce its tree and branch before it works, which is ceremony in a solo session and the only thing that makes a shared session legible. A file that two tasks need has to be split before either of them edits it, so the split is a design decision made earlier and by somebody else, and it is the most common source of a blocked task. The "reported before use" rule means a dirty tree cannot be worked around quickly, which trades a small amount of speed for not destroying work that is not yours. Generated files are covered by the secret rule, so a report that prints an environment variable fails the build like any other leak.
- **Status.** Accepted.

## ADR-0024 — Error handling, logging and determinism in generated code

- **Context.** Generated code that swallows errors is undebuggable, and code whose output depends on the clock, the frame order or the hash seed cannot be replayed, so a bug report cannot be reproduced and a performance number cannot be compared.
- **Default.** No silent catch: every failure path either returns a value the caller checks or throws with the cause. Logs carry no personal data, no tokens and no device identifiers, one fact per line, and never from a per-frame path. The same input produces the same output: fixed seed, fixed step order, no dependence on wall-clock time or iteration order.
- **Escape hatch.** A documented hot path, recorded — the one place where a check may be skipped is a path that runs every frame, and it has to be named and justified.
- **Why.** A swallowed exception and a non-reproducible result both remove the evidence, and evidence is what makes the next fix possible.
- **Fixes.** F8, the incorrect-claim cluster, and F15, the verification-paradox cluster.
- **Consequences.** Generated code is longer than the version that swallows the error, and a caller that ignores a returned error is still a defect, so the rule pushes work outward into the call sites. A hot path needs a written justification, which means a real performance argument rather than an assumed one, and the argument has to be re-made whenever the path changes. Determinism constrains the code that can be written: a value that must reflect the real time has to be passed in, not read, so the surface of a component is defined by what it needs to know.
- **Status.** Accepted.

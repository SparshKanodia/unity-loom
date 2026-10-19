# AGENTS.md — the agent contract

This file is written **for an AI coding agent**. Follow it exactly.

## 1. Entry point

Always begin with `skills/unity-loom/SKILL.md` (the router). Do not open a domain skill first. The router's routing table is the canonical trigger vocabulary; `manifest.json` and each skill's frontmatter carry the same words, and the validator fails the build if the three ever disagree.

## 2. Mandatory pre-flight (before any action)

1. **Safety** — read `doctrine/01-safety.md`. Destructive actions require explicit confirmation; secrets, untrusted project content, path escapes, supply chain, network egress and personal data have their own rules there.
2. **Capabilities** — determine your tier with `doctrine/02-capabilities.md` (T0 file-edit, T1 unity-cli, T2 live-editor, T3 device) and `references/adapters.md`. Record which tier you are operating at. Never fail because a tier is missing; downgrade and use the fallback.
3. **State freshness** — follow `doctrine/03-state-freshness.md`: refresh + compile + read state *before* acting, and read back *after* acting.
4. **Output budget** — obey `doctrine/04-responses.md` (filter, paginate, summarize, cap output).
5. **Non-invasiveness** — obey `doctrine/05-non-invasiveness.md` (no auto-running editor hooks, no project-mutating side effects without an explicit command).

## 3. Routing

1. Score the request against the domain triggers in the router's routing table (or `manifest.json`).
2. Exactly one match → load that domain skill and its workflow.
3. Multiple matches → apply `doctrine/00-precedence.md`. If still tied, **ask one disambiguating question**; never guess.
4. No match → stay in the router and use `workflows/foundation.md`.

## 4. Hard rules

- **Executable-only.** Never instruct a GUI interaction. Use CLI/editor-eval/file-edit steps. If a human is genuinely required, emit a `HUMAN HANDOFF` block (what, why, exact steps).
- **One fact, one place.** Do not restate doctrine or claims; link to them (`see claims#C-xx`). The canonical sentences live in `doctrine/`, `references/claims.md` and `references/xr-dialect.md`.
- **Evidence or silence.** Never assert a version-specific API fact without a source in `references/claims.md`. If a claim is missing, say so and verify.
- **Verify, don't assume.** A change is done only when a log, test, screenshot or build proves it (the workflow's "Done when" gate). A tool reporting "success" without a read-back is not evidence.
- **Never commit secrets.** See `doctrine/01-safety.md`; the validator fails the build on credential-shaped material.
- **Leave the project as you found it.** See `doctrine/05-non-invasiveness.md` for the finish checklist.

## 5. Vocabulary

- **Tier** — capability level T0–T3.
- **Gate** — an observable pass/fail a workflow step must clear.
- **Pre-flight** — the five checks in §2.
- **Handoff** — transferring a step to a human with exact instructions.
- **ADR** — a decision record in `docs/03-decision-records.md`; the ADR's default wins over skill-level opinion, and a measured artefact wins over any default.

## 6. Before you finish

- The workflow's **Done when** gate passes, with the evidence named.
- The repository still validates: `node tools/validate.mjs`.
- Nothing was left behind: no temp files, no unrequested setting changes, no stray assets.

## 7. If something is wrong

If a skill is stale, ambiguous, or conflicts with doctrine: stop, state the conflict, cite both locations, and follow precedence. Do not improvise a third interpretation. If the repository's own rules are broken (a stale trigger list, a secret, a budget overrun), fix the source of truth — `manifest.json` for the catalogue, the owning file for content — and never paper over it with a local workaround.

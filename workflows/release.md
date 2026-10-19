# Workflow — Release

Owner: [loom-release](../skills/loom-release/SKILL.md). Precondition: the target platforms are known and the content is feature-complete. The measured performance gate is [performance.md](performance.md); the pipeline defaults are in the release skill.
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

## When to use

- A build has to be produced for the store, for a playtest group or for
  local iteration.
- A release branch is cut and the version, the changelog and the scope are
  frozen.
- The verification matrix has to be run against a release candidate.
- The store listing, the declarations and the submission have to be
  prepared.
- A rollout, a hotfix or a rollback has to be planned or executed.

## When not to use

- A request about the frame budget or the slow build ->
  [performance](performance.md), before this workflow.
- A request about the pipeline, the tiers or the look ->
  [graphics](graphics.md).
- A request about the headset comfort, the rig or the device matrix ->
  [xr](xr.md).
- A request about the learner record, the consent or the retention rule ->
  [simulation](simulation.md).
- A request about the folder tree or the assembly layout ->
  [foundation](foundation.md).
- A question about Unity itself rather than a change -> stay in
  [skills/unity-loom/SKILL.md](../skills/unity-loom/SKILL.md).

## Before you start

- The target platforms are known, the content is feature-complete, and the
  three build profiles exist: `dev`, `internal` and `store` (C-051, C-142).
- The version scheme and the per-profile settings are the ones in
  [loom-release](../skills/loom-release/SKILL.md).
- The performance gate in [performance.md](performance.md) has passed with
  archived artefacts; a release that skips it ships an unmeasured build.
- The privacy review has a named human owner, because a declaration is a
  legal statement and not a build artefact.
- Operating tier: the build and the tests need T1 or above. At T0 the
  workflow stops at the handoff, because a build is not a file edit.

## Steps

### Phase 1 — Scope and freeze

- [ ] Create the release branch: `git switch -c release/<version>`.
- [ ] Set the version with the scheme in the release skill; the same string goes into the store listing.
- [ ] Pin the editor and package versions: `Packages/manifest.json` and the lock file stay as they were at the last green build (ADR-0004).
- [ ] Write the changelog entry: user-visible changes, fixes, and anything breaking.
- [ ] List what is in scope and what is explicitly out of scope, in the release notes.
- [ ] Freeze the content: after this point only in-scope fixes may merge.
- **Gate:** the branch, the version, the changelog entry and the scope list are in the repository, and `git status --porcelain` is empty.

### Phase 2 — Pre-flight

- [ ] Run the validator: `node tools/validate.mjs` must exit 0.
- [ ] Version-control cleanliness: no uncommitted change, no staged build output, no local editor settings.
- [ ] Licence review: every new dependency and asset is listed with its licence in the project's own attribution ledger, a file in the project repository such as `docs/attribution.md`. The ledger of this repository, [docs/05-attribution.md](../docs/05-attribution.md), covers Unity Loom's own upstream sources and is not the project's licence record.
- [ ] Third-party asset licences: each imported asset permits commercial shipping and modification in the target territories.
- [ ] Secrets scan over the working tree and the history, with a scanner such as gitleaks; every hit is triaged, not ignored.
- [ ] Privacy and data review: list the data the build really collects, with purpose, retention, opt-out and consent path.
- [ ] Strip the store profile of debug menus, cheat consoles, internal URLs and verbose logging.
- [ ] Confirm the crash reporter is opt-in, disclosed in the listing, and backed by a consent path.
- [ ] Confirm the branch carries no credential and no personal data, per [doctrine/01-safety.md](../doctrine/01-safety.md).
- **Gate:** the validator is green, the tree is clean, the secrets scan is clean, and a named human has signed the privacy review.

Compliance checklist to keep with the release notes:

| Item | Evidence | Owner |
|---|---|---|
| Validator green | CI log with exit code 0 | agent |
| Clean tree | `git status --porcelain` output | agent |
| Secrets scan | Scanner report attached | agent |
| Dependency and asset licences | the project's own attribution ledger, updated | human |
| Privacy and data declaration | Signed review note | human |
| Age rating | Completed questionnaire | human |
| Store metadata and media | Listing draft version | human |

### Phase 3 — Verification

| Suite | What it proves | Evidence to archive |
|---|---|---|
| EditMode | Logic, serialization, save migration (C-050) | Test results file |
| PlayMode | Scene load, physics, core loop (C-050) | Test results file |
| Platform smoke | The store-profile build starts and plays | Device log |
| Performance | The frame and memory budget holds | p95 numbers and artefacts |
| XR matrix | Headset behaviour on every target model | Device log per model |
| Long session | The build survives the promised session length | Session trace |

- [ ] Invoke the tests per tier (ADR-0011): `unity test` at T1 (C-054),
      otherwise the batchmode `-runTests` recipe (C-144, C-145).
- [ ] Never pass `-quit` together with `-runTests`: the Editor quits before
      the tests finish and the result file is never written (C-148).
- [ ] Platform smoke test on the target device: launch the store-profile build, reach the main menu, load a level, assert a clean log.
- [ ] Run the performance gate from [performance.md](performance.md) and archive its artefacts.
- [ ] Run the XR device matrix from [xr.md](xr.md) when the product ships to XR.
- **Gate:** the whole matrix is green, and the results files are archived next to the release candidate.

### Phase 4 — Build

- [ ] Run the pipeline for the store profile; the exact commands are in [loom-release](../skills/loom-release/SKILL.md).
- [ ] Confirm the scripting backend and the managed stripping level match the reviewed settings (C-052, C-146).
- [ ] Set `PlayerSettings.stripEngineCode` for the store profile (C-150), and keep every reflected type preserved (C-147).
- [ ] Archive the symbol bundle beside the artifact and upload it to the crash reporter.
- [ ] Check the reachability of the crash reporter and of the telemetry
      endpoint with an actual request: `Application.internetReachability`
      reports the network type, not a working connection (C-149).
- [ ] Name the artifact with the version and the build number, so two candidates never collide.
- [ ] Compute the checksum: `sha256sum <artifact>`, or `shasum -a 256 <artifact>` on macOS.
- [ ] Record the reproducibility notes: what is pinned, and what varies between two builds of the same commit.
- [ ] Tag the commit: `git tag -a "v<version>" -m "release <version>"`.
- **Gate:** one artifact exists, with its manifest, symbols and checksum, and the manifest matches the tagged commit.

Build manifest, archived next to the artifact:

```yaml
version: 1.2.0+9f3c1a2b4d5e.417
commit: 9f3c1a2b4d5e
unity: 6000.3.12f1
profile: store
backend: IL2CPP
stripping: Minimal
artifact: dist/Game-1.2.0+9f3c1a2b4d5e.417-linux-x86_64.tar.xz
sha256: 0000000000000000000000000000000000000000000000000000000000000000
symbols: dist/symbols/Game-1.2.0+9f3c1a2b4d5e.417.symbols
```

The manifest records the scripting backend (C-052) and the managed stripping level (C-146) chosen for the profile.

### Phase 5 — Store

- [ ] Metadata: title, description, screenshots, promo video, changelog, version string.
- [ ] Compliance and privacy declarations: the data-safety form and the privacy URL, consistent with the data review.
- [ ] Age rating: complete the questionnaire with the content actually in the build.
- [ ] Content and signing: the artifact is signed with the store profile
      (on Android the signing key lives in a keystore, C-103); the
      signing identity never enters the repository.
- [ ] Submission: upload the artifact and the metadata through the pipeline, then send it for review.
- [ ] Keep the submission receipt with the manifest and the checksum.

| Listing field | Source of truth |
|---|---|
| Version string | The build manifest, byte for byte |
| Changelog | The changelog entry from Phase 1 |
| Screenshots and video | Captured from the store-profile build, not from the editor |
| Privacy URL and data safety | The signed privacy review, item by item |

```text
HUMAN HANDOFF
What:   Store account actions — creating or updating the listing, accepting the
        platform developer agreement, submitting the build for review, answering
        the review questionnaire, and providing the signing identity.
Why:    These steps need the human's store account session, their legal agreement
        and their private signing credentials. An agent has no authority to
        accept terms, and no credential may be written into the repository.
Steps:  1) Open the store console and create or update the listing from the
           metadata in the release notes.
        2) Complete the age rating, the data-safety form and the privacy URL.
        3) Upload the artifact named in the build manifest, using the checksum to
           confirm the transfer.
        4) Attach the signing identity through the console or a CI secret; never
           paste the credential into a file, a log or a commit.
        5) Submit for review, note the review identifier, and answer review
           questions about the build or its declarations.
Verify: Report the listing URL, the submitted version string, the review
        identifier, and the checksum of the uploaded artifact.
```

- **Gate:** the listing, the declarations and the age rating are complete and
  consistent with the built version, and the human has confirmed the
  submission with its review identifier.

### Phase 6 — Post-release

- [ ] Rollout plan: the rollout stages, the percentage at each stage, and the hold time before widening.
- [ ] Crash monitor thresholds: the crash-free session target, the alert channel and who is on call.
- [ ] Hotfix path: the branch to cut from, the test subset a hotfix must run, and the re-submission steps.
- [ ] Rollback plan: how a bad build leaves the store and how players return to the previous version.
- [ ] Communication: release notes, the support message, and the announcement.
- [ ] Watch the first rollout stage against the thresholds before widening.
- **Gate:** the rollout is running, the monitor is live, and the hotfix and rollback paths are written down.

Hotfix procedure, when the shipped build must be corrected fast:

1. Cut the branch from the shipped tag, never from the main branch.
2. Apply the smallest possible change, with a one-line reason in the commit message.
3. Run the full test matrix; a hotfix skips nothing, it only changes the branch.
4. Rebuild through the same pipeline and the same store profile, so profile drift cannot sneak in.
5. Re-submit with the incremented build number and record the new checksum beside the old one.

| Signal | Action |
|---|---|
| Crash rate above the threshold in the first stage | Halt the rollout, keep the previous build live |
| One crash signature above the threshold | Hotfix path, then resume the rollout |
| Broken core loop reported by players | Rollback to the previous build, then hotfix |

### Waiving a gate

A gate may be skipped only in writing: the waiver names the gate, the reason, the person who accepted it, and the date. An unwritten waiver is not a waiver, and the "Done when" list stays open until it exists.

## Limitations

- The release workflow does not own the store account, the developer
  agreement, the signing identity or the review questionnaire. Those need
  the human's session, so they are a handoff.
- It does not own the frame budget. The performance gate is the evidence it
  consumes, and it does not re-measure anything.
- It does not decide the privacy policy, the retention rule or the data
  protection basis. It checks that a named human has signed them.
- It does not own the content. Feature completeness is an input, not a
  result of this workflow.
- The build manifest is a record of one build. Two builds of the same
  commit can differ, and the reproducibility notes are what say so.
- A store review is outside the repository. A green submission receipt
  proves that the build was sent, not that it was accepted.
- The verification matrix runs once per candidate. A device that is added
  to the matrix later has no history in the archived results.

## If a step fails

1. Stop at the failing gate; keep the branch, the tag and the last good
   artifact.
2. Revert the change that broke it: `git revert <sha>` on the release
   branch, or drop the candidate commit and rebuild from the last green
   commit.
3. Re-read the state: `git status --porcelain` is empty, the validator
   exits 0, and the test results file of the re-run exists and is green.
4. Re-read the phase gate and the archived results before trying again.
5. If the failure needs the store account, the signing identity, a legal
   decision or a person, emit a `HUMAN HANDOFF` block with What, Why, Steps
   and Verify, and stop.
6. If the same gate fails twice, write a deviation record: the gate, the
   reason, who accepted it and the date, and keep the release on hold.

## Done when

- [ ] A checksummed, signed artifact installs on the target device; the
      install log and the checksum are archived beside the manifest.
- [ ] Every gate above is green or explicitly waived in writing; a waiver
      names the gate, the reason, the person and the date.
- [ ] The handoff items are closed; the listing URL, the review identifier
      and the uploaded checksum are recorded.
- [ ] The changelog and the store metadata match the built version; the
      listing version string is byte for byte the manifest version.

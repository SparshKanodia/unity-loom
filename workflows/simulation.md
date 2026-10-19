# Workflow — Simulation and Training

Owner domain: [loom-simulation](../skills/loom-simulation/SKILL.md).
Precondition: [foundation](foundation.md) is done; headset delivery also
[xr](xr.md).
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

## When to use

- A training outcome has to be written as one measurable skill.
- A procedure has to be modelled as steps with entry, success and failure
  conditions.
- A score has to be computed from something repeatable, not from what the
  trainee saw on screen.
- Statements have to reach a learning record store, or a proprietary LMS.
- A CAD or 3D asset has to be brought into the project at the right scale.
- Personal data from a learner has to be collected, kept and deleted.

## When not to use

- A request about the rig, the comfort model or the headset session ->
  [xr](xr.md).
- A request about the folder tree, the save format or the step graph ->
  [foundation](foundation.md).
- A request about frame cost or allocation -> [performance](performance.md).
- A request about the build, the store listing or the privacy declaration
  that ships -> [release](release.md).
- A request about the interface or the menus -> [ui-audio](ui-audio.md).
- A request about the render pipeline or the imported look ->
  [graphics](graphics.md).

## Before you start

- Detect the capability tier and state it; plan the fallback before the
  first asset edit
  ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)).
- The learning outcome comes first: one measurable skill, its pass
  criteria and the measurement method, in `docs/simulation-objective.md`.
- Version-specific statements carry a claim id from
  [references/claims.md](../references/claims.md); the stakeholder, the
  assessment body and the deployment target are named.

`docs/simulation-objective.md` is a document of the user's project, not of
this repository. Phase 1 creates it, with the stakeholder. If it is missing
when phase 1 starts, that is a blocker to clear, not a broken link.

## Steps

### Phase 1 — Use case and delivery standard

- [ ] Write the learning outcome as one measurable skill, with the pass
      criteria and the measurement method, and list what is out of scope.
- [ ] Choose the delivery standard from the table below, record the
      reason and the endpoint, and confirm the client can reach it or
      plan for the offline path of Phase 4.
- **Gate:** the objective, the pass criteria and the delivery standard
  are written and accepted by the stakeholder.

### Delivery standards

| Standard | Use when | Statement transport |
|---|---|---|
| xAPI | statements go to a learning record store (C-060) | a statement per event, queued |
| SCORM | an LMS launches the content and tracks a score | one completion at the end |
| Custom LMS API | a proprietary system owns the record | a custom payload per event |

### Phase 2 — Procedure authoring model

- [ ] Model the procedure as a graph of steps: each step has an entry
      condition, an action set, a success condition and a failure
      condition. Mark the critical steps: a failure on a critical step
      ends the attempt, a failure elsewhere counts against the score.
- [ ] Give every step a resume rule, so a client that joins late or
      reconnects lands in a defined state.
- [ ] Keep the step data in an externalized asset (C-076), and build one
      instructor editing surface that lists and validates the graph.
      Polymorphic step data is kept with `SerializeReference` (C-175).
- **Gate:** a trainee can complete, fail and resume the procedure, the
  graph validation reports no orphan step, and a content change needs no
  code change.

### Phase 3 — Assessment and scoring

- [ ] Log the discrete events below, with the timestamp, the step id and
      the error type; never score from a rendered observation (C-061).
- [ ] Compute the score from the event log with a pure function free of
      frame timing, and unit-test it with a fixed log and a fixed score.
- [ ] Write the attempt policy (how many attempts, what a failure costs,
      whether a trainer can reset) and the mastery rule (the score, the
      critical failures and the time that mean the skill is shown).
- **Gate:** the same event log produces the same score on every run and
  on every device, and the unit test passes.

### Event vocabulary

| Event | Recorded when | Used for |
|---|---|---|
| Step entered | the step becomes active | time in step |
| Action performed | a valid action occurs | progress count |
| Action invalid | an action is not allowed | the error tally |
| Error by type | a step fails with a named cause | diagnosis, feedback |
| Step passed | the success condition holds | the score |
| Step failed | the failure condition holds | the attempt result |
| Attempt started | the learner begins | the attempt count |

### Phase 4 — Data and identity

- [ ] Define the learner identity model: a local anonymous id, the
      mapping to the person and who owns it. Keep it server-side, so no
      personal data ships in the client.
- [ ] Store the event log locally first, under
      `Application.persistentDataPath` (C-177), and flush it when the
      network allows.
- [ ] Implement the sync conflict rules below before the first sync, and
      persist the session state, so a crash, a device swap or a
      backgrounding resumes the procedure where it stopped.
- **Gate:** the session resumes from the last committed step, an offline
  session queues and later flushes, and no personal data is in the
  client build.

### Sync conflict rules

| Situation | Rule | Reason |
|---|---|---|
| The endpoint is unreachable | keep the queue, retry with backoff | no data is lost |
| The same attempt is sent twice | the attempt id makes it idempotent | a retry is not a new attempt |
| The local state is newer | the newer attempt wins, the older is kept | a score is superseded, not edited |
| The server state is newer | the server state wins, the local queue drops | the server is the record |
| Two devices report the learner | the newest attempt id wins | the attempt list stays complete |
| The device clock is wrong | the server timestamps the receipt | the order is not the clock |

### Phase 5 — Analytics and reporting

- [ ] Map every event of Phase 3 to one statement: the attempt events
      become initialized and terminated, the step events become
      experienced and completed or failed, and the action events become
      performed or attempted with the error type as the result. Actor,
      verb and object are the required parts (C-104); the result and the
      context are optional (C-155).
- [ ] Send the statements as they happen, and mark them buffered while
      the network is down.
- [ ] Decide what the reporting must answer and aggregate only that; the
      raw log stays in the record store. Write the retention rule for the
      events, the statements and the exports, and validate one statement
      against the schema before the bulk of the events flow.
- **Gate:** one statement validates against the schema, the statements
  arrive at the endpoint, and the retention rule is written.

### Phase 6 — Three-dimensional and CAD asset pipeline

- [ ] Fix the unit and the axis convention for the project and write it
      into the objective file; set the import global scale explicitly
      (C-119). A CAD file in millimetres imported as metres is a
      hundred-fold error.
- [ ] Convert the source assets with an offline transform: defeature,
      decimate, and build the levels of detail (C-091).
- [ ] Move the result into the project through Addressables (ADR-0001,
      C-007); ADR-0001 is in
      [docs/03-decision-records.md](../docs/03-decision-records.md).
- [ ] Strip the data the scenario does not show, keep the physics mesh
      separate from the visual mesh, and write the transform so it is
      reproducible and versioned.
- **Gate:** every imported asset passes the verification gate below, the
  units and the scale are correct in the scene, and the transform runs
  again from a clean checkout.

### Imported asset verification gate

| Check | How it is verified | Failure meaning |
|---|---|---|
| Unit and scale | the measured size against the real size | the wrong size is taught |
| Axis and handedness | a known reference object in the scene | the model is mirrored |
| Origin and pivot | the pivot at the assembly origin | the part cannot be placed |
| Materials and textures | the imported list against the source | a default shows |
| Collider | a simple primitive matching the visible shape | the physics is wrong |
| Metadata | a scan for the fields the client must not ship | a licence problem |

### Phase 7 — Privacy and security gate

- [ ] Apply [doctrine/01-safety.md](../doctrine/01-safety.md) to every
      personal datum: the camera feed, the room mesh, the body and face
      data, the voice and the learner record.
- [ ] Implement the consent screen with a real refusal path, record the
      consent version with the session, and minimize: collect only the
      data a stated purpose needs and drop the rest at the source.
- [ ] Keep the learner record, the identity map and the credentials on
      the server; the client holds no secret. Implement the deletion path
      and the retention rule per data class, so a request removes the
      learner's events within the stated window.
- [ ] Never block the simulation loop on a network call.
- **Gate:** the consent screen and the refusal path work, the deletion
  request removes the data within the stated window, the client build
  contains no secret, and the scenario keeps running with the network
  off.

### Phase 8 — Verification

- [ ] Run a test scene that completes the procedure, record the event
      log, replay it through the score function and confirm the score is
      identical on a second device. Validate one statement against the
      schema with a local validator, and store the output.
- [ ] Run the app with the network off, complete the procedure, confirm
      the queue holds the statements, restore the network and confirm it
      flushes and empties.
- [ ] Interrupt a session mid-step and confirm the resume; fail a
      critical step and confirm the attempt ends and the score follows
      the policy; run the imported asset gate on every asset.
- **Gate:** the test scene completes the procedure, the score is
  reproducible, the statement validates, the queue flushes, the resume
  restores the state, and the asset gate is clean.

## Limitations

- The simulation workflow does not author course content. The objective,
  the pass criteria and the step graph are written by an instructor; this
  workflow makes them runnable and measurable.
- It does not own the headset rig, the comfort model or the session
  lifecycle; [xr](xr.md) owns those.
- It does not run a learning record store. It produces statements that
  validate against a schema; the store itself is somebody else's system.
- It does not decide the data protection policy. The retention and
  deletion rules are written by the stakeholder, and this workflow only
  implements and verifies them.
- The event vocabulary is a minimum, not a standard. A delivery standard
  that requires more fields wins over the table above.
- The score function is only as good as the event log. An event that is
  never emitted is invisible to the score, and no gate here can prove
  that an event was needed.
- It does not measure whether the training teaches anything. A procedure
  can be completed perfectly and still be the wrong training.

## If a step fails

1. Stop at the failing gate; keep the last good event log and the last
   good score.
2. Revert the change that broke it: `git revert <sha>`, or restore the
   step asset, the score function or the sync rules from the last good
   commit.
3. Re-run the unit test of the score function with the fixed log and the
   fixed expected score, and re-read the statement validator output, to
   confirm the revert landed.
4. Re-read the phase gate, and re-run the test scene from a clean state.
5. If the fix needs the stakeholder, the assessment body, a learning
   record store, a legal decision about personal data or a second device,
   emit a `HUMAN HANDOFF` block with What, Why, Steps and Verify, and
   stop.
6. If the same gate fails twice, write a deviation record: the gate, the
   reason, who accepted it and the date.

## Done when

- [ ] The outcome, the pass criteria, the scope guard and the delivery
      standard are written and accepted; the acceptance is recorded in the
      objective file.
- [ ] The procedure is an externalized step graph with success, failure and
      resume per step; the score is a pure function over a discrete event
      log, and the attempt and mastery rules are enforced. The unit test of
      the score function passes on the fixed log.
- [ ] The session resumes from the last committed step, the offline queue
      flushes, the sync rules are implemented, and no personal data ships in
      the client; the client build scan is clean.
- [ ] One statement validates against the schema, the statements reach the
      endpoint, the retention rule is written, and every imported asset
      passes the verification gate with the correct units; the validator
      output and the asset report are archived.
- [ ] The consent, refusal, minimization, retention and deletion paths work,
      the test scene completes the procedure, and the resume restores the
      state; the deletion request log is archived.

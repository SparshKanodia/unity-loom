# Doctrine 03 — State Freshness

Acting on stale Editor state is the most common way a correct-looking change goes wrong. Freshness is a gate: clear it or stop. See `doctrine/02-capabilities.md` for the tier rules and `references/adapters.md` for bridge mechanics.

## 1. The loop

```text
PROBE -> REFRESH -> COMPILE-WAIT -> READ -> ACT -> READ-BACK -> EVIDENCE
```

| Phase | What it does | Done when |
|---|---|---|
| PROBE | is the editor alive, which project, is it compiling? | project path confirmed, editor idle |
| REFRESH | make the editor pick up the change | refresh requested and finished |
| COMPILE-WAIT | wait for scripts to compile | zero compile errors |
| READ | read the exact state you intend to change | the value is in hand |
| ACT | perform the change | the call returned |
| READ-BACK | re-read the changed property | the new value is reported |
| EVIDENCE | produce an observable artifact | log, test, screenshot, or artifact exists |

Never skip READ-BACK. A silent write is a failed step.

## 2. State probe

Read these before acting. Use whatever your bridge exposes; the middle column lists the usual editor members.

| What to read | Editor API | CLI equivalent |
|---|---|---|
| Editor session | `unity status` reports port, project path, version and process ID (C-196) | bridge session query |
| Open scene | `SceneManager.GetActiveScene()` (C-194) plus the editor scene list (C-195) | bridge scene query |
| Unsaved changes | scene `isDirty` (C-191), `EditorUtility.IsDirty` on the asset (C-190) | read-back shows a saved path |
| Compiling | `EditorApplication.isCompiling` (C-186), `isUpdating` (C-187) | build/test log compile markers |
| Compile errors | console error entries for the project | log lines tagged as compile errors |
| Asset database | `AssetDatabase` refresh/import state, plus `GlobalArtifactDependencyVersion` as the version counter (C-192) | import pending flag |
| Play mode | `EditorApplication.isPlaying` (C-188), `isPlayingOrWillChangePlaymode` (C-189) | bridge play-mode query |
| Domain reload | a reload counter the bridge exposes; `AssemblyReloadEvents.afterAssemblyReload` fires per reload (C-193) | bridge reload counter |

The members and their versions are registered in `references/claims.md`; confirm the id before you rely on it.

## 3. Never act while

Stop and re-probe when any of these is true:

- the editor is compiling or importing;
- a domain reload is in flight or just finished;
- play mode is entering, running, or exiting;
- an asset import is pending;
- a modal dialog or prompt is open in the editor;
- the open scene has unsaved changes the user has not acknowledged;
- the bridge session is stale or answers for another project.

Waiting is the correct action. Guessing is not.

## 4. Read-back

After every editor action, re-read the **exact property** you changed and report the value.

```text
Acted:     <the property changed>
Read-back: <the value now, with the unit or path>
Expected:  <the value you intended>
Match:     yes | no
```

- A read-back that does not match is a failed step, not a warning.
- Do not retry a MUTATE or DESTRUCTIVE action blindly; re-read and decide (see `doctrine/02-capabilities.md` §5).
- Persist deliberately: bridge writes are often not auto-saved.

## 5. Evidence taxonomy

A step is proven by exactly one artifact. Pick the cheapest that actually fits.

| Change class | Proving evidence |
|---|---|
| Script or code | compile with zero errors, plus a passing test |
| Logic or behaviour | a passing EditMode or PlayMode test |
| Runtime value | a log line containing the expected value |
| Visual or UI | a screenshot of the target |
| Build output | a produced artifact and a clean build log |
| Performance | a profiler or device capture with the target metric |
| Project layout | a serialized file diff |

Not evidence: "it should work", an exit code with no state read-back, or a self-reporting hook.

## 6. Concurrency

Another agent or a human may be editing the same project.

- Re-read the state immediately before acting; never act on an earlier read.
- Treat any state read more than one action ago as stale.
- If the state changed underneath you, abort, re-read, and re-decide.
- Never write a file another agent changed since your last read; re-read it first.
- Prefer a separate branch or worktree per agent; state which one you used. The
  strategy and the hand-over rules live in [doctrine/06-collaboration.md](06-collaboration.md).
- Report the project path in every reply, so a second agent knows whose tree it is.

## 7. Escalation

When the gate cannot be cleared, do not guess. Emit a `HUMAN HANDOFF` block in the
shape owned by [doctrine/01-safety.md](01-safety.md) §11.

Block on: a compile error with no fix in scope, a modal dialog, a locked project, an unsaved scene the user must decide about, or an adapter that never answers.

A handoff is complete when the human replies with the requested value.

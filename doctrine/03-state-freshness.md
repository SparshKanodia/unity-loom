# Doctrine 03 — State Freshness

An agent that acts on stale state produces a change nobody can reproduce: the file is correct and the Editor is not, the property is set and the object was replaced, the test passed against yesterday's scene. The gate below is what stands between "I edited a file" and "the project changed".

## 1. The loop

Every action that touches the project goes through the same seven phases. Skip none.

| # | Phase | What you do | What proves it |
|---|---|---|---|
| 1 | **PROBE** | is the editor alive, on which project, is it compiling? | the probe output |
| 2 | **REFRESH** | make the editor notice the change on disk | the asset database version advanced |
| 3 | **COMPILE-WAIT** | wait until no compilation is running | the compile state is idle and the error count is unchanged |
| 4 | **READ** | read the exact state you intend to change | the value you read, before the change |
| 5 | **ACT** | make one change | the action returned without an error |
| 6 | **READ-BACK** | re-read the same value | it is the value you intended |
| 7 | **EVIDENCE** | emit one observable artefact | a log line, a test result, a build artifact, a screenshot, or a file diff |

Phase 6 is the one that is skipped. A write without a read-back is an assumption.

## 2. Never act while

- scripts are compiling, or a domain reload is in progress;
- the asset database is still importing;
- play mode is entering or leaving;
- a modal dialog or a progress bar is up;
- the open scene has unsaved changes the user has not acknowledged;
- the project you are about to touch is not the one the tool is attached to.

Each of these invalidates the state you read. Wait, or downgrade to T0 and work on files.

## 3. The state probe

Read the smallest set that answers "is the state I am about to depend on still true?".

| Question | Where to look |
|---|---|
| which project is open? | the adapter's session call, or the process the tool is attached to |
| is it compiling? | the editor's compile state and the error count in the console |
| is the asset database busy? | the refresh/import state after a file write |
| is the scene modified? | the scene's dirty state |
| did my last write land? | the file's content, re-read from disk |
| did my last property write land? | the property, re-read through the typed API |

Prefer the typed path: a serialized property read through the editor's own API, or the file re-read from disk. Reflection is a last resort and always needs a read-back ([ADR-0009](../docs/03-decision-records.md)).

## 4. Read-back

- Re-read **the same value you wrote**, in the same way you read it before.
- Compare the value to what you intended, and report the difference if there is one.
- A read-back that returns the previous value is a **failed step**: report it, do not retry a destructive action, and do not describe the change as done.
- Record the read-back in the evidence line. "Set the intensity to 0.4" is a claim; "read-back: `_Intensity = 0.4`" is a proof.

## 5. Evidence taxonomy

A step is proven by exactly one of these. Pick the cheapest that fits.

| Evidence | Proves | Produced by |
|---|---|---|
| log line | a runtime path executed | a `Debug.Log` in the code under test |
| test result | behaviour matches a specification | a test run at T1 or T2 |
| build artifact | the project compiles and packages | a build at T1/T2 |
| screenshot | a visual state | a bridge capture, or a `HUMAN HANDOFF` |
| file diff | a file changed as intended | reading the file back |

Evidence is specific: a log line with the object id beats "it worked"; a test name beats "the tests pass". An evidence line that would be identical for a passing and a failing run is not evidence.

## 6. Concurrency

- Read state immediately before acting, not earlier in the task.
- Assume nothing about what happened while you were doing something else.
- If the state changed underneath you — another editor, another agent, a recompile — re-read and re-decide.
- Make one change at a time. A batch of changes cannot be read back one by one.
- Never hold a reference across a domain reload; it is already gone.

## 7. When the gate cannot be cleared

If the state cannot be read, the editor is unresponsive, or the only way forward is a human action, emit a `HUMAN HANDOFF` block: **what** is needed, **why** it needs a human, the **exact steps**, and **how to verify** it afterwards. A handoff is a legitimate terminal step, not a failure ([doctrine/00-precedence.md](../doctrine/00-precedence.md)).

Never guess a state. A guessed state produces a confident, wrong report — the most expensive failure in this system.

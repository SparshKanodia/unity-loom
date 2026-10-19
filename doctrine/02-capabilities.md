# Doctrine 02 — Capabilities & Adapters

The core needs **nothing but a text editor**. Other capabilities are optional tiers, *detected*, never assumed. See `references/adapters.md`.

## 1. Tiers

| Tier | Name | Present when | Enables | If absent |
|---|---|---|---|---|
| **T0** | file-edit | always | read/write C#, assets, docs | — |
| **T1** | unity-cli | `unity` CLI on PATH | open editors, build, test, drive an Editor | work at T0; emit commands |
| **T2** | live-editor | Editor bridge (MCP/UCP), live session | scene authoring, screenshots, hot-reload, profiling | drive via T1, or file-edit + build |
| **T3** | device | `metavr`/adb/Xcode tooling present | deploy, logcat, perf traces, thermal | build at T1/T2, hand device tests over |

Work at the highest tier whose probe passed **and** whose target the task names.

## 2. Detection

Probe the highest tier first, then descend. Every probe is read-only.

| Tier | Probe | Success | Failure | Timeout | Down |
|---|---|---|---|---|---|
| T3 | `adb devices` | a device id listed | empty list, command missing | 20 s | T2 |
| T3 | `xcrun xctrace list devices` | a simulator/device id | empty list, command missing | 20 s | T2 |
| T2 | bridge health/session call | session id + project path | "no session" or transport error | 15 s | T1 |
| T1 | `unity --version` | a version string on stdout | non-zero exit or "not found" | 10 s | T0 |
| T1 | `unity status` | a running Editor or project | no editor reported | 15 s | T0 |
| T0 | read a file under the project root | path exists, is writable | path missing or read-only | 5 s | report only |

Never guess a tier. A probe that errors, parses to nothing, or times out is **absent**.

## 3. One-shot probing

- Probe each tier **at most twice**: now, then once after a backoff (≈2 s).
- Never loop, never poll, never re-probe a tier that answered.
- A failed probe is a **downgrade**, not a failure. Go one tier down.
- Probe in descending order; the first success ends it.
- Keep the raw probe output; it is the evidence for the tier.
- Re-probing a known-absent tier is waste; absence is established.

## 4. Adapter contract

Each adapter clears four testable questions before it is trusted.

| # | Question | Pass signal |
|---|---|---|
| 1 | Is it alive? | health call returns ok plus the target id (project path, device id) |
| 2 | Which versions? | tool and project versions reported; a bad pair stops it |
| 3 | Is it repeatable? | the action maps to a class (§5) that allows a retry |
| 4 | How is it proven? | a read-back of the property returns the intended value |

A bridge that names another project or device answers *no*.

## 5. Idempotency classes

| Class | Examples | Repeat rule |
|---|---|---|
| READ | list, query, read a value | always safe to repeat |
| CREATE | add an object, write an asset, create a scene | repeat only after a read-back shows it did not happen |
| MUTATE | set a property, move, reparent, import | repeat only if idempotent; else read, decide |
| DESTRUCTIVE | delete, clean, reset, uninstall, deploy | never repeat; read state for the outcome |

Classify before you act. An unclassified action counts as DESTRUCTIVE.

## 6. Fallbacks

| Wish | T3 | T2 | T1 | T0 |
|---|---|---|---|---|
| Author a scene | capture on device | bridge scene edit | write scene text or an Editor script | write scene text; build to verify |
| Screenshot | device screenshot | bridge capture | — | `HUMAN HANDOFF` |
| Run tests | on-device smoke run | bridge-driven test run | `unity test` | batchmode `-runTests` recipe (ADR-0011) |
| Read the profiler | device trace | bridge capture | no live capture; read the build log | no capture; `HUMAN HANDOFF` |
| Deploy to device | install and launch | build a player artifact | build a player artifact | build recipe as instructions |
| Read a log | device log stream | editor console read | editor log file | editor log file |

A downgrade changes the proof you can offer; name the proof given up.

## 7. Recording the tier

State it once up front, so the user knows the verification quality.

```text
Operating at T2 (live-editor: Unity MCP, project <path>, Unity 6000.3.12f1)
Probes: T3 adb -> absent | T2 bridge health -> ok | T1 unity --version -> 6000.3.12f1
Fallback if the editor closes: T1 (unity CLI present)
```

## 8. Missing adapter is not failure

- A missing tier changes the *method*, never the goal.
- If the fallback is missing too, emit a `HUMAN HANDOFF` with the command.
- Never install a tool to raise your tier. Tiers are given, not made.
- Report the downgrade and the evidence quality it costs; a downgrade is not a licence to guess.
- No tier claim without the probe output that supports it.
- A version claim needs a source in `references/claims.md`.
- A tier is a *means*, not a goal: pick the lowest that suffices.
- Live editor state needs T2; T1 and T0 substitute a build.
- Device truth needs T3; below it the answer is a model, not fact.
- Report the tier with the answer, not before it.

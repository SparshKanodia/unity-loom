# Adapter Guide

Adapters are **optional**. They are detected, never required, and never installed by the agent. A missing adapter is a tier downgrade with a defined fallback, not a failure. The tier rules and the probe table live in [doctrine/02-capabilities.md](../doctrine/02-capabilities.md); this file is the practical detail.

> **Naming.** Exact tool names, endpoints and argument shapes vary by bridge version and by vendor. Treat every name below as a *role*, and discover the real name at runtime from the bridge's own tool list. Never hard-code a tool name you have not just seen.

## 1. The four adapters

| Adapter | Tier | Unlocks | Detect by | Health check | If absent |
|---|---|---|---|---|---|
| Unity CLI | T1 | open/close editors, batch builds, batch tests, drive a running editor | `unity --version` on PATH | `unity --version` prints a version | work at T0; emit the exact command for the human |
| Unity MCP / editor bridge | T2 | live scene and prefab authoring, console, screenshots, live editor state | a bridge session answers a health/session call | health call returns a session id and the project path | drive via the Unity CLI, or edit files and verify by build |
| UCP-style control protocol | T2 | catalog-driven remote control of an editor over a port | the control endpoint answers a version/catalog call | version/catalog call returns the tool list and the project root | same as the editor bridge: fall back to T1, then T0 |
| Device tooling (`adb`, `metavr`, Xcode tools) | T3 | install, launch, device logs, traces, thermal readings | `adb devices` / `xcrun xctrace list devices` lists a device | the device list names one reachable device | build an artifact and hand device testing to a human |

Two adapters can be present at once (a bridge *and* a device). Report the tier per wish, not per project: a device-backed measurement is T3 even when the edit that produced it was T2.

## 2. Unity CLI

**Detect.** `unity --version` prints a version string. If it exits non-zero or the command is not on PATH, the CLI is absent. A version alone is not a project: it says the tool exists, not that a project is open.

**Health check.** Run `unity --version`, then the CLI's status/session command to see whether an editor is already running and which project it holds. A version without a project is a CLI-only state: batch commands still work, live edits do not.

**Worked example — run the EditMode tests.**

```text
1. PROBE   unity --version                      -> 6000.3.x, editor running on <project>
2. ACT     unity test --mode editmode           -> test run starts
3. READ-BACK re-read the reported pass/fail counts and the failed test names
4. EVIDENCE the run summary (counts + failure list) is the proof
```

A test run is idempotent (class READ for the run, CREATE for the report artifact): re-running it is safe; re-running it after a timeout is only safe if you first check whether a run is already in flight.

**Worked example — build a player for a target.**

```text
1. PROBE   unity --version + status            -> version and project confirmed
2. ACT     unity build --target <target>       -> build starts
3. READ-BACK re-read the build log tail for a clean finish
4. EVIDENCE the produced artifact path plus a clean build log
```

A build is CREATE (a new artifact). Re-running is safe, but the artifact path is what proves the step.

**Known failure signatures.**

| Symptom | Meaning | Recovery |
|---|---|---|
| `unity` not found | CLI absent | downgrade to T0; emit the batchmode command for the human |
| version prints but no project | CLI present, no editor | use batchmode; batch commands do not need a live editor |
| test run times out | run may still be alive | re-read the run state before starting another |
| build times out | build may still be running | re-read the log tail and the output path first |
| editor is locked by another process | another editor owns the project | use a separate project copy or wait |
| compile errors in the output | the project does not compile | fix or hand off; do not proceed to behaviour claims |
| version differs from the pinned project version | tooling and project drift | stop and report the pair (ADR-0004) |

## 3. Unity MCP / editor bridge

**Detect.** A bridge session answers a health or session call and returns a session id plus the project path. A bridge that is installed but not attached to a running editor is *not* a T2.

**Health check.** Call the bridge's health/session role and confirm three things in one reply: the tool is alive, the session has a project path, and the project path is the one the task names. If the path differs, you are attached to the wrong project: downgrade to T1 or T0.

**Worked example — read the frame time of a scene.**

```text
1. PROBE   health/session call -> session id, project path, editor version
2. READ    read play mode + compiling flags; both must be idle
3. ACT     invoke the editor-eval role with a frame-time readout for the scene
4. READ-BACK re-read the same value; it must match the first reading
5. EVIDENCE the frame-time value plus the scene name it was measured in
```

**Worked example — set a serialized property on a prefab.**

```text
1. PROBE   health/session call -> attached to the right project
2. READ    read the prefab asset and the current value of the property
3. ACT     write the new value through the typed editor-API role
4. READ-BACK re-read the same property; it must equal the new value
5. EVIDENCE the saved asset diff (the serialized file changed)
```

The write is MUTATE. It is only safely repeatable if the property is set to an absolute value; otherwise read it first and decide (see [doctrine/02-capabilities.md](../doctrine/02-capabilities.md) §5).

**Known failure signatures.**

| Symptom | Meaning | Recovery |
|---|---|---|
| "no session" | bridge alive, editor not attached | start or attach the editor, then re-probe; do not fall back to a stale session |
| transport error or timeout | bridge or editor is gone | one retry after a short backoff, then downgrade to T1 |
| session reports another project | wrong editor attached | re-point the bridge or downgrade; never edit the wrong tree |
| editor reported closed but the tool still answers | stale session | re-read the editor state; if it is closed, downgrade |
| edit applied but the scene did not change | the write went to a different scene or was not saved | read the open scene again, re-apply, save explicitly |
| console shows errors after the edit | the change broke compilation | re-compile, then re-run the freshness gate |
| bridge answers but the tool list is empty | version mismatch or partial session | record versions, downgrade |

## 4. UCP-style control protocol

**Detect.** The control endpoint answers a version/catalog call and returns a tool catalog plus the project root. A catalog without a project root is not a usable session.

**Health check.** Request the catalog, then the session/project root. The catalog tells you which operations this build exposes; the tool surface is generated, so treat it as data, not as a fixed API.

**Worked example — capture a screenshot of the current view.**

```text
1. PROBE   catalog call -> operation list for this build
2. PROBE   session call -> project root matches the task
3. ACT     invoke the capture role (name discovered in step 1)
4. READ-BACK read the capture metadata (path, size, timestamp)
5. EVIDENCE the image file at that path
```

A capture is CREATE (a new file): it is safe to repeat, and repeating is preferred over a missing artifact.

**Known failure signatures.**

| Symptom | Meaning | Recovery |
|---|---|---|
| connection refused | the control process is not running | downgrade to T1; the CLI can still build |
| catalog is empty or stale | wrong build or version mismatch | record the versions, downgrade |
| operation not in catalog | this build does not expose it | pick a catalog operation, or downgrade |
| operation times out | the editor is busy compiling | re-probe the compile state, then retry once |
| result references an unknown project | stale session | re-probe the session; downgrade if it persists |
| call succeeds but the artifact is empty | the capture ran with no camera or a closed view | re-probe the view state, then re-capture |

## 5. Device tooling

**Detect.** `adb devices` lists a device id with a `device` state, or `xcrun xctrace list devices` lists a simulator or device. An `unauthorized` or `offline` state means the device is not usable yet.

**Health check.** List the devices and confirm one is in a usable state. Then confirm the tool can talk to it with a read-only command (for example a device log or process list).

**Worked example — read the app log after a launch.**

```text
1. PROBE   device list -> one device in state 'device'
2. ACT     install the built artifact, then launch it
3. READ    stream the app's log lines for the launch window
4. READ-BACK re-read the log tail; the launch marker must be present
5. EVIDENCE the captured log lines with their timestamps
```

**Worked example — read the frame time on the device.**

```text
1. PROBE   device list + tool health -> one reachable device
2. ACT     start a trace or profiler capture for the app process
3. READ    read the frame-time series for the capture window
4. READ-BACK re-read the series; the numbers must be stable
5. EVIDENCE the capture file plus the frame-time series it contains
```

**Idempotency.** Installing is DESTRUCTIVE (it replaces the installed app): never re-install after a timeout without first reading the installed version. Launching is CREATE (a new process): safe to repeat, but check for a running instance first. Reading logs is READ: always safe.

**Known failure signatures.**

| Symptom | Meaning | Recovery |
|---|---|---|
| device list is empty | no device attached | downgrade to T2; report that on-device proof is unavailable |
| device is `unauthorized` | the device has not granted access | hand off: a human must accept the prompt |
| device is `offline` | the connection dropped | re-list once, then downgrade |
| install fails with a signature error | the build is not signed for the device | fix the signing config, or hand off |
| install times out | install may have completed | read the installed version before retrying |
| launch succeeds but no logs | the log stream attached to the wrong process or app id | re-read the process list, then re-attach |
| trace file is empty | the capture missed the app window | re-run the capture over a known window |
| tool missing on this OS | platform tooling absent | use the platform that has it, or downgrade |

## 6. DO NOT

- Never treat a bridge as truth without a health check first.
- Never assume an editor is open because a tool says so; confirm the session.
- Never run a non-idempotent action twice after a timeout.
- Never block on a missing adapter: downgrade and continue.
- Never install a tool, enable a package, or edit the project to raise your tier.
- Never report a tier you did not probe.
- Never present a model or a build log as a device measurement.
- Never guess a bridge tool name; read it from the catalog you just fetched.

## 7. Diagnostic decision tree

```text
SYMPTOM: an adapter call fails
  CHECK: health/session call -> alive?
    no  -> transport or process down
           -> one retry after a short backoff
              still no -> DOWNGRADE to the next tier, report it
    yes -> does the reply name the expected project/device?
            no  -> WRONG TARGET -> re-point or downgrade, never edit it
            yes -> was the action non-idempotent?
                    yes -> READ STATE FIRST, then decide; never blind-retry
                    no  -> retry once; if it fails, downgrade
SYMPTOM: the action succeeded but the result is wrong
  CHECK: read the exact property back
    mismatch -> the write did not land (or landed elsewhere)
              -> re-read where it landed; do not re-run blindly
    match    -> the state is right; produce the EVIDENCE artifact
SYMPTOM: the editor reports it is closed but the tool still answers
  CHECK: re-read the editor state; a stale session is a stale session
    -> downgrade; the old session is not proof of anything
SYMPTOM: the result is stale (an older build's numbers)
  CHECK: compare the artifact timestamp with the current build timestamp
    older -> the proof belongs to a previous build; rebuild and re-measure
```

Report the tier, the probe output that supports it, and the fallback you used. One line each.

## 8. Recording adapter state

Keep a short, bounded record of the last probe per adapter. It is evidence, and it prevents re-probing a tier that is known absent.

```text
unity-cli   : 6000.3.x | project <path> | ok
editor-bridge: session <id> | project <path> | ok
device      : <id> | state device | ok
```

Keep it in the conversation, not in the project: a file written into the user's project is a side effect the user did not ask for (see [doctrine/05-non-invasiveness.md](../doctrine/05-non-invasiveness.md)).

If a record grows unbounded, stop recording and re-probe from scratch: a stale cache is worse than a fresh probe.

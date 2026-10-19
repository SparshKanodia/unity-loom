# Doctrine 07 — Quality

Code that ships is code someone has to maintain. This doctrine says what quality
means for the work this repository produces.

## 1. Principle

- A change is finished when a test, a log line or a build proves it — never when it
  merely compiles.
- Generated code is code: it is read, reviewed and maintained like any other.
- Quality is a release requirement, not a nice-to-have.

## 2. What to test, and how

| Rule | Detail |
|---|---|
| Behaviour change | one test that fails without the change and passes with it |
| Mode | EditMode for logic and serialization, PlayMode for scene, physics and the core loop (C-050) |
| Evidence | the test id and the result file are named in the answer (C-145, C-144) |
| A test that cannot fail | is not a test: assert on a value, not on a log line |
| A flaky test | is a defect: fix the source of the order dependence, do not retry it |
| No test | for a change that only moves a file: the compile plus the build is the evidence |

Determinism is tested: replay the same input twice and assert the same output
(C-061). A procedure that scores a training run must produce the same score from
the same event log, every time.

## 3. Error handling in generated code

- Fail with context: the operation, the object, the value that was wrong.
- An empty `catch` is a defect. A caught exception is either handled or rethrown.
- No silent fallback that hides a failure behind a default value.
- The exceptional path is an exception; the expected path is a return value.
- A cancelled operation is not an error: cancellation is not swallowed.
- A null check on a Unity object uses `== null`, because a destroyed object
  compares equal to null (C-003).
- The error message says what to do next, not only what went wrong.

## 4. Logging and observability

| Rule | Detail |
|---|---|
| One line, one fact | a log line carries the ids needed to reproduce the event |
| Levels | info for a lifecycle step, warning for a recovered problem, error for the one that needs a human |
| No per-frame logging | a log in an update path is a performance defect (C-045) |
| Bounded | a log file has a size cap and an eviction rule |
| Redacted | tokens, keys, personal data and device identifiers never reach a log (see [doctrine/01-safety.md](01-safety.md) §6) |
| Measurable | a claim about speed or memory names the capture it came from, not an impression |

## 5. Determinism

- The same input produces the same output: a fixed seed, a fixed step order, no
  dependence on wall-clock time, frame order or dictionary iteration order.
- A build is reproducible from a pinned editor, pinned packages and a recorded
  version set (ADR-0004).
- Nothing generated at build time is committed, so a clean checkout builds the
  same artefact twice.
- A test that only passes in a particular order is an order dependence, and the
  fix is in the code, not in the test list.

## 6. Accessibility is a release requirement

- Every input has a remappable binding, and the default binding is one a player
  can learn (see [references/claims.md](../references/claims.md) for the binding
  override API).
- No information is carried by colour alone; every state has a second channel.
- Text scales with the player's text size, and the layout survives the largest
  supported size without clipping.
- Audio that carries information has a caption or a subtitle.
- No timed interaction that the player cannot pause or extend.
- A release without the accessibility checklist is not a release; the check is
  evidence, not a claim (see [doctrine/06-collaboration.md](06-collaboration.md) §7
  for the hand-over shape that carries it).

## 7. Dependency hygiene

- A package is added for a stated reason, with its version pinned, its source and
  its licence named (see [doctrine/01-safety.md](01-safety.md) §5).
- One package, one purpose. A dependency that does one small thing is written
  locally instead.
- No package that is unmaintained, or that duplicates a package already present.
- A package that is removed leaves no trace: no stale reference in a manifest, no
  orphaned asset, no leftover settings.
- A new package is announced with the cost it adds to the build and to the
  compile, so the decision is informed.

## 8. What an agent does

1. Writes the failing test first, or names the artefact that proves the change.
2. Handles the error path explicitly, with the context a human needs.
3. Logs one fact per line, at the right level, with nothing sensitive in it.
4. Keeps the change deterministic, and proves it by replaying the same input.
5. Checks the accessibility items that the change touches, before the release.
6. Adds a dependency only with a reason, a pin, a source and a licence.
7. Names the evidence in the answer: the test id, the log line, the capture.

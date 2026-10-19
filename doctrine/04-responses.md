# Doctrine 04 — Responses & Context Budgets

Tool output is the main way an agent wastes its own context. These caps are mandatory.

## 1. Output budget

| Class of output | Cap | How to get under it |
|---|---|---|
| Status line | ≤ 5 lines | one line per fact: what changed, where, what proves it |
| Next-step list | ≤ 5 bullets | one line per workflow step, no paragraphs |
| Code patch | 1 file unless the user asks for more | split across turns; show the changed region only |
| Log excerpt | ≤ 40 lines | error and warning lines only, ±3 lines of context |
| Tool dump | ≤ 100 lines | filter or page at the adapter, then trim |
| File listing | ≤ 50 entries | count first, then the first 50, then a summary of the rest |
| Hierarchy / scene dump | ≤ 50 nodes | query the objects the task needs, not the whole scene |
| Diff | the changed region only | never paste the old file next to the new one |
| Profiler capture | ≤ 20 rows | the frames the target metric names, plus one aggregate |
| Final answer | result → evidence → next step | see §5 |

Exceeding a cap is a defect in the answer, not a fact about the tool. Trim and link instead.

## 2. Always drop

Never paste these, even when the tool emits them:

- Verbose headers, banners, and decorative blocks.
- Repeated progress lines and spinners.
- Stack-trace noise below the first frame that names the cause.
- Content the user already pasted earlier in the same session.
- "Here is the result" preambles and closing offers of help.
- Duplicate lines: keep the first occurrence, count the remainder.
- Timestamps, PIDs, and machine paths, unless the task is about them.

## 3. Paginate, summarize, diff

- Page large results instead of fetching everything. A narrowed query beats a truncated dump.
- State the position: "showing 51–100 of 240" beats a silent cut.
- Summarize a long list as: total count, first N items, the categories it breaks into, and a
  note that the full list is available on request.
- Replace a dump with a diff: show what changed, not what was there before.
- Prefer a path, an id, or a GUID to the object itself; fetch details only when required.
- If an adapter offers filtering, pagination, or a field selection, use it first.
- Search before reading: locate the file, type, or method, then read only that region.

## 4. Context arithmetic

The repository's own limits are listed in
[docs/06-context-budget.md](../docs/06-context-budget.md): all skills together ≤ 64 KB, one
domain skill ≤ 8 KB. The whole system is a fraction of a context window, so a single skill
should never cost more than a few thousand tokens.

- A task loads one domain skill plus at most one workflow and one reference at a time.
- Pull a claim from the registry only when you assert it. Never preload the registry.
- After a batch of operations, report what changed, not the raw responses.
- When roughly half the window is spent, checkpoint: state, next step, narrowed scope.
- Drop intermediate snapshots once you have acted and verified.

## 5. Answer shape for a routed task

The router owns the shape: [skills/unity-loom/SKILL.md](../skills/unity-loom/SKILL.md). Four
parts, in order:

1. Tier and detected project.
2. The chosen skill and its workflow.
3. The next one or two concrete steps.
4. The evidence that will prove it.

Nothing else belongs in the answer. An unrouted task uses the same four parts.

## 6. Quoting tool output

- Quote the failure, not the whole log: the error line, the exception type, the file and line.
- Redact before quoting. Tokens, keys, passwords, connection strings, device identifiers, and
  personal data never enter the transcript; write "redacted" in their place.
- Never paste a whole file back when a diff says it.
- Quote a measured value exactly. Never paraphrase a number.
- A quoted error stays verbatim. Do not tidy it into a summary.

## 7. BEFORE YOU PASTE

- [ ] Is this the failure, or the whole log?
- [ ] Are secrets and personal data removed?
- [ ] Would a diff or a path say it more cheaply?
- [ ] Are banners, progress lines, and duplicates gone?
- [ ] Is the result under the cap for this class of output?
- [ ] Will the user act on this, or only read it?

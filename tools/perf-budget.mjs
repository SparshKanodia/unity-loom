#!/usr/bin/env node
// perf-budget.mjs - compare a captured performance metrics file against a budget.
//
// Zero dependencies. Node 20+. No network. Cross-platform.
//
// Usage:
//   node tools/perf-budget.mjs [options]
//
// Options:
//   --metrics <path>          metrics file to read
//                             (default: artifacts/perf/latest/metrics.json)
//   --max-p95-ms <n>          upper bound for the p95 frame time, in milliseconds
//   --max-gc-bytes <n>        upper bound for the GC bytes allocated per frame
//   --max-draw-calls <n>      upper bound for the draw calls in one frame
//   --max-memory-mb <n>       upper bound for the peak resident memory, in MB
//   --json                    print a machine-readable report on stdout
//   --help                    print this usage text
//
// Accepted metrics file shapes.
//
// Shape A - one object with the metrics as named fields:
//
//   {
//     "p95FrameTimeMs": 9.4,
//     "gcBytesPerFrame": 0,
//     "drawCalls": 318,
//     "peakMemoryMb": 402
//   }
//
// Shape B - one object with a "metrics" array of name/value entries:
//
//   {
//     "metrics": [
//       { "name": "p95FrameTimeMs", "value": 9.4 },
//       { "name": "drawCalls", "value": 318 }
//     ]
//   }
//
// A metric name is matched case-insensitively. The recognised aliases are:
//
//   p95 frame time   p95FrameTimeMs, p95_frame_time_ms, frameTimeP95Ms, p95Ms
//   GC per frame     gcBytesPerFrame, gc_bytes_per_frame, gcAllocBytesPerFrame
//   draw calls       drawCalls, draw_calls
//   peak memory      peakMemoryMb, peak_memory_mb
//
// Exit codes:
//   0  every metric is inside its budget
//   1  at least one metric is over its budget
//   2  usage error: an unknown flag, a missing value or a non-numeric value
//   3  the metrics file is missing, unreadable or malformed
//
// The tool prints metric names, values and budgets only. It never prints a
// secret, a path credential or the raw file contents.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_METRICS = "artifacts/perf/latest/metrics.json";

const BUDGET_FLAGS = [
  { flag: "--max-p95-ms", metric: "p95FrameTimeMs", unit: "ms" },
  { flag: "--max-gc-bytes", metric: "gcBytesPerFrame", unit: "B" },
  { flag: "--max-draw-calls", metric: "drawCalls", unit: "calls" },
  { flag: "--max-memory-mb", metric: "peakMemoryMb", unit: "MB" },
];

const ALIASES = {
  p95frametimems: "p95FrameTimeMs",
  p95_frame_time_ms: "p95FrameTimeMs",
  frametimep95ms: "p95FrameTimeMs",
  p95ms: "p95FrameTimeMs",
  gcbytesperframe: "gcBytesPerFrame",
  gc_bytes_per_frame: "gcBytesPerFrame",
  gcallocbytesperframe: "gcBytesPerFrame",
  drawcalls: "drawCalls",
  draw_calls: "drawCalls",
  peakmemorymb: "peakMemoryMb",
  peak_memory_mb: "peakMemoryMb",
};

function usage(stream) {
  const lines = [
    "perf-budget - compare a metrics file against a frame and memory budget",
    "",
    "Usage:",
    "  node tools/perf-budget.mjs [--metrics <path>] [thresholds] [--json]",
    "",
    "Thresholds:",
  ];
  for (const b of BUDGET_FLAGS) {
    lines.push(`  ${b.flag} <n>   upper bound for ${b.metric} (${b.unit})`);
  }
  lines.push(
    "",
    "Other options:",
    `  --metrics <path>   metrics file (default: ${DEFAULT_METRICS})`,
    "  --json             machine-readable report on stdout",
    "  --help             this text",
    "",
    "Exit codes: 0 inside budget, 1 over budget, 2 usage error, 3 bad metrics file",
  );
  stream.write(lines.join("\n") + "\n");
}

function fail(code, message) {
  process.stderr.write(`perf-budget: ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = { metrics: DEFAULT_METRICS, json: false, help: false, budgets: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--metrics") {
      const value = argv[++i];
      if (value === undefined) fail(2, "--metrics needs a path");
      options.metrics = value;
      continue;
    }
    if (arg.startsWith("--metrics=")) {
      options.metrics = arg.slice("--metrics=".length);
      continue;
    }
    const known = BUDGET_FLAGS.find((b) => b.flag === arg);
    if (known) {
      const raw = argv[++i];
      if (raw === undefined) fail(2, `${known.flag} needs a number`);
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        fail(2, `${known.flag} needs a non-negative number, got "${raw}"`);
      }
      options.budgets.push({ metric: known.metric, unit: known.unit, budget: value });
      continue;
    }
    const inline = BUDGET_FLAGS.find((b) => arg.startsWith(`${b.flag}=`));
    if (inline) {
      const raw = arg.slice(`${inline.flag}=`.length);
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        fail(2, `${inline.flag} needs a non-negative number, got "${raw}"`);
      }
      options.budgets.push({ metric: inline.metric, unit: inline.unit, budget: value });
      continue;
    }
    fail(2, `unknown argument "${arg}". Run with --help for usage.`);
  }
  return options;
}

function canonicalName(raw) {
  const key = String(raw).toLowerCase().replace(/\s+/g, "");
  return ALIASES[key] || null;
}

function readMetrics(file) {
  const path = resolve(file);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    const reason = err && err.code === "ENOENT" ? "it does not exist" : err.message;
    fail(3, `cannot read the metrics file at ${file}: ${reason}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    fail(3, `the metrics file at ${file} is not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(3, `the metrics file at ${file} must hold an object, not an array or a scalar`);
  }
  const values = new Map();
  if (Array.isArray(parsed.metrics)) {
    for (const entry of parsed.metrics) {
      if (!entry || typeof entry !== "object") {
        fail(3, `the metrics array in ${file} holds an entry that is not an object`);
      }
      const rawName = entry.name || entry.metric || entry.key;
      const name = canonicalName(rawName);
      if (!name) continue;
      const value = Number(entry.value);
      if (!Number.isFinite(value)) {
        fail(3, `the metric "${rawName}" in ${file} has a non-numeric value`);
      }
      values.set(name, value);
    }
  } else {
    for (const [key, value] of Object.entries(parsed)) {
      const name = canonicalName(key);
      if (!name) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        fail(3, `the metric "${key}" in ${file} has a non-numeric value`);
      }
      values.set(name, numeric);
    }
  }
  if (values.size === 0) {
    fail(3, `the metrics file at ${file} holds no recognised metric`);
  }
  return values;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage(process.stdout);
    process.exit(0);
  }
  if (options.budgets.length === 0) {
    usage(process.stderr);
    fail(2, "no threshold given. Pass at least one --max-... flag.");
  }
  const values = readMetrics(options.metrics);
  const checks = [];
  for (const b of options.budgets) {
    if (!values.has(b.metric)) {
      fail(3, `the metrics file at ${options.metrics} has no "${b.metric}" value`);
    }
    const value = values.get(b.metric);
    const over = value > b.budget;
    checks.push({
      metric: b.metric,
      unit: b.unit,
      value,
      budget: b.budget,
      over,
      excess: over ? Number((value - b.budget).toFixed(4)) : 0,
    });
  }
  const failures = checks.filter((c) => c.over);
  if (options.json) {
    const report = {
      tool: "perf-budget",
      ok: failures.length === 0,
      metricsFile: options.metrics,
      checks,
      failures: failures.map((f) => ({
        metric: f.metric,
        value: f.value,
        budget: f.budget,
        excess: f.excess,
      })),
    };
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exit(failures.length === 0 ? 0 : 1);
  }
  const width = Math.max(...checks.map((c) => c.metric.length));
  process.stdout.write(`perf-budget: ${options.metrics}\n`);
  for (const c of checks) {
    const status = c.over ? "OVER" : "ok";
    const line =
      `  ${c.metric.padEnd(width)}  ${String(c.value).padStart(10)} ${c.unit}` +
      `  budget ${String(c.budget).padStart(10)}  ${status}`;
    process.stdout.write(line + "\n");
  }
  if (failures.length > 0) {
    process.stdout.write("over budget:\n");
    for (const f of failures) {
      process.stdout.write(
        `  ${f.metric} is ${f.value} ${f.unit}, over the budget of ` +
          `${f.budget} ${f.unit} by ${f.excess} ${f.unit}\n`,
      );
    }
    process.exit(1);
  }
  process.stdout.write(`all ${checks.length} metric(s) inside budget\n`);
  process.exit(0);
}

main();

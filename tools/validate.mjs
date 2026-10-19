#!/usr/bin/env node
// Unity Loom validator - zero dependencies, Node >= 20, no network access.
//
// Enforces the repository contracts:
//   manifest-integrity       every manifest entry exists, no orphan .md/.mjs
//   frontmatter              frontmatter parses, name/description rules
//   frontmatter-portability  only known top-level keys, required metadata keys
//   triggers                 lowercase, disjoint, no banned / router-only tokens
//   trigger-drift            manifest == frontmatter == router routing table
//   wiring                   skill <-> workflow links, tiers, no orphans
//   budgets                  per-file lines/bytes and total core bytes
//   links                    every relative link resolves
//   no-restatement           duplicated guidance across operational files
//   safety                   no GUI-click instructions, no unfinished-work markers
//   secrets                  no credential material in tracked files
//   workflow-gates           every workflow has a "## Done when" section
//
// Usage:
//   node tools/validate.mjs            human report (default)
//   node tools/validate.mjs --json     machine-readable report on stdout
//   node tools/validate.mjs --quiet    errors only (no summary)
//   node tools/validate.mjs --selftest run the checks over synthetic documents
//   node tools/validate.mjs --help     usage
//
// Exit codes: 0 = pass, 1 = check failure (or failed self-test), 2 = usage error.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

// Maximum number of messages printed per rule (context-budget doctrine).
const MAX_PER_RULE = 20;

const USAGE = `Unity Loom validator (zero dependencies, Node >= 20)

Usage:
  node tools/validate.mjs [options]

Options:
  --json       print a machine-readable JSON report on stdout (exit code unchanged)
  --quiet      print errors only, no summary lines
  --selftest   run every check against synthetic documents and print a PASS/FAIL table
  --help, -h   show this help

Exit codes:
  0  all checks passed
  1  one or more checks failed (or a self-test case failed)
  2  bad command line usage`;

// ---------------------------------------------------------------- utilities

const read = (p) => readFileSync(p, "utf8");
// Normalise line endings BEFORE any measurement (Windows CRLF safety).
const normalize = (s) => s.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
const bytes = (s) => Buffer.byteLength(s, "utf8");
const lines = (s) => s.split("\n").length;
const rel = (p) => relative(ROOT, p).split(sep).join("/");

const SKIP_DIRS = new Set(["node_modules", ".git", ".vscode"]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

// Shannon entropy of a string, in bits per character.
function entropy(s) {
  if (!s.length) return 0;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

// Character classes used by the entropy heuristic.
function charClasses(s) {
  let n = 0;
  if (/[a-z]/.test(s)) n++;
  if (/[A-Z]/.test(s)) n++;
  if (/[0-9]/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  return n;
}

// ---------------------------------------------------------------- CLI

const FLAGS = { json: false, quiet: false, selftest: false, help: false };

function parseArgs(argv) {
  for (const a of argv) {
    switch (a) {
      case "--json": FLAGS.json = true; break;
      case "--quiet": case "-q": FLAGS.quiet = true; break;
      case "--selftest": case "--self-test": FLAGS.selftest = true; break;
      case "--help": case "-h": FLAGS.help = true; break;
      default:
        console.error(`Unknown argument: ${a}`);
        console.error(USAGE);
        process.exit(2);
    }
  }
}

// ---------------------------------------------------------------- frontmatter

// Parses the leading `---` block of a document. Returns the top-level keys,
// the nested `metadata` keys, the raw (still quoted) values and the file line
// number of every key so failures can point at a line.
function parseFrontmatter(text) {
  const src = normalize(text);
  if (!src.startsWith("---\n")) return { ok: false, reason: "missing opening ---" };
  const end = src.indexOf("\n---", 3);
  if (end === -1) return { ok: false, reason: "missing closing ---" };
  const block = src.slice(4, end + 1);
  const blockLines = block.split("\n");
  const top = {};
  const nested = {};
  const rawLines = {};
  const keyLines = {};
  let current = null;
  for (let i = 0; i < blockLines.length; i++) {
    const raw = blockLines[i];
    if (raw.trim() === "") continue;
    const isNested = /^\s/.test(raw);
    const line = raw.trim();
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2];
    // File line number: line 1 is the opening "---", so block index i is i+2.
    const fileLine = i + 2;
    if (isNested && current) {
      nested[current][key] = val;
      rawLines[`${current}.${key}`] = val;
      keyLines[`${current}.${key}`] = fileLine;
    } else {
      if (val === "") {
        current = key;
        nested[key] = {};
        top[key] = "";
      } else {
        current = null;
        top[key] = val;
        rawLines[key] = val;
      }
      keyLines[key] = fileLine;
    }
  }
  return { ok: true, top, nested, rawLines, keyLines };
}

function unquote(v) {
  if (v == null) return v;
  const s = v.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

function parseInlineArray(v) {
  if (!v) return [];
  const s = v.trim();
  if (!s.startsWith("[") || !s.endsWith("]")) return [];
  const inner = s.slice(1, -1).trim();
  if (inner === "") return [];
  return inner
    .split(",")
    .map((x) => x.trim().replace(/^["']|["']$/g, ""))
    .filter((x) => x.length > 0);
}

// A quoted, single-line, double-quoted scalar such as "some text".
const QUOTED_SINGLE_LINE = /^"(?:[^"\\]|\\.)*"$/;

// Unfinished-work markers. The words are assembled at run time so that this
// source file does not itself contain text that a placeholder scan would flag.
const PLACEHOLDER_MARKER_RE = new RegExp(
  "\\b(" + ["TO" + "DO", "FIX" + "ME", "TB" + "D"].join("|") + ")\\b",
);

const ALLOWED_TOP_KEYS = new Set(["name", "description", "allowed-tools", "metadata"]);
const REQUIRED_METADATA_KEYS = [
  "loom", "domain", "tier", "triggers", "budget", "verified-against", "sources",
];

// ---------------------------------------------------------------- secret scan

// Inline allowlist marker. A line that carries the marker is exempt from the
// secret rules, as is the line directly below a marker-only line.
const ALLOW_MARKER = "<!-- loom-allow-secret:";
const ALLOW_RE = /<!--\s*loom-allow-secret:\s*[^>]*-->/;

const CRED_PATTERNS = [
  { id: "aws-access-key-id", re: /\b(?:AKIA|ASIA|ABIA|ACCA|AIDA|AROA|AIPA|ANPA|ANVA)[0-9A-Z]{16}\b/g },
  { id: "private-key-block", re: /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/g },
  { id: "github-token", re: /\b(?:ghp|gho|ghs|ghr|ghu)_[A-Za-z0-9]{20,}\b/g },
  { id: "github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g },
  { id: "slack-token", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g },
  { id: "bearer-literal", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g },
  {
    id: "connection-string-password",
    re: /(?:server|data source|host|database)\s*=\s*[^;'"]{0,120};\s*(?:password|pwd)\s*=\s*[^;\s'"]{3,}/i,
  },
  {
    // key: "literal" / key = "literal" where the name smells like a credential
    id: "credential-assignment",
    re: /(["']?)([A-Za-z0-9_.-]*(?:api[_-]?key|apikey|secret|token|password|passwd|credential|auth[_-]?token|access[_-]?key|private[_-]?key)[A-Za-z0-9_.-]*)\1\s*[:=]\s*(["'])([^"'\n]{12,})\3/gi,
  },
];

// High-entropy variant: same shape, but the value must look like an opaque
// blob rather than prose (no whitespace, several character classes).
const ENTROPY_ASSIGNMENT =
  /(["']?)([A-Za-z0-9_.-]*(?:key|secret|token|password|passwd|credential)[A-Za-z0-9_.-]*)\1\s*[:=]\s*(["'])([^"'\n]{24,})\3/gi;

const PLACEHOLDER_VALUE =
  /^(\$\{|<|\{|YOUR[_-]|your[_-]|CHANGE[_-]?ME|changeme|example|EXAMPLE|placeholder|PLACEHOLDER|redacted|REDACTED|dummy|DUMMY|test[_-]?key|sample|SAMPLE|\*+|[xX]{6,})/;

// Never print the secret itself: at most a short prefix plus the length.
function redact(value) {
  const v = String(value);
  const prefix = v.slice(0, 4);
  return `${prefix}... (redacted, ${v.length} chars)`;
}

function isAllowlisted(line, prevLine) {
  return ALLOW_RE.test(line) || (prevLine !== undefined && ALLOW_RE.test(prevLine));
}

// ---------------------------------------------------------------- store

// A store is the validator's view of the repository: a sorted map of
// repo-relative POSIX paths to normalised text. The real repository and the
// self-test fixtures use the same interface, so every rule is exercised
// identically in both modes.
function makeStore(entries) {
  const map = new Map();
  for (const [p, t] of entries) map.set(p.split("\\").join("/"), normalize(t));
  return {
    has: (p) => map.has(p),
    get: (p) => (map.has(p) ? map.get(p) : null),
    list: () => [...map.keys()].sort(),
  };
}

function diskStore() {
  const entries = [];
  for (const abs of walk(ROOT)) entries.push([rel(abs), read(abs)]);
  return makeStore(entries);
}

// Resolve a relative link target against the directory of `fromPath`.
function resolveRel(fromPath, target) {
  const joined = posix.normalize(posix.join(posix.dirname(fromPath), target));
  return joined;
}

// ---------------------------------------------------------------- routing table

// Parses the router's markdown routing table. The table may carry a leading
// domain column and/or a leading label column, so the column roles are read
// from the header row and only fall back to link sniffing:
//
//   | Domain | Triggers | Skill | Workflow |
//   | trigger, trigger, ...  | skill link | workflow link |
//
// Returns null when the router has no routing table at all.
function parseRouterTable(text) {
  const src = normalize(text).split("\n");
  let start = -1;
  for (let i = 0; i < src.length; i++) {
    if (/^#{1,6}\s.*routing/i.test(src[i])) { start = i; break; }
  }

  // Collect the raw table rows (header first) with their file line numbers.
  // When the router has no "routing" heading, the whole document is scanned.
  const table = [];
  const from = start === -1 ? 0 : start + 1;
  for (let i = from; i < src.length; i++) {
    const l = src[i];
    if (start !== -1 && /^#{1,6}\s/.test(l)) break; // next section
    if (!l.trim().startsWith("|")) continue;
    const cells = l.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // separator row
    table.push({ line: i + 1, cells });
  }
  if (table.length === 0) return null;

  const header = table[0].cells;
  const linkIn = (cell) => {
    const m = cell.match(/\[([^\]]*)\]\(([^)]+)\)/);
    return m ? m : null;
  };
  const firstData = table.find((r) => r.line !== table[0].line) || table[0];

  // Column roles: header text first, link shapes second, position last.
  const findHeader = (re) => header.findIndex((c) => re.test(c));
  let skillCol = findHeader(/\bskill\b/i);
  if (skillCol === -1) skillCol = firstData.cells.findIndex((c) => { const l = linkIn(c); return l && /SKILL\.md$/i.test(l[2]); });
  let workflowCol = findHeader(/\bworkflow/i);
  if (workflowCol === -1) workflowCol = firstData.cells.findIndex((c) => { const l = linkIn(c); return l && /\.md$/i.test(l[2]) && !/SKILL\.md$/i.test(l[2]); });
  let triggerCol = findHeader(/\btrigger/i);
  if (triggerCol === -1) {
    triggerCol = header.findIndex((c, i) => i !== skillCol && i !== workflowCol && !/\b(domain|label|name)\b/i.test(c));
  }
  if (skillCol === -1 || workflowCol === -1 || triggerCol === -1) return [];

  const rows = [];
  for (const row of table) {
    if (row === table[0] && header.some((c) => /trigger/i.test(c))) continue; // header row
    const skillLink = linkIn(row.cells[skillCol] || "");
    const workflowLink = linkIn(row.cells[workflowCol] || "");
    if (!skillLink || !workflowLink) continue;
    const triggers = (row.cells[triggerCol] || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    rows.push({
      line: row.line,
      triggers,
      skillTarget: skillLink[2],
      workflowTarget: workflowLink[2],
    });
  }
  return rows;
}

// ---------------------------------------------------------------- helpers

// Set difference helper: `a` and `b` are arrays of lower-case tokens.
function diffSets(a, b) {
  const bSet = new Set(b);
  const aSet = new Set(a);
  return {
    missing: [...aSet].filter((x) => !bSet.has(x)).sort(), // in a, not in b
    extra: [...bSet].filter((x) => !aSet.has(x)).sort(), // in b, not in a
  };
}

const lower = (arr) => (arr || []).map((t) => String(t).toLowerCase());

// ---------------------------------------------------------------- rules

// Every rule receives the model and a `report` callback. A finding is
// { file, line, message, fix }: the file, the line when known, what is wrong
// and how to make it right.
const RULES = [];
const rule = (id, title, run) => RULES.push({ id, title, run });

rule("manifest-integrity", "Manifest lists every file and no file is orphaned", (model, report) => {
  const { manifest, store } = model;
  const expected = new Set();
  for (const group of ["skills", "workflows", "doctrine", "references", "docs"]) {
    for (const e of manifest[group] || []) {
      if (e && typeof e.path === "string") expected.add(e.path);
    }
  }
  for (const f of manifest.rootFiles || []) expected.add(f);
  for (const f of manifest.tooling || []) expected.add(f);

  for (const p of [...expected].sort()) {
    if (!store.has(p)) {
      report({ file: p, message: "listed in manifest but missing on disk", fix: "create the file or drop the manifest entry" });
    }
  }
  for (const p of store.list()) {
    if (p.startsWith(".github/")) continue; // CI files are not manifest content
    const ext = extname(p).toLowerCase();
    if ((ext === ".md" || ext === ".mjs") && !expected.has(p)) {
      report({ file: p, message: "orphan file: not listed in the manifest", fix: "add the path to the matching manifest group or delete the file" });
    }
  }
  const b = model.budgets;
  // Every `max<Group>` budget in the manifest caps the size of that group.
  for (const key of Object.keys(b).sort()) {
    const m = key.match(/^max([A-Za-z]+)$/);
    if (!m) continue;
    const group = m[1].toLowerCase();
    const entries = manifest[group];
    if (!Array.isArray(entries)) continue;
    if (entries.length > b[key]) {
      report({ file: "manifest.json", message: `too many ${group}: ${entries.length} > ${b[key]}`, fix: `remove ${group} or raise budgets.${key}` });
    }
  }
  for (const s of manifest.skills) {
    if (!s || typeof s.path !== "string" || typeof s.name !== "string") {
      report({ file: "manifest.json", message: "a manifest.skills entry is missing `name` or `path`", fix: "give every skill entry a name and a path" });
    }
  }
});

rule("frontmatter", "Frontmatter parses and the name/description rules hold", (model, report) => {
  const { manifest, store } = model;
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = store.get(skill.path);
    if (text == null) continue; // reported by manifest-integrity
    const fm = parseFrontmatter(text);
    if (!fm.ok) {
      report({ file: skill.path, message: fm.reason, fix: "add a `---` delimited frontmatter block at the top of the file" });
      continue;
    }
    if (Object.keys(fm.nested.metadata || {}).length === 0) {
      report({ file: skill.path, line: fm.keyLines["metadata"], message: "missing metadata block", fix: "add a `metadata:` block with the required keys" });
    }
    const name = unquote(fm.top.name);
    const dirName = skill.path.split("/")[1];
    if (name !== dirName) {
      report({ file: skill.path, line: fm.keyLines["name"], message: `name "${name}" != directory "${dirName}"`, fix: `rename the skill directory to "${name}" or set name: ${dirName}` });
    }
    if (name !== skill.name) {
      report({ file: skill.path, line: fm.keyLines["name"], message: `name "${name}" != manifest name "${skill.name}"`, fix: `set name: ${skill.name} or update manifest.json` });
    }
    if (!fm.rawLines["verified-against"] && !fm.nested.metadata?.["verified-against"]) {
      report({ file: skill.path, message: "metadata.verified-against is required", fix: "add `verified-against:` to the metadata block" });
    }
  }
});

rule("frontmatter-portability", "Only portable frontmatter keys and shapes are used", (model, report) => {
  const { manifest, store } = model;
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = store.get(skill.path);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    if (!fm.ok) continue;

    for (const key of Object.keys(fm.top)) {
      if (!ALLOWED_TOP_KEYS.has(key)) {
        report({ file: skill.path, line: fm.keyLines[key], message: `unsupported top-level frontmatter key "${key}"`, fix: `remove "${key}"; allowed keys are ${[...ALLOWED_TOP_KEYS].join(", ")}` });
      }
    }

    const tools = fm.rawLines["allowed-tools"];
    if (tools == null || unquote(tools).trim() === "") {
      report({ file: skill.path, line: fm.keyLines["allowed-tools"], message: "allowed-tools is missing or empty", fix: "list the tools the skill may use, e.g. `allowed-tools: Read, Grep, Glob`" });
    }

    const meta = fm.nested.metadata || {};
    for (const key of REQUIRED_METADATA_KEYS) {
      if (meta[key] == null || String(meta[key]).trim() === "") {
        report({ file: skill.path, line: fm.keyLines["metadata"], message: `metadata.${key} is required`, fix: `add \`${key}:\` to the metadata block` });
      }
    }

    const descRaw = fm.rawLines["description"];
    if (descRaw == null) {
      report({ file: skill.path, line: fm.keyLines["name"], message: "missing description", fix: "add a one-line double-quoted `description:`" });
    } else {
      const trimmed = descRaw.trim();
      if (!trimmed.startsWith('"') || !trimmed.endsWith('"') || trimmed.length < 2) {
        report({ file: skill.path, line: fm.keyLines["description"], message: "description must be double-quoted on one line", fix: 'wrap the description in double quotes, e.g. description: "..."' });
      } else if (!QUOTED_SINGLE_LINE.test(trimmed)) {
        report({ file: skill.path, line: fm.keyLines["description"], message: "description contains an unescaped inner double quote", fix: "escape the inner quote with \\\" or use single quotes inside" });
      }
      const d = unquote(descRaw);
      if (d.length > 1024) {
        report({ file: skill.path, line: fm.keyLines["description"], message: `description too long (${d.length} > 1024)`, fix: "shorten the description to 1024 characters or fewer" });
      }
      if (d.includes("\n")) {
        report({ file: skill.path, line: fm.keyLines["description"], message: "description must be single-line", fix: "keep the description on one line" });
      }
    }
  }
});

rule("triggers", "Triggers are lowercase, disjoint and not banned", (model, report) => {
  const { manifest } = model;
  const owners = new Map();
  const routerOnly = new Set(lower(manifest.routerOnlyTriggers || []));
  const banned = new Set(lower(manifest.bannedTriggers || []));
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = model.store.get(skill.path);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    if (!fm.ok) continue;
    const triggers = parseInlineArray(fm.nested.metadata?.triggers);
    if (skill.domain === "router") continue;
    if (triggers.length === 0) {
      report({ file: skill.path, message: "non-router skill has no triggers", fix: "list the phrases that should route to this skill" });
    }
    for (const t of triggers) {
      const low = t.toLowerCase();
      if (t !== low) {
        report({ file: skill.path, message: `trigger "${t}" is not lowercase`, fix: `write the trigger as "${low}"` });
      }
      if (banned.has(low)) {
        report({ file: skill.path, message: `banned trigger "${t}"`, fix: `remove "${t}"; banned triggers are ${[...banned].join(", ")}` });
      }
      if (routerOnly.has(low)) {
        report({ file: skill.path, message: `trigger "${t}" is router-only`, fix: `remove "${t}"; it belongs to the router` });
      }
      if (owners.has(low)) {
        report({ file: skill.path, message: `trigger collision: "${t}" in ${skill.path} and ${owners.get(low)}`, fix: `give "${t}" to only one skill` });
      }
      owners.set(low, skill.path);
    }
  }
});

rule("trigger-drift", "Manifest, frontmatter and the router table agree on triggers", (model, report) => {
  const { manifest, store } = model;
  const routerOnly = lower(manifest.routerOnlyTriggers || []);

  // (i) manifest.skills[].triggers == SKILL.md frontmatter metadata.triggers
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = store.get(skill.path);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    if (!fm.ok) continue;
    const fmTriggers = lower(parseInlineArray(fm.nested.metadata?.triggers));
    let manifestTriggers = lower(skill.triggers);
    if (skill.domain === "router" && manifestTriggers.length === 0) {
      // The router owns the router-only triggers; they are declared once in
      // manifest.routerOnlyTriggers and mirrored in the router frontmatter.
      manifestTriggers = routerOnly;
    }
    const d = diffSets(manifestTriggers, fmTriggers);
    const line = fm.keyLines["metadata.triggers"];
    for (const t of d.missing) {
      report({ file: skill.path, line, message: `trigger "${t}" is declared in manifest.json but missing from the frontmatter metadata.triggers`, fix: `add "${t}" to metadata.triggers in ${skill.path}` });
    }
    for (const t of d.extra) {
      report({ file: skill.path, line, message: `trigger "${t}" is in the frontmatter metadata.triggers but not in manifest.json`, fix: `add "${t}" to manifest.skills[].triggers or remove it from ${skill.path}` });
    }
  }

  // (ii) the router routing table must list exactly the manifest triggers
  const routerPath = typeof manifest.entry === "string" ? manifest.entry : null;
  if (!routerPath) {
    report({ file: "manifest.json", message: "manifest.entry is missing", fix: "point manifest.entry at the router SKILL.md" });
    return;
  }
  const routerText = store.get(routerPath);
  if (routerText == null) {
    report({ file: routerPath, message: "the router document is missing", fix: "create the router SKILL.md listed in manifest.entry" });
    return;
  }
  const rows = parseRouterTable(routerText);
  if (!rows || rows.length === 0) {
    report({ file: routerPath, message: "no routing table rows found in the router", fix: "add a markdown table with a trigger column, a skill link column and a workflow link column" });
    return;
  }

  const skillByPath = new Map(manifest.skills.map((s) => [s.path, s]));
  const workflowPaths = new Set(manifest.workflows.map((w) => w.path));
  const rowUnion = new Set();
  const rowReported = new Set();

  for (const row of rows) {
    const skillTarget = resolveRel(routerPath, row.skillTarget);
    const workflowTarget = resolveRel(routerPath, row.workflowTarget);
    const skill = skillByPath.get(skillTarget);
    if (!skill) {
      report({ file: routerPath, line: row.line, message: `routing row points at "${row.skillTarget}" which is not a manifest skill`, fix: "point the Load column at an existing manifest skill" });
      continue;
    }
    if (!workflowPaths.has(workflowTarget)) {
      report({ file: routerPath, line: row.line, message: `routing row points at workflow "${row.workflowTarget}" which is not in manifest.workflows`, fix: "point the Workflow column at an existing manifest workflow" });
    } else if (skill.workflow && skill.workflow !== workflowTarget) {
      report({ file: routerPath, line: row.line, message: `routing row workflow "${workflowTarget}" != manifest workflow "${skill.workflow}" for ${skill.name}`, fix: `use ${skill.workflow} in the Workflow column` });
    }

    const rowTriggers = lower(row.triggers);
    const manifestTriggers = lower(skill.triggers);
    const d = diffSets(manifestTriggers, rowTriggers);
    for (const t of d.missing) {
      rowReported.add(t);
      report({ file: routerPath, line: row.line, message: `trigger "${t}" is in manifest.json for ${skill.name} but missing from the routing row`, fix: `add "${t}" to the routing row in ${routerPath}` });
    }
    for (const t of d.extra) {
      rowReported.add(t);
      report({ file: routerPath, line: row.line, message: `trigger "${t}" is in the routing row but not in manifest.json for ${skill.name}`, fix: `remove "${t}" from the routing row or add it to manifest.skills[].triggers` });
    }
    for (const t of rowTriggers) rowUnion.add(t);
  }

  // Union check: every manifest trigger appears in the table and vice versa.
  const manifestUnion = new Set();
  for (const s of manifest.skills) for (const t of lower(s.triggers)) manifestUnion.add(t);
  for (const t of [...manifestUnion].sort()) {
    if (!rowUnion.has(t) && !rowReported.has(t)) {
      report({ file: "manifest.json", message: `trigger "${t}" has no entry in the router routing table`, fix: `add "${t}" to the matching routing row in ${routerPath}` });
    }
  }
  for (const t of [...rowUnion].sort()) {
    if (!manifestUnion.has(t) && !rowReported.has(t)) {
      report({ file: routerPath, message: `routing-table trigger "${t}" is not declared by any manifest skill`, fix: `remove "${t}" from the routing table or declare it in manifest.skills[].triggers` });
    }
  }
});

rule("wiring", "Skills, workflows and tiers are wired together", (model, report) => {
  const { manifest, store } = model;
  const workflowPaths = new Set(manifest.workflows.map((w) => w.path));
  const maxTier = manifest.skills.length - 1;

  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    if (skill.domain === "router") {
      if (skill.workflow !== null) {
        report({ file: "manifest.json", message: `router skill "${skill.name}" must have workflow: null`, fix: "set the router's workflow to null" });
      }
    } else if (!skill.workflow) {
      report({ file: "manifest.json", message: `skill "${skill.name}" has no workflow`, fix: "point the skill at one of the manifest workflows" });
    } else if (!workflowPaths.has(skill.workflow)) {
      report({ file: "manifest.json", message: `skill "${skill.name}" points at workflow "${skill.workflow}" which is not in manifest.workflows`, fix: "add the workflow to manifest.workflows or fix the path" });
    }

    if (!Number.isInteger(skill.tier) || skill.tier < 0 || skill.tier > maxTier) {
      report({ file: "manifest.json", message: `skill "${skill.name}" has tier ${skill.tier}; allowed tiers are 0-${maxTier}`, fix: `use an integer tier between 0 and ${maxTier}` });
    }

    const text = store.get(skill.path);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    if (!fm.ok) continue;
    const fmTier = Number(unquote(fm.nested.metadata?.tier));
    if (fm.nested.metadata?.tier != null && Number.isFinite(fmTier) && fmTier !== skill.tier) {
      report({ file: skill.path, line: fm.keyLines["metadata.tier"], message: `tier ${fmTier} != manifest tier ${skill.tier}`, fix: `set metadata.tier to ${skill.tier}` });
    }
  }

  // No orphan workflows: every workflow must be owned by at least one skill.
  const owned = new Set(manifest.skills.map((s) => s.workflow).filter(Boolean));
  for (const w of manifest.workflows) {
    if (!owned.has(w.path)) {
      report({ file: "manifest.json", message: `workflow "${w.path}" is not owned by any skill`, fix: "attach the workflow to a skill or remove it from manifest.workflows" });
    }
  }

  // Every SKILL.md on disk must be listed in manifest.skills.
  const listed = new Set(manifest.skills.map((s) => s.path));
  for (const p of store.list()) {
    if (/^skills\/[^/]+\/SKILL\.md$/.test(p) && !listed.has(p)) {
      report({ file: p, message: "skill file is not listed in manifest.skills", fix: "add the skill entry to manifest.skills" });
    }
  }
});

rule("budgets", "Per-file and total byte budgets are respected", (model, report) => {
  const { manifest, store } = model;
  const b = model.budgets;
  let totalCoreBytes = 0;
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = store.get(skill.path);
    if (text == null) continue;
    const isRouter = skill.domain === "router";
    const budget = isRouter ? b.router : b.skill;
    const lineCount = lines(text);
    const byteCount = bytes(text);
    if (lineCount > budget.lines) {
      report({ file: skill.path, message: `${lineCount} lines > budget ${budget.lines}`, fix: `trim ${skill.path} to ${budget.lines} lines` });
    }
    if (byteCount > budget.bytes) {
      report({ file: skill.path, message: `${byteCount} bytes > budget ${budget.bytes}`, fix: `trim ${skill.path} to ${budget.bytes} bytes` });
    }
    totalCoreBytes += byteCount;

    // The skill declares its own budget in the frontmatter. Two copies of the
    // same number must never disagree, so the declared budget is compared with
    // the enforced one.
    const fm = parseFrontmatter(text);
    if (fm.ok) {
      const declared = fm.nested.metadata?.budget;
      if (declared) {
        const m = String(declared).match(/lines:\s*(\d+)/);
        const n = String(declared).match(/bytes:\s*(\d+)/);
        const dl = m ? Number(m[1]) : null;
        const db = n ? Number(n[1]) : null;
        if (dl !== null && dl !== budget.lines) {
          report({ file: skill.path, line: fm.keyLines["metadata"], message: `metadata.budget declares ${dl} lines but the manifest enforces ${budget.lines}`, fix: `set \`budget: { lines: ${budget.lines}, bytes: ${budget.bytes} }\` in the frontmatter` });
        }
        if (db !== null && db !== budget.bytes) {
          report({ file: skill.path, line: fm.keyLines["metadata"], message: `metadata.budget declares ${db} bytes but the manifest enforces ${budget.bytes}`, fix: `set \`budget: { lines: ${budget.lines}, bytes: ${budget.bytes} }\` in the frontmatter` });
        }
      }
    }
  }
  if (totalCoreBytes > b.totalCoreBytes) {
    report({ file: "manifest.json", message: `total core bytes ${totalCoreBytes} > budget ${b.totalCoreBytes}`, fix: "shorten the skill files or raise budgets.totalCoreBytes" });
  }

  const budgetFor = (p) => {
    if (p.startsWith("workflows/")) return b.workflow;
    if (p.startsWith("doctrine/")) return b.doctrine;
    if (p.startsWith("references/")) return b.reference;
    return null;
  };
  for (const entry of [...manifest.workflows, ...manifest.doctrine, ...manifest.references]) {
    if (!entry || typeof entry.path !== "string") continue;
    const text = store.get(entry.path);
    if (text == null) continue;
    const budget = budgetFor(entry.path);
    if (!budget) continue;
    if (lines(text) > budget.lines) {
      report({ file: entry.path, message: `${lines(text)} lines > budget ${budget.lines}`, fix: `trim ${entry.path} to ${budget.lines} lines` });
    }
    if (bytes(text) > budget.bytes) {
      report({ file: entry.path, message: `${bytes(text)} bytes > budget ${budget.bytes}`, fix: `trim ${entry.path} to ${budget.bytes} bytes` });
    }
  }
});

rule("links", "Every relative link resolves", (model, report) => {
  const { store } = model;
  for (const p of store.list()) {
    if (extname(p).toLowerCase() !== ".md") continue;
    const text = store.get(p);
    const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
    let m;
    while ((m = linkRe.exec(text)) !== null) {
      let target = m[1];
      if (/^(https?:|mailto:|tel:|#)/i.test(target)) continue;
      target = target.split("#")[0];
      if (target === "") continue;
      const resolved = resolveRel(p, target);
      if (resolved.startsWith("..")) continue; // outside the repository
      if (!store.has(resolved)) {
        report({ file: p, message: `broken link -> ${target}`, fix: `fix the link or add ${resolved} to the repository` });
      }
    }
  }
});

rule("no-restatement", "Guidance is stated once across operational files", (model, report) => {
  const OPERATIONAL = ["skills/", "workflows/", "doctrine/", "references/"];
  const seen = new Map();
  for (const p of model.store.list()) {
    if (!OPERATIONAL.some((x) => p.startsWith(x))) continue;
    const text = model.store.get(p);
    let inFence = false;
    let lineNo = 0;
    for (const raw of text.split("\n")) {
      lineNo++;
      if (/^\s*```/.test(raw)) { inFence = !inFence; continue; }
      if (inFence) continue;
      const line = raw.trim();
      if (line.startsWith("|")) continue; // tables
      if (line.includes("summary:ok")) continue;
      if (line.length < 80) continue;
      const key = line.toLowerCase().replace(/^[-*>#\s]+/, "").replace(/\s+/g, " ").trim();
      if (seen.has(key)) {
        const prev = seen.get(key);
        report({ file: p, message: `duplicated guidance (also at ${prev.file}:${prev.line})`, fix: "keep the statement in one place and link to it" });
      } else {
        seen.set(key, { file: p, line: lineNo });
      }
    }
  }
});

rule("safety", "No GUI-click instructions and no placeholder text", (model, report) => {
  const SCAN = ["skills/", "workflows/", "doctrine/", "references/"];
  for (const p of model.store.list()) {
    if (!SCAN.some((x) => p.startsWith(x))) continue;
    const text = model.store.get(p);
    let lineNo = 0;
    for (const raw of text.split("\n")) {
      lineNo++;
      if (/\bclick (the|on|this|a)\b/i.test(raw)) {
        report({ file: p, line: lineNo, message: `GUI-click instruction: ${raw.trim().slice(0, 80)}`, fix: "describe a CLI, editor-eval or file-edit step" });
      }
      if (PLACEHOLDER_MARKER_RE.test(raw) && !raw.includes("example")) {
        report({ file: p, line: lineNo, message: "placeholder text", fix: "replace the placeholder with the real content" });
      }
    }
  }
});

rule("secrets", "No credential material is committed", (model, report) => {
  const SCAN_EXT = new Set([".md", ".mjs", ".json", ".yml", ".yaml"]);
  for (const p of model.store.list()) {
    if (!SCAN_EXT.has(extname(p).toLowerCase())) continue;
    const text = model.store.get(p);
    const textLines = text.split("\n");
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      const prev = i > 0 ? textLines[i - 1] : undefined;
      if (isAllowlisted(line, prev)) continue; // documented allowlist marker
      const lineNo = i + 1;
      for (const pat of CRED_PATTERNS) {
        pat.re.lastIndex = 0;
        let m;
        while ((m = pat.re.exec(line)) !== null) {
          if (m[0].length === 0) { pat.re.lastIndex++; continue; } // never loop on an empty match
          const value = pat.id === "credential-assignment" ? m[4] : m[0];
          if (PLACEHOLDER_VALUE.test(value)) continue;
          report({
            file: p,
            line: lineNo,
            message: `possible secret (${pat.id}): ${redact(value)}`,
            fix: `remove the credential and use an environment variable; if this is a documented placeholder add "${ALLOW_MARKER} reason -->"`,
          });
        }
      }
      ENTROPY_ASSIGNMENT.lastIndex = 0;
      let e;
      while ((e = ENTROPY_ASSIGNMENT.exec(line)) !== null) {
        if (e[0].length === 0) { ENTROPY_ASSIGNMENT.lastIndex++; continue; }
        const value = e[4];
        if (PLACEHOLDER_VALUE.test(value)) continue;
        if (/\s/.test(value)) continue; // prose, not an opaque blob
        if (entropy(value) < 3.2) continue;
        if (charClasses(value) < 3) continue;
        report({
          file: p,
          line: lineNo,
          message: `high-entropy value assigned to "${e[2]}": ${redact(value)}`,
          fix: `remove the credential and use an environment variable; if this is a documented placeholder add "${ALLOW_MARKER} reason -->"`,
        });
      }
    }
  }
});

rule("workflow-gates", "Every workflow has a `## Done when` gate", (model, report) => {
  for (const w of model.manifest.workflows) {
    if (!w || typeof w.path !== "string") continue;
    const text = model.store.get(w.path);
    if (text == null) continue;
    if (!/## Done when/.test(text)) {
      report({ file: w.path, message: 'missing "## Done when" gate', fix: "add a `## Done when` section listing the observable proof" });
    }
  }
});

// ---------------------------------------------------------------- model

function buildModel(store, manifest) {
  return { store, manifest, budgets: manifest.budgets };
}

function runChecks(model) {
  const findings = [];
  for (const r of RULES) {
    const bucket = [];
    r.run(model, (f) => bucket.push(f));
    findings.push({ rule: r.id, title: r.title, problems: bucket });
  }
  return findings;
}

// Deterministic ordering: rule order as declared, then file, line, message.
function sortProblems(problems) {
  return problems.slice().sort((a, b) => {
    const af = a.file || "";
    const bf = b.file || "";
    if (af !== bf) return af < bf ? -1 : 1;
    const al = a.line == null ? -1 : a.line;
    const bl = b.line == null ? -1 : b.line;
    if (al !== bl) return al - bl;
    return String(a.message) < String(b.message) ? -1 : String(a.message) > String(b.message) ? 1 : 0;
  });
}

// ---------------------------------------------------------------- reporting

function summarize(model) {
  const { manifest, budgets } = model;
  let coreBytes = 0;
  let triggers = 0;
  const seen = new Set();
  let collisions = 0;
  for (const skill of manifest.skills) {
    if (!skill || typeof skill.path !== "string") continue;
    const text = model.store.get(skill.path);
    if (text == null) continue;
    coreBytes += bytes(text);
    if (skill.domain === "router") continue;
    for (const t of lower(skill.triggers)) {
      if (seen.has(t)) collisions++;
      else { seen.add(t); triggers++; }
    }
  }
  return {
    skills: manifest.skills.length,
    maxSkills: budgets.maxSkills,
    workflows: manifest.workflows.length,
    maxWorkflows: budgets.maxWorkflows,
    coreBytes,
    totalCoreBytes: budgets.totalCoreBytes,
    triggers,
    collisions,
  };
}

function formatProblem(p) {
  const where = p.line == null ? p.file : `${p.file}:${p.line}`;
  return `${where}: ${p.message} | fix: ${p.fix}`;
}

function printHuman(report) {
  const s = report.summary;
  if (report.ok) {
    console.log("Unity Loom validation: PASS");
    console.log(`  skills:    ${s.skills} (max ${s.maxSkills})`);
    console.log(`  workflows: ${s.workflows} (max ${s.maxWorkflows})`);
    console.log(`  core bytes: ${s.coreBytes} / ${s.totalCoreBytes}`);
    console.log(`  triggers:  ${s.triggers} unique, ${s.collisions} collisions`);
    return;
  }
  console.error(`Unity Loom validation: FAIL (${report.problemCount} problem${report.problemCount === 1 ? "" : "s"})`);
  for (const rule of report.rules) {
    if (rule.count === 0) continue;
    console.error(`  [${rule.rule}] ${rule.count} problem${rule.count === 1 ? "" : "s"}`);
    for (const p of rule.problems.slice(0, MAX_PER_RULE)) {
      console.error(`    - ${formatProblem(p)}`);
    }
    if (rule.count > MAX_PER_RULE) {
      console.error(`    +${rule.count - MAX_PER_RULE} more`);
    }
  }
}

function printQuiet(report) {
  for (const rule of report.rules) {
    if (rule.count === 0) continue;
    for (const p of rule.problems.slice(0, MAX_PER_RULE)) {
      console.error(`- ${formatProblem(p)}`);
    }
    if (rule.count > MAX_PER_RULE) {
      console.error(`- +${rule.count - MAX_PER_RULE} more (${rule.rule})`);
    }
  }
}

function printJson(report) {
  const payload = {
    tool: "unity-loom-validate",
    ok: report.ok,
    exitCode: report.ok ? 0 : 1,
    summary: report.summary,
    problemCount: report.problemCount,
    ruleCount: report.rules.filter((r) => r.count > 0).length,
    rules: report.rules.map((r) => ({
      rule: r.rule,
      title: r.title,
      count: r.count,
      problems: r.problems.map((p) => ({
        file: p.file,
        line: p.line == null ? null : p.line,
        message: p.message,
        fix: p.fix,
      })),
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

// ---------------------------------------------------------------- self-test

// A complete, valid miniature repository used as the self-test baseline.
function goodFixture() {
  // Markdown links are assembled at run time so that link scanners reading this
  // source file do not see them as links to files that do not exist.
  const link = (label, target) => "[" + label + "]" + "(" + target + ")";
  const routerRow = link("alpha", "../alpha/SKILL.md") + " | " + link("alpha", "../../workflows/alpha.md");

  const routerText = [
    "---",
    "name: router",
    'description: "Router used by the validator self-test. It picks exactly one domain skill and its workflow."',
    "allowed-tools: Read, Grep",
    "metadata:",
    "  loom: 1",
    "  domain: router",
    "  tier: 0",
    '  triggers: ["unity"]',
    "  budget: { lines: 120, bytes: 6000 }",
    '  verified-against: ["Unity 6000.3 LTS"]',
    '  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/"]',
    "---",
    "",
    "# Router",
    "",
    "## Routing table",
    "",
    "| If the task mentions | Load | Workflow |",
    "|---|---|---|",
    "| alpha, a trigger | " + routerRow + " |",
    "",
  ].join("\n");

  const alphaText = [
    "---",
    "name: alpha",
    'description: "Alpha domain skill used by the validator self-test fixture. It is deliberately valid."',
    "allowed-tools: Read, Grep, Glob",
    "metadata:",
    "  loom: 1",
    "  domain: alpha",
    "  tier: 1",
    '  triggers: ["alpha", "a trigger"]',
    "  budget: { lines: 200, bytes: 8000 }",
    '  verified-against: ["Unity 6000.3 LTS"]',
    '  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/"]',
    "---",
    "",
    "# alpha",
    "",
    "Body text for the alpha domain skill.",
    "",
  ].join("\n");

  const workflowText = [
    "# alpha workflow",
    "",
    "## Done when",
    "",
    "- alpha check passes.",
    "",
  ].join("\n");

  const manifest = {
    name: "fixture",
    entry: "skills/router/SKILL.md",
    budgets: {
      router: { lines: 120, bytes: 6000 },
      skill: { lines: 200, bytes: 8000 },
      workflow: { lines: 250, bytes: 10000 },
      doctrine: { lines: 120, bytes: 5000 },
      reference: { lines: 300, bytes: 14000 },
      totalCoreBytes: 64000,
      maxSkills: 12,
      maxWorkflows: 10,
    },
    routerOnlyTriggers: ["unity"],
    bannedTriggers: ["vr"],
    skills: [
      { name: "router", path: "skills/router/SKILL.md", domain: "router", tier: 0, workflow: null, triggers: [] },
      { name: "alpha", path: "skills/alpha/SKILL.md", domain: "alpha", tier: 1, workflow: "workflows/alpha.md", triggers: ["alpha", "a trigger"] },
    ],
    workflows: [{ name: "alpha", path: "workflows/alpha.md", domains: ["alpha"] }],
    doctrine: [],
    references: [],
    docs: [],
    rootFiles: [],
    tooling: [],
  };

  const files = new Map([
    ["skills/router/SKILL.md", routerText],
    ["skills/alpha/SKILL.md", alphaText],
    ["workflows/alpha.md", workflowText],
  ]);
  return { manifest, files };
}

function fixtureModel(fx) {
  return buildModel(makeStore(fx.files), fx.manifest);
}

// Each case mutates a fresh copy of the good fixture and must make exactly the
// named rule fire.
const SELFTEST_CASES = [
  {
    rule: "manifest-integrity",
    what: "a manifest entry with no file on disk is detected",
    mutate: (fx) => fx.files.delete("workflows/alpha.md"),
  },
  {
    rule: "frontmatter",
    what: "a name that does not match the directory is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md").replace("name: alpha", "name: beta"));
    },
  },
  {
    rule: "frontmatter-portability",
    what: "an unknown top-level frontmatter key is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md").replace("allowed-tools:", "license: MIT\nallowed-tools:"));
    },
  },
  {
    rule: "frontmatter-portability",
    what: "a missing required metadata key is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md").replace('  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/"]\n', ""));
    },
  },
  {
    rule: "triggers",
    what: "a banned trigger is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md").replace('triggers: ["alpha", "a trigger"]', 'triggers: ["alpha", "vr"]'));
      fx.manifest.skills[1].triggers = ["alpha", "vr"];
    },
  },
  {
    rule: "trigger-drift",
    what: "a trigger missing from the frontmatter is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md").replace('triggers: ["alpha", "a trigger"]', 'triggers: ["alpha"]'));
    },
  },
  {
    rule: "trigger-drift",
    what: "a trigger missing from the router routing table is detected",
    mutate: (fx) => {
      fx.files.set("skills/router/SKILL.md", fx.files.get("skills/router/SKILL.md").replace("| alpha, a trigger |", "| alpha |"));
    },
  },
  {
    rule: "wiring",
    what: "a skill pointing at an unknown workflow is detected",
    mutate: (fx) => {
      fx.manifest.skills[1].workflow = "workflows/missing.md";
    },
  },
  {
    rule: "wiring",
    what: "an orphan workflow is detected",
    mutate: (fx) => {
      fx.manifest.workflows.push({ name: "orphan", path: "workflows/orphan.md", domains: ["alpha"] });
      fx.files.set("workflows/orphan.md", "# orphan\n\n## Done when\n\n- nothing.\n");
    },
  },
  {
    rule: "budgets",
    what: "a file over its line budget is detected",
    mutate: (fx) => {
      fx.manifest.budgets.skill.lines = 3;
    },
  },
  {
    rule: "links",
    what: "a broken relative link is detected",
    mutate: (fx) => {
      const brokenLink = "[" + "nope" + "]" + "(" + "./missing.md" + ")";
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + "\n" + brokenLink + "\n");
    },
  },
  {
    rule: "no-restatement",
    what: "the same guidance stated in two files is detected",
    mutate: (fx) => {
      const shared = "\nThis exact sentence is written twice so that the duplicate guidance rule has something to catch.\n";
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + shared);
      fx.files.set("skills/router/SKILL.md", fx.files.get("skills/router/SKILL.md") + shared);
    },
  },
  {
    rule: "safety",
    what: "a GUI-click instruction is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + "\nClick the button in the inspector.\n");
    },
  },
  {
    rule: "safety",
    what: "placeholder text is detected",
    mutate: (fx) => {
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + "\nTODO: write this section.\n");
    },
  },
  {
    rule: "secrets",
    what: "an AWS access key id is detected",
    mutate: (fx) => {
      const token = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + `\n${token}\n`);
    },
  },
  {
    rule: "secrets",
    what: "a credential assignment is detected",
    mutate: (fx) => {
      // The literal is assembled at run time so that this source file does not
      // contain something that looks like a credential.
      const value = ["s3cr3t", "value", "not", "a", "real", "key"].join("-");
      const line = "\n" + "api_key" + " = " + JSON.stringify(value) + "\n";
      fx.files.set("skills/alpha/SKILL.md", fx.files.get("skills/alpha/SKILL.md") + line);
    },
  },
  {
    rule: "workflow-gates",
    what: "a workflow without a Done when gate is detected",
    mutate: (fx) => {
      fx.files.set("workflows/alpha.md", "# alpha workflow\n\nNo gate here.\n");
    },
  },
];

function runSelfTest() {
  const results = [];
  let failed = 0;

  // The good fixture must be clean, otherwise every case below is meaningless.
  const good = goodFixture();
  const goodModel = fixtureModel(good);
  const goodFindings = runChecks(goodModel);
  const goodProblems = goodFindings.flatMap((r) => r.problems.map((p) => ({ rule: r.rule, ...p })));
  if (goodProblems.length > 0) {
    failed++;
    results.push({
      rule: "baseline",
      ok: false,
      what: "the known-good fixture produces no findings",
      detail: goodProblems.map((p) => `${p.rule} ${p.file}: ${p.message}`).join("; "),
    });
  } else {
    results.push({ rule: "baseline", ok: true, what: "the known-good fixture produces no findings", detail: "" });
  }

  for (const c of SELFTEST_CASES) {
    const fx = goodFixture();
    c.mutate(fx);
    const model = fixtureModel(fx);
    const findings = runChecks(model);
    const target = findings.find((r) => r.rule === c.rule);
    const count = target ? target.problems.length : 0;
    const ok = count > 0;
    if (!ok) failed++;
    results.push({ rule: c.rule, ok, what: c.what, detail: ok ? "" : "the rule did not fire" });
  }

  console.log("Unity Loom validator self-test");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.rule.padEnd(24)} ${r.what}${r.detail ? ` (${r.detail})` : ""}`);
  }
  const passed = results.length - failed;
  console.log(`self-test: ${passed}/${results.length} cases passed`);
  return failed === 0;
}

// ---------------------------------------------------------------- main

function main() {
  parseArgs(process.argv.slice(2));

  if (FLAGS.help) {
    console.log(USAGE);
    process.exit(0);
  }

  if (FLAGS.selftest) {
    const ok = runSelfTest();
    process.exit(ok ? 0 : 1);
  }

  const manifestPath = join(ROOT, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("FATAL: manifest.json not found");
    process.exit(1);
  }
  let manifest;
  try {
    manifest = JSON.parse(read(manifestPath));
  } catch (err) {
    console.error(`FATAL: manifest.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  if (!manifest.budgets) {
    console.error("FATAL: manifest.json has no budgets block");
    process.exit(1);
  }
  for (const group of ["skills", "workflows"]) {
    if (!Array.isArray(manifest[group])) {
      console.error(`FATAL: manifest.json has no ${group} array`);
      process.exit(1);
    }
  }

  const model = buildModel(diskStore(), manifest);
  const findings = runChecks(model);
  const rules = findings.map((r) => ({ rule: r.rule, title: r.title, count: r.problems.length, problems: sortProblems(r.problems) }));
  const problemCount = rules.reduce((n, r) => n + r.count, 0);
  const report = { ok: problemCount === 0, summary: summarize(model), rules, problemCount };

  if (FLAGS.json) printJson(report);
  else if (FLAGS.quiet) { if (!report.ok) printQuiet(report); }
  else printHuman(report);

  process.exit(report.ok ? 0 : 1);
}

main();

#!/usr/bin/env node
// Unity Loom installer — zero dependencies, Node >= 20.
//
// Installs the skill catalogue and the shared corpus into any harness that
// follows the Agent Skills layout. The catalogue is read from manifest.json,
// so the installer cannot drift from the registry.
//
// Install layout, for a skills root D:
//   D/<skill-name>/SKILL.md   one directory per skill, filename exactly SKILL.md
//   D/loom-shared/             the shared corpus (workflows, doctrine, references,
//                              docs, the skills tree and the root documents)
//
// A skill body links to shared files with a repo-relative `../../` prefix. That
// prefix is wrong once the file sits in D/<skill-name>/, so the installer
// rewrites `](../../` to `](../loom-shared/` in the installed SKILL.md copies
// only. Inside loom-shared the original links are already correct and are left
// untouched.
//
// Usage:
//   node tools/install.mjs plan    [--target <id>] [--scope user|project] [--skill <name>...]
//   node tools/install.mjs install [--target <id>] [--scope user|project] [--dest <dir>]
//                                 [--skill <name>...] [--dry-run] [--link] [--all-targets]
//   node tools/install.mjs manifest [--pretty]
//   node tools/install.mjs verify  [--target <id>] [--scope user|project] [--dest <dir>]
//   node tools/install.mjs doctor  [--target <id>] [--scope user|project] [--dest <dir>]
//
// Exit codes: 0 ok, 1 usage, install or verification failure.

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, symlinkSync,
  lstatSync, readdirSync, copyFileSync, unlinkSync, realpathSync,
} from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

// The shared corpus: directories and root files copied into D/loom-shared/.
// The root files are derived from manifest.json → rootFiles, so the corpus
// can never drift from the catalogue: a new root file is picked up
// automatically, and the installer's own link check proves that every link
// in the installed copy still resolves.
const SHARED_NAME = "loom-shared";
const SHARED_DIRS = ["skills", "workflows", "doctrine", "references", "docs", ".github"];
const SHARED_TOOLS = "tools";
const EXCLUDE_DIRS = new Set([".git", "node_modules", "artifacts", "dist"]);
const SKILL_FILENAME = "SKILL.md";

// Every harness the installer knows. `user` is the user-level skills root,
// `project` the project-level one, `probe` the directory that proves the
// harness is installed on this machine, and `note` the activation hint printed
// after an install.
const HOME = homedir();
const TARGETS = {
  claude: {
    label: "Claude Code",
    user: () => join(HOME, ".claude", "skills"),
    project: () => join(process.cwd(), ".claude", "skills"),
    probe: () => join(HOME, ".claude"),
    note: "Claude Code picks up new top-level skill directories after `/reload-skills`; it ignores the reserved directory names `synced` and `anthropic-skills`.",
  },
  codex: {
    label: "OpenAI Codex CLI",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".codex"),
    note: "Codex needs `[features] skills = true` in ~/.codex/config.toml, otherwise skills do not load at all.",
  },
  antigravity: {
    label: "Google Antigravity",
    user: () => join(HOME, ".gemini", "config", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".gemini"),
    note: "Antigravity reads `~/.gemini/config/skills`; restart the editor so the skills index is rebuilt.",
  },
  grok: {
    label: "Grok Build",
    user: () => join(HOME, ".grok", "skills"),
    project: () => join(process.cwd(), ".grok", "skills"),
    probe: () => join(HOME, ".grok"),
    note: "Grok Build reads `~/.grok/skills`; the shared corpus is reached through the rewritten links, not as a skill of its own.",
  },
  cursor: {
    label: "Cursor",
    user: () => join(HOME, ".cursor", "skills"),
    project: () => join(process.cwd(), ".cursor", "skills"),
    probe: () => join(HOME, ".cursor"),
    note: "Cursor reads `~/.cursor/skills`; it indexes skills at session start, so reopen the project after installing.",
  },
  opencode: {
    label: "opencode",
    user: () => join(HOME, ".config", "opencode", "skills"),
    project: () => join(process.cwd(), ".opencode", "skills"),
    probe: () => join(HOME, ".config", "opencode"),
    note: "opencode reads `~/.config/opencode/skills` and `.opencode/skills`; `name` and `description` are required.",
  },
  openrouter: {
    label: "OpenRouter",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".agents"),
    note: "OpenRouter ships no skills loader; point your own loader at the installed directory (their reference implementation reads `~/.claude/skills`).",
  },
  hermes: {
    label: "Hermes",
    user: () => join(HOME, ".hermes", "skills"),
    project: () => join(process.cwd(), ".hermes", "skills"),
    probe: () => join(HOME, ".hermes"),
    note: "Hermes reads `~/.hermes/skills`; add `~/.agents/skills` to `skills.external_dirs` in ~/.hermes/config.yaml to pick up the shared dir.",
  },
  zai: {
    label: "Z.AI ZCode",
    user: () => join(HOME, ".zcode", "skills"),
    project: () => join(process.cwd(), ".zcode", "skills"),
    probe: () => join(HOME, ".zcode"),
    note: "ZCode silently drops a skill whose `description` is missing or longer than 1024 characters.",
  },
  kimi: {
    label: "Kimi Code",
    user: () => join(HOME, ".config", "agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".config", "agents"),
    note: "Kimi merges every brand directory; `~/.agents/skills` and `.agents/skills` are the interop path.",
  },
  gemini: {
    label: "Gemini CLI",
    user: () => join(HOME, ".gemini", "skills"),
    project: () => join(process.cwd(), ".gemini", "skills"),
    probe: () => join(HOME, ".gemini"),
    note: "Gemini CLI reads `~/.gemini/skills`; it discovers skills at startup, so restart the CLI after installing.",
  },
  windsurf: {
    label: "Windsurf",
    user: () => join(HOME, ".codeium", "windsurf", "skills"),
    project: () => join(process.cwd(), ".windsurf", "skills"),
    probe: () => join(HOME, ".codeium", "windsurf"),
    note: "Windsurf reads `~/.codeium/windsurf/skills`; reload the Cascade panel so the new skills are indexed.",
  },
  copilot: {
    label: "GitHub Copilot",
    user: () => join(HOME, ".copilot", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".copilot"),
    note: "Copilot reads `~/.copilot/skills`; the extension rescans the skills root when the window reloads.",
  },
  amp: {
    label: "Amp",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".agents"),
    note: "Amp reads `~/.agents/skills`; restart the CLI so the skill index is rebuilt.",
  },
  zed: {
    label: "Zed",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".config", "zed"),
    note: "Zed only scans a flat skills root; do not nest skill directories.",
  },
  goose: {
    label: "Goose",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".config", "goose"),
    note: "Goose reads `~/.agents/skills` through its extensions; start a new session so the recipe list refreshes.",
  },
  cline: {
    label: "Cline",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".cline"),
    note: "Cline reads `~/.agents/skills` when the extension activates; reload the editor window after installing.",
  },
  kilo: {
    label: "Kilo Code",
    user: () => join(HOME, ".kilocode", "skills"),
    project: () => join(process.cwd(), ".kilocode", "skills"),
    probe: () => join(HOME, ".kilocode"),
    note: "Kilo Code reads `~/.kilocode/skills`; reload the editor window so the skills index refreshes.",
  },
  junie: {
    label: "JetBrains Junie",
    user: () => join(HOME, ".junie", "skills"),
    project: () => join(process.cwd(), ".junie", "skills"),
    probe: () => join(HOME, ".junie"),
    note: "Junie reads `~/.junie/skills`; start a new chat so the skill catalogue is rebuilt.",
  },
  trae: {
    label: "Trae",
    user: () => join(HOME, ".trae", "skills"),
    project: () => join(process.cwd(), ".trae", "skills"),
    probe: () => join(HOME, ".trae"),
    note: "Trae reads `~/.trae/skills`; restart Trae so the skills are indexed.",
  },
  qoder: {
    label: "Qoder",
    user: () => join(HOME, ".qoder", "skills"),
    project: () => join(process.cwd(), ".qoder", "skills"),
    probe: () => join(HOME, ".qoder"),
    note: "Qoder reads `~/.qoder/skills`; reload the workspace so the skills index refreshes.",
  },
  droid: {
    label: "Factory Droid",
    user: () => join(HOME, ".factory", "skills"),
    project: () => join(process.cwd(), ".factory", "skills"),
    probe: () => join(HOME, ".factory"),
    note: "Droid reads `~/.factory/skills`; start a new session so the skills catalogue is rebuilt.",
  },
  agents: {
    label: "Generic Agent Skills",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(HOME, ".agents"),
    note: "The Agent Skills layout is shared by many harnesses; point your loader at the directory and restart it.",
  },
  project: {
    label: "Project-local",
    user: () => join(HOME, ".agents", "skills"),
    project: () => join(process.cwd(), ".agents", "skills"),
    probe: () => join(process.cwd(), ".agents"),
    note: "Project-local skills live in the working directory; commit or ignore `.agents/skills` as your team prefers.",
  },
};

// The `all` id is not a harness: it means every detected user-level destination.
const ALL_ID = "all";
const ALL_IDS = [...Object.keys(TARGETS), ALL_ID];

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const flags = (name) =>
  args.reduce((acc, a, i) => (a === `--${name}` ? [...acc, args[i + 1]] : acc), []);

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

// ----------------------------------------------------------------- helpers

function fail(message, hint = "") {
  console.error(message);
  if (hint) console.error(hint);
  process.exit(1);
}

function selectedSkills() {
  const want = flags("skill");
  if (!want.length) return manifest.skills;
  const picked = [];
  for (const name of want) {
    const s = manifest.skills.find((x) => x.name === name);
    if (!s) {
      console.error(`unknown skill: ${name}`);
      console.error(`known: ${manifest.skills.map((x) => x.name).join(", ")}`);
      process.exit(1);
    }
    picked.push(s);
  }
  return picked;
}

function scopeFor(targetId) {
  const raw = flag("scope");
  if (raw === undefined || raw === true) {
    // `project` defaults to the project scope so that the historical
    // `install --target project` behaviour is unchanged.
    return targetId === "project" ? "project" : "user";
  }
  if (raw !== "user" && raw !== "project") {
    fail(`unknown scope: ${raw}`, "known scopes: user, project");
  }
  return raw;
}

function targetId() {
  const t = flag("target", "agents");
  if (t === true) fail("--target needs a value", `known targets: ${ALL_IDS.join(", ")}`);
  return t;
}

function targetDef(id) {
  if (id === ALL_ID) {
    fail(`--target ${ALL_ID} is only valid for the install command`, "use a single target id, or --dest <dir>");
  }
  const def = TARGETS[id];
  if (!def) {
    fail(`unknown target: ${id}`, `known targets: ${ALL_IDS.join(", ")} — or pass --dest <dir>`);
  }
  return def;
}

// The destination of the current invocation: an explicit --dest wins, then the
// target table, then the scope switch.
function targetDir() {
  const explicit = flag("dest");
  if (explicit && explicit !== true) return resolve(explicit);
  const id = targetId();
  const def = targetDef(id);
  const scope = scopeFor(id);
  return scope === "project" ? def.project() : def.user();
}

// The manifest points at the SKILL.md file; the installable unit is its directory.
const skillDir = (skillPath) => dirname(join(ROOT, skillPath));

// Relative paths of every file below `dir`, sorted, POSIX style.
function walkRel(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      out.push(...walkRel(join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out.sort();
}

// Every symlink below `dir`, as repo-relative paths. Used to prove that the
// verification never follows a link out of the destination.
function walkLinks(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) out.push({ rel, full });
    else if (entry.isDirectory()) out.push(...walkLinks(full, rel));
  }
  return out;
}

// The shared corpus as a list of { rel, src } entries, relative to the
// repository root and to D/loom-shared/ respectively.
function sharedPlan() {
  const plan = [];
  for (const dir of [...SHARED_DIRS, SHARED_TOOLS]) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const rel of walkRel(abs)) plan.push({ rel: `${dir}/${rel}`, src: join(abs, rel) });
  }
  for (const file of manifest.rootFiles || []) {
    const abs = join(ROOT, file);
    if (existsSync(abs)) plan.push({ rel: file, src: abs });
  }
  return plan;
}

// A repo-relative `../../` link is wrong inside D/<skill>/. Point it at the
// shared corpus instead. This runs on the installed skill copies only.
function rewriteSharedLinks(text) {
  return text.split("](../../").join("](../loom-shared/");
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Remove a file, a directory or a link without ever following it.
function removePath(path) {
  if (!existsSync(path)) return;
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return;
  }
  if (st.isSymbolicLink()) {
    try {
      unlinkSync(path);
      return;
    } catch {
      /* fall through to the recursive removal */
    }
  }
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    rmSync(path, { force: true });
  }
}

// Every write stays inside the destination.
function inside(dest, path) {
  const rel = relative(dest, path);
  return rel === "" || !rel.startsWith("..");
}

function ensureInside(dest, path) {
  if (!inside(dest, path)) fail(`refusing to write outside the destination: ${path}`);
}

function symlinkType() {
  return process.platform === "win32" ? "junction" : "dir";
}

// ----------------------------------------------------------------- commands

function plan() {
  const skills = selectedSkills();
  const id = targetId();
  if (id === ALL_ID) {
    const found = detectedTargets();
    console.log("Unity Loom — install plan");
    console.log(`  manifest:  ${relative(process.cwd(), join(ROOT, "manifest.json")) || "manifest.json"} (v${manifest.version})`);
    console.log(`  target:    ${ALL_ID} (every detected harness)`);
    console.log(`  detected:  ${found.length ? found.map((f) => f.id).join(", ") : "none"}`);
    for (const f of found) console.log(`    - ${f.id}: ${f.dest}`);
    console.log(`  skills:    ${skills.length} of ${manifest.skills.length}`);
    console.log(`\nRun: node tools/install.mjs install --all-targets`);
    return;
  }
  const def = TARGETS[id] ? TARGETS[id] : null;
  const scope = scopeFor(id);
  const dest = targetDir();
  const shared = sharedPlan();
  console.log("Unity Loom — install plan");
  const custom = flag("dest") && flag("dest") !== true;
  console.log(`  manifest:  ${relative(process.cwd(), join(ROOT, "manifest.json")) || "manifest.json"} (v${manifest.version})`);
  console.log(`  target:    ${custom ? "custom (--dest)" : id}${def ? ` (${def.label})` : ""}`);
  console.log(`  scope:     ${scope}`);
  console.log(`  destination: ${dest}`);
  console.log(`  skills:    ${skills.length} of ${manifest.skills.length}`);
  for (const s of skills) console.log(`    - ${s.name}  <-  ${s.path}`);
  console.log(`  shared:    ${shared.length} file(s) -> ${join(dest, SHARED_NAME)}`);
  console.log(`\nRun: node tools/install.mjs install --target ${id}`);
}

function copySkillDir(srcDir, destDir, destRoot) {
  for (const rel of walkRel(srcDir)) {
    const out = join(destDir, rel);
    ensureInside(destRoot, out);
    mkdirSync(dirname(out), { recursive: true });
    const src = join(srcDir, rel);
    if (basename(rel).toLowerCase() === SKILL_FILENAME.toLowerCase()) {
      writeFileSync(out, rewriteSharedLinks(readFileSync(src, "utf8")));
    } else {
      copyFileSync(src, out);
    }
  }
}

// Install one skill directory into the destination.
function installSkill(dest, skill, opts) {
  const srcDir = skillDir(skill.path);
  const target = join(dest, skill.name);
  ensureInside(dest, target);
  if (opts.dry) {
    const files = walkRel(srcDir);
    for (const rel of files) console.log(`[dry-run] ${relative(process.cwd(), join(target, rel))}`);
    return files.length;
  }
  removePath(target);
  if (opts.link) {
    try {
      symlinkSync(srcDir, target, symlinkType());
      console.log(`linked  ${skill.name} -> ${skill.path}`);
      return 1;
    } catch {
      copySkillDir(srcDir, target, dest);
      console.log(`copied  ${skill.name} (symlink unavailable on this machine)`);
      return walkRel(srcDir).length;
    }
  }
  copySkillDir(srcDir, target, dest);
  console.log(`copied  ${skill.name}  (${walkRel(srcDir).length} file(s))`);
  return walkRel(srcDir).length;
}

// Install the shared corpus into D/loom-shared/. The corpus is always copied,
// never linked, so that the installed tree matches the checkout.
function installShared(dest, opts) {
  const root = join(dest, SHARED_NAME);
  ensureInside(dest, root);
  const plan = sharedPlan();
  if (opts.dry) {
    for (const f of plan) console.log(`[dry-run] ${relative(process.cwd(), join(root, f.rel))}`);
    return plan.length;
  }
  removePath(root);
  for (const f of plan) {
    const out = join(root, f.rel);
    ensureInside(dest, out);
    mkdirSync(dirname(out), { recursive: true });
    copyFileSync(f.src, out);
  }
  console.log(`copied  ${SHARED_NAME}  (${plan.length} file(s))`);
  return plan.length;
}

function installInto(dest, skills, opts) {
  if (!opts.dry) mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const s of skills) count += installSkill(dest, s, opts);
  count += installShared(dest, opts);
  if (!opts.dry) {
    console.log(`\nInstalled ${skills.length} skill(s) and ${sharedPlan().length} shared file(s) into ${dest}`);
    if (opts.link) {
      console.log("Note: a linked skill keeps the repository file, so its `../../` links resolve against the checkout.");
      console.log("      The shared corpus is always copied. Use the default copy mode when the harness resolves links from the install path.");
    }
  }
  return count;
}

function printActivation(id, def) {
  if (!def) {
    console.log("\nActivation: point your harness at the destination above and restart it so the skills index is rebuilt.");
    return;
  }
  console.log(`\nActivation (${def.label}): ${def.note}`);
}
// Harnesses whose probe directory exists on this machine. A harness that is
// not installed is never given a directory.
function detectedTargets() {
  const found = [];
  for (const [id, def] of Object.entries(TARGETS)) {
    if (id === "project") continue; // a scope, not a harness
    const probe = def.probe();
    if (existsSync(probe)) found.push({ id, def, dest: def.user(), probe });
  }
  return found;
}

function installAll(skills, opts) {
  const found = detectedTargets();
  const seen = new Map();
  for (const f of found) if (!seen.has(f.dest)) seen.set(f.dest, f);
  const skipped = Object.keys(TARGETS).filter((id) => id !== "project" && !found.some((f) => f.id === id));
  console.log("Unity Loom — install into every detected harness");
  console.log(`  detected: ${found.length ? found.map((f) => f.id).join(", ") : "none"}`);
  console.log(`  skipped:  ${skipped.length ? skipped.join(", ") : "none"}`);
  console.log(`  destinations: ${seen.size}`);
  for (const dest of seen.keys()) console.log(`    - ${dest}`);
  for (const f of found) {
    console.log(`\n--- ${f.id} (${f.def.label}) ---`);
    installInto(f.dest, skills, opts);
    printActivation(f.id, f.def);
  }
  return found.length;
}

function install() {
  const opts = { dry: flag("dry-run") === true, link: flag("link") === true };
  const skills = selectedSkills();
  const id = targetId();
  if (flag("all-targets") === true || id === ALL_ID) {
    if (flag("dest")) fail("--dest and --all-targets cannot be combined", "pick one destination");
    installAll(skills, opts);
    return;
  }
  const dest = targetDir();
  installInto(dest, skills, opts);
  const custom = flag("dest") && flag("dest") !== true;
  printActivation(custom ? "custom" : id, custom ? null : TARGETS[id]);
}

// The generated plugin manifest: one catalogue, no per-client hand-maintained
// files. Harness-specific layouts differ, so this is printed rather than
// written to a guessed path.
function printManifest() {
  const doc = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    entry: manifest.entry,
    spec: manifest.spec,
    skills: manifest.skills.map((s) => ({
      name: s.name,
      path: s.path,
      domain: s.domain,
      workflow: s.workflow,
      triggers: s.triggers,
    })),
  };
  console.log(JSON.stringify(doc, null, flag("pretty") ? 2 : 0));
}

// Compare the installed skills and the installed shared corpus with the
// repository. A link that points out of the destination is never followed.
function verify() {
  const dest = targetDir();
  const skills = selectedSkills();
  let bad = 0;
  let skillBad = 0;
  for (const s of skills) {
    const target = join(dest, s.name);
    if (!existsSync(target)) {
      console.error(`missing  ${s.name}  (${target})`);
      bad++;
      skillBad++;
      continue;
    }
    const src = join(skillDir(s.path), SKILL_FILENAME);
    const dst = join(target, SKILL_FILENAME);
    if (!existsSync(dst)) {
      console.error(`missing  ${s.name}/${SKILL_FILENAME}`);
      bad++;
      skillBad++;
      continue;
    }
    const a = readFileSync(src, "utf8");
    const b = readFileSync(dst, "utf8");
    // A linked skill holds the repository file unchanged; a copied skill holds
    // the rewritten file. Both are correct, anything else is drift.
    if (b !== a && b !== rewriteSharedLinks(a)) {
      console.error(`stale    ${s.name}/${SKILL_FILENAME} differs from the repository copy`);
      bad++;
      skillBad++;
      continue;
    }
    console.log(`ok       ${s.name}`);
  }

  const root = join(dest, SHARED_NAME);
  const expected = sharedPlan();
  let sharedBad = 0;
  if (!existsSync(root)) {
    console.error(`missing  ${SHARED_NAME}/  (${root})`);
    sharedBad = expected.length;
  } else {
    for (const f of expected) {
      const out = join(root, f.rel);
      if (!existsSync(out)) {
        console.error(`missing  ${SHARED_NAME}/${f.rel}`);
        sharedBad++;
        continue;
      }
      if (hashFile(out) !== hashFile(f.src)) {
        console.error(`stale    ${SHARED_NAME}/${f.rel} differs from the repository copy`);
        sharedBad++;
      }
    }
    const known = new Set(expected.map((f) => f.rel));
    for (const rel of walkRel(root)) {
      if (!known.has(rel)) {
        console.error(`extra    ${SHARED_NAME}/${rel} is not part of the repository corpus`);
        sharedBad++;
      }
    }
    // A link that leaves the destination is never followed and never trusted.
    for (const link of walkLinks(root)) {
      let real = "";
      try {
        real = realpathSync(link.full);
      } catch {
        real = "";
      }
      if (!real || !inside(dest, real)) {
        console.error(`unsafe   ${SHARED_NAME}/${link.rel} points outside the destination`);
        sharedBad++;
      }
    }
    if (sharedBad === 0) console.log(`ok       ${SHARED_NAME} (${expected.length} file(s))`);
  }
  bad += sharedBad;

  if (bad) {
    console.error(`\n${bad} problem(s) out of sync with ${relative(process.cwd(), ROOT) || "the repository"}`);
    process.exit(1);
  }
  console.log(`\nAll ${skills.length} skill(s) and ${expected.length} shared file(s) match the repository.`);
}

// Report whether an installation is usable, and print the activation note.
function doctor() {
  const id = targetId();
  const def = TARGETS[id] ? TARGETS[id] : null;
  const dest = targetDir();
  const skills = selectedSkills();
  const problems = [];
  console.log("Unity Loom — doctor");
  const custom = flag("dest") && flag("dest") !== true;
  console.log(`  target:      ${custom ? "custom (--dest)" : `${id}${def ? ` (${def.label})` : ""}`}`);
  console.log(`  scope:       ${scopeFor(id)}`);
  console.log(`  destination: ${dest}`);
  const exists = existsSync(dest);
  console.log(`  destination exists: ${exists ? "yes" : "no"}`);
  if (!exists) problems.push("the destination directory does not exist");

  let present = 0;
  for (const s of skills) {
    const file = join(dest, s.name, SKILL_FILENAME);
    if (existsSync(file)) present++;
    else problems.push(`${s.name}/${SKILL_FILENAME} is missing`);
  }
  console.log(`  skills:      ${present}/${skills.length} ${SKILL_FILENAME} present`);

  const root = join(dest, SHARED_NAME);
  const expected = sharedPlan();
  let sharedPresent = 0;
  if (existsSync(root)) {
    for (const f of expected) if (existsSync(join(root, f.rel))) sharedPresent++;
    console.log(`  shared:      ${SHARED_NAME}/ present, ${sharedPresent}/${expected.length} file(s)`);
    if (sharedPresent < expected.length) problems.push(`${SHARED_NAME}/ is incomplete`);
  } else {
    console.log(`  shared:      ${SHARED_NAME}/ missing`);
    problems.push(`${SHARED_NAME}/ is missing`);
  }

  if (def) {
    console.log(`  activation:  ${def.note}`);
  } else {
    console.log("  activation:  point your harness at the destination above and restart it.");
  }

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\nThe installation looks usable.");
}

// ------------------------------------------------------------------- entry

switch (cmd) {
  case "plan":
    plan();
    break;
  case "install":
    install();
    break;
  case "manifest":
    printManifest();
    break;
  case "verify":
    verify();
    break;
  case "doctor":
    doctor();
    break;
  default:
    console.error(`Unity Loom installer

  node tools/install.mjs plan      [--target <id>] [--scope user|project] [--skill <name>...]
  node tools/install.mjs install   [--target <id>] [--scope user|project] [--dest <dir>] [--skill <name>...] [--dry-run] [--link] [--all-targets]
  node tools/install.mjs manifest  [--pretty]
  node tools/install.mjs verify    [--target <id>] [--scope user|project] [--dest <dir>]
  node tools/install.mjs doctor    [--target <id>] [--scope user|project] [--dest <dir>]

Targets: ${ALL_IDS.join(", ")}
Scope: user (default) or project. Use --dest <dir> for any other harness.
`);
    process.exit(cmd ? 1 : 0);
}

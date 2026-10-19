#!/usr/bin/env node
// Unity Loom installer — zero dependencies, Node >= 20.
//
// One install path for every harness (fixes F3: setup/install sprawl).
// The skill catalogue is never hand-written per client: it is read from
// manifest.json, so the installer cannot drift from the registry.
//
// Usage:
//   node tools/install.mjs plan   [--target <name>] [--skill <name>...]
//   node tools/install.mjs install [--target <name>] [--dest <dir>] [--skill <name>...] [--dry-run] [--link]
//   node tools/install.mjs manifest [--pretty]        # generated plugin manifest -> stdout
//   node tools/install.mjs verify  [--target <name>] [--dest <dir>]
//
// Targets: claude | agents | cursor | project | custom (use --dest)
// Exit codes: 0 ok, 1 usage/verification failure.

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync, symlinkSync, lstatSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

// Conventional skill directories. Only the widely documented ones carry a
// default; every other harness is used with an explicit --dest so that a
// wrong path can never silently create a stray folder.
const TARGETS = {
  claude: { label: "Claude Code", dest: () => join(homedir(), ".claude", "skills") },
  agents: { label: "Generic Agent Skills", dest: () => join(homedir(), ".agents", "skills") },
  cursor: { label: "Cursor", dest: () => join(homedir(), ".cursor", "skills") },
  project: { label: "Project-local", dest: () => join(process.cwd(), ".agents", "skills") },
};

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

function targetDir() {
  const explicit = flag("dest");
  if (explicit && explicit !== true) return resolve(explicit);
  const t = flag("target", "agents");
  if (t === true) {
    console.error("--target needs a value");
    process.exit(1);
  }
  const def = TARGETS[t];
  if (!def) {
    console.error(`unknown target: ${t}`);
    console.error(`known targets: ${Object.keys(TARGETS).join(", ")} — or pass --dest <dir>`);
    process.exit(1);
  }
  return def.dest();
}

// The manifest points at the SKILL.md file; the installable unit is its directory.
const skillDir = (skillPath) => dirname(join(ROOT, skillPath));

function skillFiles(skillPath) {
  const dir = skillDir(skillPath);
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

function plan() {
  const skills = selectedSkills();
  const t = flag("target", "agents");
  const def = TARGETS[t];
  console.log(`Unity Loom — install plan`);
  console.log(`  manifest:  ${relative(process.cwd(), join(ROOT, "manifest.json")) || "manifest.json"} (v${manifest.version})`);
  console.log(`  target:    ${t}${def ? ` (${def.label})` : ""}`);
  console.log(`  destination: ${targetDir()}`);
  console.log(`  skills:    ${skills.length} of ${manifest.skills.length}`);
  for (const s of skills) console.log(`    - ${s.name}  <-  ${s.path}`);
  console.log(`\nRun: node tools/install.mjs install --target ${t}`);
}

function install() {
  const dest = targetDir();
  const skills = selectedSkills();
  const dry = flag("dry-run") === true;
  const link = flag("link") === true;

  if (!dry) {
    mkdirSync(dest, { recursive: true });
  }
  for (const s of skills) {
    const target = join(dest, s.name);
    const files = skillFiles(s.path);
    if (dry) {
      console.log(`[dry-run] ${relative(process.cwd(), target)}/  (${files.length} file(s))`);
      continue;
    }
    if (link) {
      rmSync(target, { recursive: true, force: true });
      try {
        symlinkSync(skillDir(s.path), target, "junction");
        console.log(`linked  ${s.name} -> ${s.path}`);
      } catch {
        cpSync(skillDir(s.path), target, { recursive: true });
        console.log(`copied  ${s.name} (symlink unavailable)`);
      }
      continue;
    }
    rmSync(target, { recursive: true, force: true });
    cpSync(skillDir(s.path), target, { recursive: true });
    console.log(`copied  ${s.name}  (${files.length} file(s))`);
  }
  if (!dry) {
    console.log(`\nInstalled ${skills.length} skill(s) into ${dest}`);
    console.log(`Verify with: node tools/install.mjs verify --dest "${dest}"`);
  }
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

function verify() {
  const dest = targetDir();
  const skills = selectedSkills();
  let bad = 0;
  for (const s of skills) {
    const target = join(dest, s.name);
    if (!existsSync(target)) {
      console.error(`missing  ${s.name}  (${target})`);
      bad++;
      continue;
    }
    const src = join(skillDir(s.path), "SKILL.md");
    const dst = join(target, "SKILL.md");
    if (!existsSync(dst)) {
      console.error(`missing  ${s.name}/SKILL.md`);
      bad++;
      continue;
    }
    const a = readFileSync(src, "utf8");
    const b = readFileSync(dst, "utf8");
    if (a !== b) {
      console.error(`stale    ${s.name}/SKILL.md differs from the repository copy`);
      bad++;
      continue;
    }
    console.log(`ok       ${s.name}`);
  }
  if (bad) {
    console.error(`\n${bad} skill(s) out of sync with ${relative(process.cwd(), ROOT) || "the repository"}`);
    process.exit(1);
  }
  console.log(`\nAll ${skills.length} skill(s) match the repository.`);
}

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
  default:
    console.error(`Unity Loom installer

  node tools/install.mjs plan      [--target <name>] [--skill <name>...]
  node tools/install.mjs install   [--target <name>] [--dest <dir>] [--skill <name>...] [--dry-run] [--link]
  node tools/install.mjs manifest  [--pretty]
  node tools/install.mjs verify    [--target <name>] [--dest <dir>]

Targets: ${Object.keys(TARGETS).join(", ")}  (or pass --dest <dir> for any other harness)
`);
    process.exit(cmd ? 1 : 0);
}

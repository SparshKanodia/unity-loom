# Roadmap

Unity Loom exists to make one promise: **an agent can do most of the heavy
lifting in a Unity project on its own, correctly, and prove it did.** The
corpus today covers the parts of that job that are *decisions* — how to
structure a project, how to build the 2D, 3D, graphics, UI, XR, simulation and
performance work, how to ship it, and the doctrine that makes all of it
repeatable.

The next step is the part that is *generation*. Today an agent can tell you
how to build a character, and it can drive the Editor; it cannot yet say
"here is the voice-over, here is the 3D model, here is the music, here is the
icon", and then wire the result into the project without you. That is what
the MCP integrations are for.

The plan for that work is in
[docs/08-mcp-integration-plan.md](docs/08-mcp-integration-plan.md). This page
is the human-facing version: where the project is going, what each phase
delivers, and what it will not do.

## Where the project is

| Phase | State | Deliverable |
|---|---|---|
| **P0** | Shipped | Corpus, doctrine, router, ten skills, nine workflows, validator, CI |
| **P1** | Shipped | Claim registry, freshness gate, secret scanning, trigger-drift detection, one-command installer |
| **P2** | Shipped | Adapter guide (Unity CLI / editor bridge / device tooling) with a health check, a retry contract and a read-back contract |
| **P3** | Shipped | Community: issue templates, skill-proposal RFC, code of conduct, DCO, generated contributor roster |
| **P4** | Shipped | Security model, branch protection, rulesets, code scanning, dependency updates, release attestation |
| **P5** | Planned | **The generation layer**: MCP integrations for voice, 3D, image, sound and graphics, behind one skill and one workflow |

## P5 — The generation layer

The goal: one request in, a finished asset in the project, with the evidence
that it landed.

### What it will do

| Capability | Provider shape | Delivered as |
|---|---|---|
| Voice-over, dialogue, sound effects | ElevenLabs-style text-to-speech and audio MCP | `loom-media` skill + `workflows/media.md` |
| 3D models, textures, rigs | Meshy-style and other 3D generation MCPs | Same skill, one provider registry |
| Images, concept art, UI art | Image-generation MCPs and Hugging Face image spaces | Same skill, one provider registry |
| Sound, music, stingers | Sound-generation MCPs | Same skill, one provider registry |
| Import into the project | Unity MCP / editor bridge | The existing T2 adapter path, unchanged |

### How it will be built

| Principle | Consequence |
|---|---|
| MCP servers are **adapters**, never vendored code | A provider is a configuration entry and a capability description, not a dependency the corpus carries |
| Credentials come from the **environment**, never from a file in the repository | The validator's `secrets` rule keeps failing the build if that ever changes |
| Every generation step ends in a **read-back**: the file exists, the importer accepted it, the asset is in the project | A provider that returns a URL is not a result; an imported asset is |
| Every provider has a **fallback** | A missing key, a rate limit or an outage downgrades the tier, it does not fail the task |
| The provider list is **data**, in one reference file | Adding a provider is a row, not a new skill, so the corpus stays inside its budget |

### The phases

| Step | Deliverable | Exit criteria |
|---|---|---|
| **P5.0 — The contract** | `doctrine/08-generation.md` (the law for generated assets), `references/mcp-providers.md` (the provider registry) | The doctrine states the read-back contract, the credential rule and the fallback ladder; the registry names the first four providers and their env vars |
| **P5.1 — The skill** | `skills/loom-media/SKILL.md` + `workflows/media.md` | A request to "make a voice-over for this dialogue" routes to one workflow, and the workflow ends in a verified import |
| **P5.2 — The doctor** | `tools/mcp-doctor.mjs` | The doctor lists the configured providers, reports which are reachable and which key is missing, and never prints a secret |
| **P5.3 — ElevenLabs** | The first live provider, end to end | Text to a wav file, imported into the project, read back with a proof line |
| **P5.4 — 3D and image** | Meshy-style 3D generation and image generation | A prompt becomes a texture or a model that the importer accepts |
| **P5.5 — Hugging Face spaces** | Gradio/space-backed image and audio providers | A space is a provider entry like any other, with the same contract |
| **P5.6 — The full loop** | A request that needs voice, art, 3D and sound together | One request produces a set of assets, each with its own read-back, and the workflow reports which parts downgraded and why |

### The budget

The corpus is capped, and the generation layer fits inside the caps without
raising them:

| Limit | Now | After P5 | Cap |
|---|---|---|---|
| Skills | 10 | 11 | 12 |
| Workflows | 9 | 10 | 10 |
| References | 7 | 8 | 8 |

The workflow and reference counts land exactly on their caps, which is
deliberate: growth from here has to come from substitution, which is the
rule the repository has always had. If P5 needs a tenth workflow, one
existing workflow has to merge into another, in the same change.

## After P5

| Direction | What it means | Status |
|---|---|---|
| A Unity helper package | A namespaced, opt-in package that exposes the same workflows to an in-Editor agent | Only if justified; the non-invasiveness rule and collision CI have to be proven first |
| More upstream coverage | Tracking more Unity agent repositories for claims worth citing | Continuous; the ledger in `references/upstream.md` grows |
| A quarterly version review | Re-verifying the claim registry against the current Unity version | Planned; the cadence is the claim registry's heartbeat |

## What this project will not do

- **Vendor a third-party server's code.** The corpus describes capabilities;
  it does not carry someone else's implementation.
- **Hold anyone's credentials.** Keys live in the environment of the machine
  that runs the agent. The repository never has a key, and the validator
  fails the build if it ever does.
- **Require a paid provider to be useful.** Every provider is optional, and
  the corpus works without any of them.
- **Grow the corpus for its own sake.** A capability that needs a procedure
  earns a workflow; a capability that needs detail earns a reference. The
  caps are the mechanism, not an accident.
- **Take over the Editor.** The generation layer writes assets; the Editor
  work stays behind the existing adapter contract, with the same
  read-back discipline.

## How to influence this

- Open a **skill proposal** using the RFC template in
  `.github/ISSUE_TEMPLATE/skill-proposal.yml` if a capability you need has no
  home in the corpus. The template asks for the four things every skill
  needs, so a proposal that answers them is usually close to mergeable.
- Say so in an issue if a planned provider is missing, or if one is planned
  that you would not use. The provider registry is data, and the roadmap
  above is a proposal, not a contract.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) for the rules, and
  [docs/03-decision-records.md](docs/03-decision-records.md) for the
  decisions that are already settled.

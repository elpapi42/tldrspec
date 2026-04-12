# tldr-spec

A lightweight, spec-driven planning framework for [pi](https://github.com/mariozechner/pi). Three phases, three commands, no ceremony.

## Philosophy

Most planning and specification frameworks fail because they optimize for completeness over usefulness. They produce 50-page PRDs that nobody reads, require rigid templates that don't fit the problem, and demand so much upfront ceremony that teams skip them entirely — then build the wrong thing anyway.

tldr-spec takes the opposite approach:

1. **The LLM does the heavy lifting.** The framework doesn't contain question templates, decision trees, or spec generators. It gives the LLM phase-specific instructions and lets it drive the conversation naturally. The intelligence is in the prompts, not in code.

2. **Three phases, three artifacts.** Discovery produces one file. Each specification produces one file. Planning produces one file. That's it. If your planning process produces more artifacts than your feature produces code, something is wrong.

3. **The codebase is the source of truth.** In every phase, the LLM is expected to explore the actual codebase — read files, grep for patterns, understand the architecture. Specs that ignore existing code are fiction.

4. **Idempotent by default.** Re-running any command on an existing initiative refines the artifact rather than replacing it. Discovery is never "done" — you just have enough clarity to start specifying. Specs are never "done" — you just have enough detail to start planning.

5. **Cross-phase consistency over linear flow.** If you discover a contradiction during specification, the framework surfaces it immediately rather than letting it propagate. Stale references are called out, not silently inherited.

6. **No execution phase.** tldr-spec stops at planning. It does not try to execute tasks, manage sprints, or track progress. A plan is a document — what you do with it is your business.

## Concepts

### Initiative

An initiative is a named unit of work. It could be a feature, a refactor, a migration, or any cohesive effort that benefits from structured thinking before coding. The name gets slugified (lowercased, special characters replaced with hyphens) and used as a directory name.

Examples: `auth-system`, `api-v2`, `database-migration`, `onboarding-flow`

### Phases

tldr-spec has three sequential phases. Each phase reads the artifacts from prior phases and produces its own artifact. The phases are independent commands — you can enter at any stage if you already have the prerequisite artifacts.

| Phase | Command | Reads | Produces |
|-------|---------|-------|----------|
| Discovery | `/discovery <name>` | Codebase | `discovery.md` |
| Specify | `/specify <name> [spec]` | `discovery.md` + codebase | `specs/<name>.md` |
| Plan | `/plan <name>` | `discovery.md` + all specs + codebase | `plan.md` |

### Artifacts

All artifacts are markdown files stored in `./initiatives/<initiative-name>/`:

```
initiatives/
└── auth-system/
    ├── discovery.md          # Problem space: what, why, who, constraints
    ├── specs/
    │   ├── product.md        # One spec per /specify run
    │   ├── technical.md
    │   └── api-design.md
    └── plan.md               # Task breakdown with ordering and dependencies
```

Artifacts are version-controllable, human-readable, and exist alongside the code they describe.

### Cross-Phase Consistency

Each phase's system prompt instructs the LLM to watch for contradictions with prior artifacts:

- **During /specify**: If something contradicts `discovery.md` or a previously written spec, the LLM stops and surfaces the conflict to the user. It suggests updating the stale artifact.
- **During /plan**: If something in the specs doesn't add up, is contradictory, or is impossible given the codebase, the LLM stops and explains the issue before continuing.

This is enforced via prompt instructions, not code validation. The LLM is trusted to catch inconsistencies because it has full context of all artifacts.

### Idempotency

Re-running any command on an existing initiative does not start from scratch. The LLM reads the existing artifact and refines it:

- `/discovery auth-system` (first time) — starts fresh Q&A, writes `discovery.md`
- `/discovery auth-system` (second time) — reads existing `discovery.md`, fills gaps, resolves open questions
- `/specify auth-system product` (first time) — writes `specs/product.md`
- `/specify auth-system product` (second time) — reads existing spec, improves it

## Commands

### /discovery \<initiative-name\>

Starts or continues the discovery phase. The LLM asks focused questions to understand:

- **Problem**: What are we solving and why?
- **Users/Actors**: Who is involved?
- **Goals**: What does success look like?
- **Non-Goals**: What is explicitly out of scope?
- **Constraints**: Technical, timeline, business, regulatory limits.
- **Open Questions**: What remains unresolved?

The LLM uses a mix of open-ended conversation and the `ask_question` tool (for multiple-choice when there are clear options). It also explores the codebase for relevant context.

When the LLM has enough clarity, it writes `initiatives/<name>/discovery.md` and provides a confidence assessment.

**Output**: `initiatives/<name>/discovery.md`

### /specify \<initiative-name\> [spec-name]

Starts or continues a specification. If `spec-name` is provided, the LLM writes that specific spec directly. If omitted, the LLM asks the user what aspect they want to specify.

The LLM reads the discovery document and all existing specs as context, then produces a specification that is specific enough to implement.

Common spec types (not enforced, just examples):
- `product` — user-facing behavior, flows, acceptance criteria
- `technical` — architecture decisions, data models, integrations
- `api-design` — endpoints, payloads, error handling
- `data-model` — schemas, relationships, migrations
- `security` — auth, permissions, threat model

**Output**: `initiatives/<name>/specs/<spec-name>.md`

### /plan \<initiative-name\>

Reads the discovery document and all specifications, then produces a task breakdown. Each task includes:

- Title
- Dependencies (which tasks must complete first)
- Files likely to be created or modified
- Description with enough context to execute independently

The plan also includes a risks/open items section.

**Output**: `initiatives/<name>/plan.md`

## Architecture

### File Structure

```
stupidly-simple-planning/
├── index.ts    — Extension entry point: commands, ask_question tool, system prompt injection
├── phases.ts   — System prompt builders for each phase
├── state.ts    — Initiative paths, artifact read/write helpers
└── DOCS.md     — This file
```

### How It Works (Technical)

tldr-spec is a pi extension — a TypeScript module that exports a default function receiving `ExtensionAPI`. It registers three things:

1. **Three commands** (`/discovery`, `/specify`, `/plan`) — each sets the active phase in memory and sends a kickoff message to start the LLM conversation.

2. **One custom tool** (`ask_question`) — presents multiple-choice questions to the user via `ctx.ui.select()`. The LLM decides the question and options. For open-ended questions, the LLM just uses normal conversation.

3. **One event hook** (`before_agent_start`) — injects the current phase's system prompt before every LLM turn. The system prompt includes all relevant artifacts from prior phases as context.

### Key Design Decisions

**The LLM writes files using pi's built-in `write` tool.** There is no custom `save_artifact` tool. The system prompt tells the LLM where to write (e.g., `initiatives/<name>/discovery.md`), and the LLM uses the standard `write` tool. This keeps the extension simple and lets the LLM handle formatting naturally.

**The LLM reads the codebase using pi's built-in tools.** No special codebase indexing or context injection. The system prompt tells the LLM to explore the codebase (read, grep, glob) as needed. The LLM decides what's relevant.

**Artifacts are injected into the system prompt, not read by tools.** When `/specify` runs, the discovery document and all existing specs are embedded directly in the system prompt via `before_agent_start`. This ensures the LLM always has full context without needing to read files first. The LLM may still read them explicitly if it needs to — the system prompt injection is a convenience, not a restriction.

**State is in-memory only.** The current phase and initiative name are held in a `session` variable. There is no persistence across pi sessions. If you close pi and reopen it, you re-enter the phase with the appropriate command. The artifacts on disk are the durable state.

**Initiative names are slugified.** `"Auth System"` becomes `auth-system`. This keeps directory names clean and URL-safe.

### Extension API Surface Used

| API | Purpose |
|-----|---------|
| `pi.registerTool()` | Register the `ask_question` tool |
| `pi.registerCommand()` | Register `/discovery`, `/specify`, `/plan` |
| `pi.on("before_agent_start")` | Inject phase-specific system prompt |
| `pi.on("session_shutdown")` | Clean up status bar on exit |
| `pi.sendUserMessage()` | Send kickoff message to start the LLM conversation |
| `ctx.ui.select()` | Present multiple-choice questions |
| `ctx.ui.notify()` | Show notifications |
| `ctx.ui.setStatus()` | Show active phase in the status bar |
| `ctx.ui.theme.fg()` | Theme-aware text coloring |

### Module Breakdown

#### state.ts

Pure utility module with no side effects. Provides:

- `SessionState` type — tracks current phase, initiative name, and optional spec name
- Path helpers — `initiativePath()`, `discoveryPath()`, `specsDir()`, `specPath()`, `planPath()`
- File helpers — `ensureInitiativeDir()`, `readArtifact()`, `listSpecs()`, `readAllSpecs()`

All functions take `cwd` (current working directory) as the first argument so paths are always resolved relative to the project root.

#### phases.ts

Exports one function per phase (`discoveryPrompt()`, `specifyPrompt()`, `planPrompt()`) plus a unified `getPhasePrompt()` dispatcher.

Each function builds a system prompt string that:
- Identifies the current phase and initiative
- Includes relevant prior artifacts inline (wrapped in XML tags for clarity)
- Defines what the LLM should do in this phase
- Specifies the artifact structure to produce
- Includes cross-phase consistency instructions

The prompts are intentionally simple. They are the primary area for future refinement — the quality of the entire framework depends on how well these prompts guide the LLM.

#### index.ts

The extension entry point. Responsibilities:

- Registers the `ask_question` tool with a TypeBox schema
- Implements `startPhase()` which sets session state, creates directories, updates the status bar, and sends a kickoff message
- Implements `buildKickoffMessage()` which crafts the initial user message based on whether artifacts already exist (refinement vs. fresh start)
- Registers the three slash commands with argument parsing
- Hooks `before_agent_start` to inject the phase prompt with all relevant artifact context
- Hooks `session_shutdown` to clean up status bar state

## Running the Extension

```bash
# From the project directory where you want initiatives/ to be created:
pi -e /path/to/stupidly-simple-planning

# Or add to settings.json for permanent use:
# { "extensions": ["/path/to/stupidly-simple-planning"] }
```

## Future Development Areas

This section lists areas that are not yet implemented but are natural next steps. They are ordered roughly by impact.

### Prompt Refinement

The system prompts in `phases.ts` are the core value of the extension. They are currently simple and functional but could be significantly improved:

- **Discovery**: Better question strategies. Guide the LLM to probe for edge cases, failure modes, and implicit assumptions early.
- **Specify**: More structure guidance depending on spec type. A product spec and an API spec need different prompts.
- **Plan**: Better task granularity heuristics. Guide the LLM on what "small enough to execute in one session" means in practice.
- **Cross-phase**: Stronger consistency checking language. Currently relies on the LLM noticing contradictions — could be more explicit about what to compare.

### Session Persistence

Currently, phase state is in-memory. If you close pi, the session is lost (though artifacts on disk remain). Adding persistence via `pi.appendEntry()` would allow resuming a phase across sessions without re-running the command. The `plan-mode` example extension demonstrates this pattern.

### Status Command

A `/status <initiative>` command that shows:
- Which artifacts exist
- When they were last modified
- Which phase was last active
- A summary of open questions from discovery

### Initiative Listing

A `/initiatives` command that lists all initiatives in the `initiatives/` directory with their current state (which artifacts exist).

### Artifact Validation

Light validation that artifacts follow the expected structure before advancing phases. For example, warn if `discovery.md` has an empty "Open Questions" section before starting `/specify`.

### Diff-Aware Refinement

When refining an existing artifact, show the user what changed. Currently the LLM rewrites the whole file — a diff view would help the user understand what was updated.

### Custom Artifact Location

Allow configuring the artifacts directory (default: `./initiatives/`). Some projects may want specs in `./docs/` or `./.planning/`.

### Export / Integration

Export plans to external systems:
- GitHub Issues (one issue per task)
- Linear (project + issues)
- Markdown checklist (for embedding in PRs)

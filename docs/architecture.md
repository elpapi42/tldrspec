# Architecture

## File Structure

```
tldrspec/
├── src/
│   ├── index.ts    — Extension entry point: commands, event hooks, tool registration
│   ├── phases.ts   — System prompt builders for each phase
│   ├── state.ts    — Initiative paths and artifact read helpers
│   └── tools.ts    — Custom TUI tools (ask_question, ask_multi_select, resume_structured)
├── docs/           — Documentation
├── package.json    — Pi extension manifest
└── .gitignore
```

## How It Works

tldr-spec is a pi extension -- a TypeScript module that exports a default function receiving `ExtensionAPI`. Pi loads it via jiti (no build step). The extension registers:

### Commands

Three slash commands (`/tldr-discovery`, `/tldr-specify`, `/tldr-plan`). Each command:

1. Slugifies the initiative name
2. Creates the initiative directory structure
3. Sets session state (phase + initiative + optional spec name)
4. Updates the status bar
5. Sends a kickoff message to start the LLM conversation

The kickoff message varies based on whether artifacts already exist (refinement vs. fresh start).

### Tools

Three custom tools (`ask_question`, `ask_multi_select`, `resume_structured`). The first two use `ctx.ui.custom()` to render interactive TUI components with keyboard navigation. `resume_structured` is a lightweight signal tool for exiting conversational mode. See [tools.md](tools.md) for details.

### Event Hooks

**`before_agent_start`** -- Fires before every LLM turn. If a session is active, it:

1. Reads all relevant artifacts from disk (discovery doc, specs, current spec)
2. Builds the phase-specific system prompt via `getPhasePrompt()`
3. Appends it to the base system prompt

This ensures the LLM always has full artifact context without needing to read files first.

**`session_shutdown`** -- Clears session state and the status bar on exit.

## Key Design Decisions

### LLM writes files with pi's built-in write tool

There is no custom `save_artifact` tool. The system prompt tells the LLM where to write (e.g., `tldrspec/<name>/discovery.md`), and the LLM uses pi's standard `write` tool. This keeps the extension simple and lets the LLM handle formatting naturally.

### LLM reads the codebase with pi's built-in tools

No special codebase indexing or context injection. The system prompt instructs the LLM to explore the codebase (read, grep, glob) as needed. The LLM decides what's relevant.

### Artifacts injected in the system prompt

When `/tldr-specify` runs, the discovery document and all existing specs are embedded directly in the system prompt via `before_agent_start`. This ensures the LLM has full context from turn one. The LLM may still read them explicitly if needed.

### State is in-memory only

The current phase and initiative name are held in a `session` variable. There is no persistence across pi sessions. If you close pi and reopen it, you re-enter the phase with the appropriate command. The artifacts on disk are the durable state.

### Initiative names are slugified

`"Auth System"` becomes `auth-system`. This keeps directory names clean and filesystem-safe.

## Extension API Surface

| API | Purpose |
|-----|---------|
| `pi.registerTool()` | Register `ask_question`, `ask_multi_select`, and `resume_structured` |
| `pi.registerCommand()` | Register `/tldr-discovery`, `/tldr-specify`, `/tldr-plan` |
| `pi.on("before_agent_start")` | Inject phase-specific system prompt |
| `pi.on("session_shutdown")` | Clean up session state and status bar |
| `pi.sendUserMessage()` | Send kickoff message to start the LLM conversation |
| `ctx.ui.custom()` | Render interactive TUI components for tools |
| `ctx.ui.notify()` | Show notifications |
| `ctx.ui.setStatus()` | Show active phase in the status bar |
| `ctx.ui.theme.fg()` | Theme-aware text coloring |

## Module Responsibilities

### state.ts

Pure utility module with no side effects:

- `SessionState` type -- tracks current phase, initiative name, and optional spec name
- Path helpers -- `initiativePath()`, `discoveryPath()`, `specsDir()`, `specPath()`, `planPath()`
- File helpers -- `ensureInitiativeDir()`, `readArtifact()`, `listSpecs()`, `readAllSpecs()`

All functions take `cwd` as the first argument so paths resolve relative to the project root.

### phases.ts

System prompt builders. One function per phase (`discoveryPrompt()`, `specifyPrompt()`, `planPrompt()`) plus a unified `getPhasePrompt()` dispatcher.

Each prompt:
- Identifies the current phase and initiative
- Includes relevant prior artifacts inline (wrapped in XML tags)
- Defines the interaction rules (one question at a time, always via tools)
- Specifies the process (codebase analysis, gray areas, discussion)
- Defines the artifact structure to produce
- Includes cross-phase consistency instructions

The prompts are the core value of the extension. The quality of the entire framework depends on how well they guide the LLM.

### tools.ts

Custom TUI tools built with `@mariozechner/pi-tui`. Exports `registerTools(pi)` called from index.ts. Each tool uses `ctx.ui.custom()` for keyboard-driven interfaces with arrow navigation, enter to select, escape to cancel.

### index.ts

Orchestration layer. Imports from all other modules:
- Calls `registerTools(pi)` for tool registration
- Implements `startPhase()` and `buildKickoffMessage()` for phase lifecycle
- Registers the three slash commands
- Hooks `before_agent_start` and `session_shutdown`

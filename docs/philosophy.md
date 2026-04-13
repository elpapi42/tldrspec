# Philosophy

## The Problem with Planning

Most planning and specification frameworks fail because they optimize for completeness over usefulness. They produce 50-page PRDs that nobody reads, require rigid templates that don't fit the problem, and demand so much upfront ceremony that teams skip them entirely -- then build the wrong thing anyway.

The industry response has been to swing to the other extreme: "just start coding." This works for trivial features but falls apart for anything with ambiguity. Without shared understanding, teams build different interpretations of the same idea, discover dealbreakers late, and waste cycles on rework.

## What tldr-spec Does Differently

tldr-spec sits between these extremes. It provides just enough structure to eliminate ambiguity, then gets out of the way.

### 1. The LLM does the heavy lifting

The framework doesn't contain question templates, decision trees, or spec generators. It gives the LLM phase-specific instructions and lets it drive the conversation naturally. The intelligence is in the prompts, not in code.

### 2. Three phases, three artifacts

Discovery produces one file. Each specification produces one file. Planning produces one file. That's it. If your planning process produces more artifacts than your feature produces code, something is wrong.

### 3. The codebase is the source of truth

In every phase, the LLM explores the actual codebase -- reads files, greps for patterns, understands the architecture. Before asking any questions, it forms assumptions from what the code already tells it. Specs that ignore existing code are fiction.

### 4. One question at a time

Every interaction with the user happens through structured tools -- a single question with concrete options, plus a free-text escape hatch. The user is never overwhelmed with walls of text or multi-part questions. Decide one thing, move on.

### 5. Codebase-first assumptions

The LLM analyzes the codebase before asking questions. It presents what it already knows (with confidence levels) and only asks about what the code can't tell it. This respects the user's time -- you're correcting assumptions, not re-explaining your own codebase.

### 6. Idempotent by default

Re-running any command on an existing initiative refines the artifact rather than replacing it. Discovery is never "done" -- you just have enough clarity to start specifying. Specs are never "done" -- you just have enough detail to start planning.

### 7. Cross-phase consistency over linear flow

If you discover a contradiction during specification, the framework surfaces it immediately rather than letting it propagate. Stale references are called out, not silently inherited.

### 8. No execution phase

tldr-spec stops at planning. It does not try to execute tasks, manage sprints, or track progress. A plan is a document -- what you do with it is your business.

## The User is the Visionary

tldr-spec is built on a clear division of responsibility:

- **The user knows** how they imagine it working, what it should look and feel like, what's essential vs. nice-to-have, and specific behaviors or references they have in mind.
- **The LLM handles** technical implementation details, architecture patterns, performance optimization, and internal code structure.

The framework never asks about the user's technical skill level. It never asks about architecture unless the user's preference matters. It treats the user as the product owner and the LLM as the builder.

## Gray Areas as the Unit of Discussion

Rather than walking through generic checklists, tldr-spec identifies "gray areas" -- specific implementation decisions that could go multiple ways and would change the result. These are concrete decision points like "session handling" or "error recovery", not vague categories like "UX" or "behavior."

The user selects which gray areas to discuss. Each one is resolved through focused questions with concrete options. When all gray areas are resolved, you have a spec. This approach ensures every conversation produces decisions, not just documentation.

## Specificity as a Quality Gate

Every decision must pass a simple test: "Could a different AI implement this without asking clarifying questions?"

- Bad: "Add authentication"
- Good: "JWT auth with refresh rotation using jose library, stored in httpOnly cookie, 15min access / 7day refresh"

If a decision is too vague, the framework challenges it before recording. If it's specific enough, it stops there -- no over-specifying variable names or internal function structure.

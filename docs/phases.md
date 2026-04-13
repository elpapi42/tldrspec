# Phases

tldr-spec has three sequential phases. Each phase reads the artifacts from prior phases and produces its own artifact. The phases are independent commands -- you can enter at any stage if you already have the prerequisite artifacts.

## Discovery

**Command:** `/tldr-discovery <initiative-name>`
**Reads:** Codebase
**Produces:** `initiatives/<name>/discovery.md`

Discovery is the problem space. The goal is to deeply understand what the user wants to build and why, eliminating ambiguity before anything gets specified.

### How it works

1. **Codebase analysis** -- The LLM explores the codebase first, forming assumptions about existing patterns, conventions, and constraints. Each assumption has a confidence level:
   - **Confident** -- the code clearly shows this
   - **Likely** -- the code suggests this but there's room for variation
   - **Unclear** -- the code can't tell, the user needs to decide

2. **Assumption review** -- Assumptions are presented one at a time. The user confirms or corrects each one. This replaces lengthy interviews for existing codebases -- the LLM already knows most of the context.

3. **Gray area identification** -- The LLM identifies 3-4 specific decision points where the user's preference matters. These are concrete choices like "session handling" or "error recovery", not vague categories.

4. **Gray area selection** -- The user selects which areas to discuss via a multi-select checkbox interface.

5. **Focused discussion** -- Each selected area is discussed with one question at a time. Every question has concrete options plus a free-text escape hatch. Options always cite existing code when relevant.

6. **Artifact writing** -- When there's enough clarity, the LLM writes the discovery document.

### Discovery document structure

```markdown
# Discovery: <initiative name>

## Problem
## Users / Actors
## Goals
## Non-Goals
## Constraints
## Decisions
## Deferred Ideas
## References
## Open Questions
```

The **Decisions** section captures concrete choices made during discovery. The **References** section lists file paths to relevant codebase files with notes on why they matter. The **Deferred Ideas** section preserves ideas that came up but belong in separate work.

## Specify

**Command:** `/tldr-specify <initiative-name> [spec-name]`
**Reads:** `discovery.md` + existing specs + codebase
**Produces:** `initiatives/<name>/specs/<spec-name>.md`

Specify is the solution space. Discovery defined what we're building and why -- specify defines how it should work through concrete decisions.

### How it works

1. **Orient** -- If no spec name was provided, the LLM asks what aspect to specify. It reads the discovery document and all existing specs.

2. **Codebase analysis** -- Same assumption-based flow as discovery, but focused on solution-space patterns. The LLM cites existing code when presenting options.

3. **Gray area identification** -- 3-4 concrete decision points about how something should work (not whether it should exist).

4. **Research-backed options** -- For technical decisions, the LLM presents comparison tables:

   | Option | Pros | Cons | Complexity | Recommendation |
   |--------|------|------|------------|----------------|
   | Approach A | Advantages | Disadvantages | Impact + risk | Conditional rec |
   | Approach B | Advantages | Disadvantages | Impact + risk | Conditional rec |

   - Complexity = impact surface + risk (never time estimates)
   - Recommendations are always conditional ("Recommended if mobile-first"), never single-winner rankings

5. **Vagueness challenge** -- Every decision is challenged if vague. "Clean UI" becomes "minimal controls with lots of whitespace" or "monochrome palette with subtle borders."

6. **Coverage audit** -- Before writing, every goal and decision from the discovery document is checked. If anything is missing and not covered by another spec, the user is asked whether to include it or create a separate spec.

7. **Specificity test** -- Every decision is tested: "Could a different AI implement this without asking clarifying questions?" Failures are resolved before writing.

8. **Artifact writing** -- The spec is written with numbered decision IDs (D-01, D-02, etc.).

### Spec structure

```markdown
# Spec: <spec-name> -- <initiative name>

## Context
## Decisions
### Area 1
- D-01: ...
- D-02: ...
### Area 2
- D-03: ...
## Your Discretion
## Deferred Ideas
## Specific References
## References
```

## Plan

**Command:** `/tldr-plan <initiative-name>`
**Reads:** `discovery.md` + all specs + codebase
**Produces:** `initiatives/<name>/plan.md`

Plan breaks specifications into executable tasks. Each task has enough context for independent execution.

### How it works

1. The LLM reads all artifacts (discovery + specs).
2. It explores the codebase to understand what exists and what needs to change.
3. It produces an ordered task breakdown with dependencies.
4. It flags any contradictions or impossibilities in the specs.

### Plan structure

```markdown
# Plan: <initiative name>

## Overview
## Tasks
### 1. <Task title>
**Depends on:** (none, or list task numbers)
**Files:** list of files to create or modify
**Description:** What to do and why.

### 2. <Task title>
...

## Risks / Open Items
```

## Cross-Phase Consistency

Each phase watches for contradictions with prior artifacts:

- **During specify**: If something contradicts discovery or a previous spec, the LLM stops, explains the contradiction, and suggests updating the stale artifact.
- **During plan**: If specs contradict each other or are impossible given the codebase, the LLM stops and explains before continuing.

This is enforced via prompt instructions. The LLM has full context of all artifacts in every phase.

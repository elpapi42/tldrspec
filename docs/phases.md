# Phases

tldr-spec has three sequential phases. Each phase reads the artifacts from prior phases and produces its own artifact. The phases are independent commands -- you can enter at any stage if you already have the prerequisite artifacts.

## Discovery

**Command:** `/tldr-discovery <initiative-name>`
**Reads:** Codebase (lightweight, product-level), user context
**Produces:** `tldrspec/<name>/discovery.md`

Discovery is the problem space. The goal is to deeply understand what the user wants to build, for whom, why, and within what constraints -- before anything gets specified. Discovery is domain-agnostic: it works for product managers, engineers, founders, or anyone who owns a problem.

Technical decisions (architecture, technology choices, implementation patterns) are explicitly out of scope -- they belong in specs.

### How it works

1. **Context gathering** -- The LLM does a lightweight scan of the codebase (if one exists) to understand the product at a high level -- what it does, who uses it, what capabilities exist. It also asks about business, product, and market context.

2. **Assumption review** -- Assumptions about the context are presented one at a time. The user confirms or corrects each one. This replaces lengthy interviews -- the LLM figures out what it can and only asks about what's unclear.

3. **Problem understanding** -- The LLM digs into the core problem: what's broken, who's affected, what's the cost of not solving it, what triggered this initiative.

4. **Gray area identification** -- The LLM identifies 3-4 specific product or business decision points where the user's preference matters. These are concrete choices like "target audience priority" or "MVP scope boundary", not vague categories or technical decisions.

5. **Gray area selection** -- The user selects which areas to discuss via a multi-select checkbox interface.

6. **Focused discussion** -- Each selected area is discussed with one question at a time. Every question has concrete options framed in terms of user impact and business tradeoffs, plus a free-text escape hatch and a "let's discuss this" option for open conversation.

7. **Artifact writing** -- When there's enough clarity, the LLM writes the discovery document and suggests which specs to write next.

### Discovery document structure

```markdown
# Discovery: <initiative name>

## Context
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

The **Context** section captures business, product, or market context. The **Decisions** section captures product and business choices made during discovery. The **References** section lists relevant context sources (product capabilities, competitor references, user research, codebase files). The **Deferred Ideas** section preserves ideas that belong in separate work.

## Specify

**Command:** `/tldr-specify <initiative-name> <spec-name>`
**Reads:** `discovery.md` + existing specs + codebase
**Produces:** `tldrspec/<name>/specs/<spec-name>.md`

Specify is the solution space. Discovery defined what we're building and why -- specify defines how it should work through concrete decisions.

Specs can cover any domain -- not just technical engineering:

- **product** -- user flows, acceptance criteria, interaction patterns, edge cases
- **technical** -- architecture, data models, API contracts, infrastructure
- **business** -- pricing, go-to-market, compliance, operational processes
- **security** -- threat model, permissions, audit requirements, data handling
- **data** -- schemas, relationships, migrations, analytics
- **ux** -- design system, accessibility, responsive behavior, content strategy

### How it works

1. **Orient + Purpose** -- The LLM reads the discovery document and all existing specs. Then it asks what this spec should cover via multi-select, inferring scope areas from the spec name and discovery context. The user selects all areas they want this spec to cover.

2. **Quick scan + assumptions** -- A lightweight codebase scan builds baseline understanding. The LLM forms assumptions with confidence levels (Confident / Likely / Unclear) and presents them one at a time for correction. This is just enough to identify what exists -- deep research happens later, per gray area.

3. **Frame boundary + find gaps** -- The LLM first frames what this spec delivers and surfaces relevant decisions already locked from discovery and existing specs. Then it asks: "If the plan phase read this spec right now, what would it get stuck on?" It identifies 3-4 gaps -- ambiguities, undefined behaviors, or decisions that would cause two implementers to build different things. Each gap is annotated with WHY it would block planning, plus code context and prior decision context. The user selects which to discuss via multi-select.

4. **Focused discussion** -- Each selected gap gets announced, then its own deep research pass -- the LLM digs into the specific files, patterns, and dependencies relevant to that decision. For technical decisions, it presents comparison tables:

   | Option | Pros | Cons | Complexity | Recommendation |
   |--------|------|------|------------|----------------|
   | Approach A | Advantages | Disadvantages | Impact + risk | Conditional rec |
   | Approach B | Advantages | Disadvantages | Impact + risk | Conditional rec |

   - Complexity = impact surface + risk (never time estimates)
   - Recommendations are always conditional ("Recommended if mobile-first"), never single-winner rankings
   - "You decide" is available as an option when delegation is reasonable
   - Vague decisions are challenged immediately during discussion
   - After each area: a per-area checkpoint asks "more questions about this, or next area?" so the user controls depth

5. **Planning readiness checkpoint** -- After discussing all selected gaps, the LLM assesses planning readiness: are there follow-up decisions created by what was just decided? Interactions between decisions that haven't been addressed? Scope areas not yet touched? It presents a context-aware summary with resolved decisions, specific gaps found (and why they'd block planning), and a recommendation to keep going or finalize. If the user keeps going, the LLM proactively identifies new gaps and presents them via multi-select. This loop can repeat as many times as needed.

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
**Produces:** `tldrspec/<name>/plan.md`

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

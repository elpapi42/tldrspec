# Getting Started

## Installation

Install from git:

```bash
pi install git:github.com/elpapi42/tldrspec
```

Or for one-time use without installing:

```bash
pi -e git:github.com/elpapi42/tldrspec
```

## Commands

tldr-spec registers three commands in pi:

| Command | Purpose | Output |
|---------|---------|--------|
| `/tldr-discovery <name>` | Understand the problem space | `initiatives/<name>/discovery.md` |
| `/tldr-specify <name> [spec]` | Write actionable specifications | `initiatives/<name>/specs/<spec>.md` |
| `/tldr-plan <name>` | Break specs into executable tasks | `initiatives/<name>/plan.md` |

## Quick Walkthrough

### 1. Start discovery

```
/tldr-discovery auth-system
```

The LLM will:
1. Explore your codebase for relevant patterns
2. Present assumptions about what it found (one at a time)
3. Ask you to confirm or correct each assumption
4. Identify gray areas -- decision points where your preference matters
5. Let you select which gray areas to discuss
6. Walk through each area with concrete options
7. Write `initiatives/auth-system/discovery.md`

### 2. Write specifications

```
/tldr-specify auth-system
```

If you don't provide a spec name, the LLM asks what aspect you want to specify. You can also be explicit:

```
/tldr-specify auth-system api-design
```

The LLM reads the discovery document and existing specs, analyzes the codebase, identifies solution-space decisions, and walks you through them. For technical choices, it presents comparison tables with pros, cons, complexity, and conditional recommendations.

Before writing, it runs a coverage audit (every discovery goal is accounted for) and a specificity test (every decision is implementable without clarification).

### 3. Create a plan

```
/tldr-plan auth-system
```

The LLM reads all artifacts and produces a task breakdown with dependencies, affected files, and enough context per task that someone (or another AI) can execute without re-reading the full specs.

## Artifact Structure

All artifacts live alongside your code:

```
your-project/
├── src/
├── initiatives/
│   └── auth-system/
│       ├── discovery.md
│       ├── specs/
│       │   ├── product.md
│       │   ├── technical.md
│       │   └── api-design.md
│       └── plan.md
└── ...
```

## Idempotency

Re-running any command on an existing initiative refines the artifact instead of starting over:

- `/tldr-discovery auth-system` (first time) -- fresh Q&A, writes discovery.md
- `/tldr-discovery auth-system` (second time) -- reads existing discovery.md, fills gaps
- `/tldr-specify auth-system product` (first time) -- writes specs/product.md
- `/tldr-specify auth-system product` (second time) -- reads existing spec, improves it

## Multiple Specs per Initiative

You can write as many specs as you need. Each `/tldr-specify` run produces one spec file. Common spec types (not enforced):

- `product` -- user-facing behavior, flows, acceptance criteria
- `technical` -- architecture decisions, data models, integrations
- `api-design` -- endpoints, payloads, error handling
- `data-model` -- schemas, relationships, migrations
- `security` -- auth, permissions, threat model

The plan phase reads all specs in the `specs/` directory.

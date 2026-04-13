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
| `/tldr-discovery <name>` | Understand the problem space | `tldrspec/<name>/discovery.md` |
| `/tldr-specify <name> <spec>` | Write actionable specifications | `tldrspec/<name>/specs/<spec>.md` |
| `/tldr-plan <name>` | Break specs into executable tasks | `tldrspec/<name>/plan.md` |

## Quick Walkthrough

### 1. Start discovery

```
/tldr-discovery auth-system
```

The LLM will:
1. Do a lightweight scan to understand your product context
2. Present assumptions about what it found (one at a time)
3. Ask you to confirm or correct each assumption
4. Dig into the core problem -- what's broken, who's affected, why now
5. Identify gray areas -- product and business decisions where your preference matters
6. Let you select which gray areas to discuss
7. Walk through each area with concrete options
8. Write `tldrspec/auth-system/discovery.md` and suggest which specs to write next

### 2. Write specifications

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
├── tldrspec/
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

- `product` -- user flows, acceptance criteria, interaction patterns, edge cases
- `technical` -- architecture decisions, data models, API contracts, infrastructure
- `business` -- pricing, go-to-market, compliance, operational processes
- `security` -- threat model, permissions, audit requirements, data handling
- `data` -- schemas, relationships, migrations, analytics
- `ux` -- design system, accessibility, responsive behavior, content strategy

The plan phase reads all specs in the `specs/` directory.

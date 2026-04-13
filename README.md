# tldr-spec

Stop building the wrong thing.

tldr-spec is a [pi](https://github.com/mariozechner/pi) extension that turns fuzzy ideas into actionable specs through structured conversation. Three phases, three commands. The AI understands your problem first, asks only what it can't figure out, and produces artifacts specific enough to implement without follow-up questions.

Built for product-engineering teams, not just engineers. A PM can run discovery, an engineer can write the technical spec, and everyone works from the same shared context.

## The Problem

You know the cycle: start coding, realize you missed something, rewrite, realize there's a contradiction, rewrite again. Or worse -- spend two weeks writing a PRD that nobody reads and that's already stale by the time the first commit lands.

Planning either takes too long or doesn't happen. Both are expensive.

## How tldr-spec Works

```
/tldr-discovery auth-system     -> discovery.md
/tldr-specify auth-system api-design   -> specs/api-design.md
/tldr-plan auth-system          -> plan.md
```

**Discovery** -- Problem space. The AI understands your product context, forms assumptions, and presents them one at a time for you to confirm or correct. Then it identifies the gray areas -- product and business decisions that would change the outcome -- and walks you through each one with concrete options. No technical decisions here -- just what you're building, for whom, and why.

**Specify** -- Solution space. Name your spec and write it. Specs can cover any domain: product, technical, business, security, data, UX. For technical decisions, you get comparison tables with pros, cons, complexity, and conditional recommendations. Before writing, the AI audits every discovery goal is covered and every decision passes the specificity test: "Could a different AI implement this without asking clarifying questions?"

**Plan** -- Reads everything, breaks it into tasks with dependencies and affected files. Each task has enough context to execute independently.

## What Makes It Different

**Problem-first, not code-first.** Discovery understands the problem, users, and business context before anyone touches implementation. Technical decisions come later, in specs, grounded in why they matter.

**One question at a time.** No walls of text. No multi-part questions. Every interaction is a single question with concrete options, a free-text input if none fit, and a "let's discuss this" escape hatch for open conversation. Select and move on.

**Multi-domain specs.** Not just technical architecture. Write product specs for user flows, business specs for go-to-market, security specs for threat models -- whatever the initiative needs. Discovery provides the shared context they all reference.

**Gray areas, not checklists.** The AI doesn't walk through a generic template. It identifies the specific decisions that would change the result and lets you choose which ones to discuss. Everything else, it handles.

**Specificity enforced.** "Clean UI" gets challenged. "Good error handling" gets challenged. Every decision must be concrete enough that two different developers would produce similar results.

## Install

```bash
pi install git:github.com/elpapi42/tldrspec
```

## Quick Start

```bash
# Start a new initiative
/tldr-discovery my-feature

# Write specs (one per domain)
/tldr-specify my-feature product
/tldr-specify my-feature technical

# Generate the plan
/tldr-plan my-feature
```

Artifacts land in `tldrspec/<name>/` alongside your code. They're markdown, version-controllable, and human-readable.

Re-running any command refines the existing artifact instead of starting over.

## Artifact Structure

```
tldrspec/
  auth-system/
    discovery.md
    specs/
      product.md
      technical.md
      api-design.md
    plan.md
```

## Documentation

- [Philosophy](docs/philosophy.md) -- Why tldr-spec exists and its design principles
- [Getting Started](docs/getting-started.md) -- Installation, commands, walkthrough
- [Phases](docs/phases.md) -- Discovery, specify, and plan in detail
- [Tools](docs/tools.md) -- ask_question and ask_multi_select reference
- [Architecture](docs/architecture.md) -- How it's built, design decisions, API surface

## License

MIT

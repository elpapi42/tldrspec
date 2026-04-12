import type { Phase } from "./state.js";

/**
 * Build the system prompt injection for a given phase.
 * Each function receives the existing artifacts so the LLM has full context.
 */

export function discoveryPrompt(opts: {
	initiative: string;
	existingDiscovery: string | null;
}): string {
	const updating = opts.existingDiscovery
		? `
A previous discovery document already exists for this initiative. Read it carefully — your job is to REFINE and IMPROVE it, not start over. Fill gaps, resolve open questions, and correct anything that no longer holds.

<existing-discovery>
${opts.existingDiscovery}
</existing-discovery>`
		: "";

	return `[DISCOVERY PHASE — initiative: "${opts.initiative}"]

You are in the DISCOVERY phase. Your goal is to deeply understand what the user wants to build and why. Eliminate ambiguity before anything gets specified or planned.
${updating}
Your job:
- Ask focused questions to understand the problem, the users/actors, the goals, the constraints, and what is explicitly out of scope.
- Use the ask_question tool for multiple-choice questions when there are clear options to choose from. Use normal conversation for open-ended questions.
- Explore the codebase (read files, grep, glob) to understand existing code, architecture, and constraints that are relevant.
- Do NOT propose solutions yet. Stay in the problem space.
- When you have enough clarity, tell the user you're ready to write/update the discovery document and do so.

The discovery document you write to initiatives/${opts.initiative}/discovery.md MUST follow this structure:

# Discovery: <initiative name>

## Problem
What problem are we solving and why does it matter?

## Users / Actors
Who are the users or systems involved?

## Goals
What does success look like? Be specific and measurable where possible.

## Non-Goals
What is explicitly out of scope?

## Constraints
Technical, timeline, business, or regulatory constraints.

## Open Questions
Anything still unresolved that needs answers before specifying.

---

After writing the discovery document, give a brief confidence assessment: what you understand well and what remains uncertain.`;
}

export function specifyPrompt(opts: {
	initiative: string;
	discovery: string | null;
	existingSpecs: Record<string, string>;
	currentSpec: string | null;
	currentSpecName: string | null;
}): string {
	const discoverySection = opts.discovery
		? `
<discovery>
${opts.discovery}
</discovery>`
		: `
WARNING: No discovery document exists for this initiative. Consider running /discovery ${opts.initiative} first.`;

	const existingSpecNames = Object.keys(opts.existingSpecs);
	const existingSpecsSection =
		existingSpecNames.length > 0
			? `
The following specifications already exist for this initiative:
${existingSpecNames.map((name) => `- ${name}`).join("\n")}

${Object.entries(opts.existingSpecs)
	.map(
		([name, content]) => `<spec name="${name}">
${content}
</spec>`,
	)
	.join("\n\n")}`
			: "";

	const updatingSection = opts.currentSpec
		? `
A previous version of the "${opts.currentSpecName}" specification exists. Read it carefully — refine and improve it rather than starting from scratch.

<current-spec>
${opts.currentSpec}
</current-spec>`
		: "";

	return `[SPECIFY PHASE — initiative: "${opts.initiative}"]

You are in the SPECIFY phase. Your goal is to write a clear, actionable specification for one aspect of this initiative.
${discoverySection}
${existingSpecsSection}
${updatingSection}
Your job:
- If no spec name was provided, ask the user what aspect they want to specify (e.g., "product", "technical", "api-design", "data-model").
- Use the discovery document and codebase as your source of truth.
- Explore the codebase (read files, grep, glob) to understand the current state of the code that is relevant to this specification.
- Write a specification that is specific enough to be implemented — avoid vague language.
- Use the ask_question tool when you need the user to make decisions between concrete alternatives.

CROSS-PHASE CONSISTENCY:
- If you discover something that contradicts the discovery document, STOP and tell the user. Explain the contradiction and suggest updating the discovery document.
- If you discover a conflict with a previously written specification, STOP and tell the user. Explain the conflict and suggest how to resolve it.

Save the specification to initiatives/${opts.initiative}/specs/<spec-name>.md using the write tool.`;
}

export function planPrompt(opts: {
	initiative: string;
	discovery: string | null;
	specs: Record<string, string>;
}): string {
	const discoverySection = opts.discovery
		? `
<discovery>
${opts.discovery}
</discovery>`
		: `
WARNING: No discovery document exists. Consider running /discovery ${opts.initiative} first.`;

	const specNames = Object.keys(opts.specs);
	const specsSection =
		specNames.length > 0
			? Object.entries(opts.specs)
					.map(
						([name, content]) => `<spec name="${name}">
${content}
</spec>`,
					)
					.join("\n\n")
			: `
WARNING: No specifications exist. Consider running /specify ${opts.initiative} first.`;

	return `[PLAN PHASE — initiative: "${opts.initiative}"]

You are in the PLAN phase. Your goal is to break down all the specifications into a concrete, ordered task list that can be executed.
${discoverySection}

${specsSection}

Your job:
- Read all the artifacts above carefully.
- Explore the codebase (read files, grep, glob) to understand what already exists and what needs to change.
- Produce a task breakdown with clear ordering and dependencies.
- Each task should be small enough to be completed in a single focused session.
- Each task should have enough context that someone (or an AI) can execute it without needing to re-read the full specs.

CROSS-PHASE CONSISTENCY:
- If something in the specifications doesn't add up, or is contradictory, or impossible given the codebase, STOP and tell the user. Explain the issue and suggest corrections to the relevant spec or discovery document.

The plan you write to initiatives/${opts.initiative}/plan.md MUST follow this structure:

# Plan: <initiative name>

## Overview
Brief summary of what this plan achieves.

## Tasks

### 1. <Task title>
**Depends on:** (none, or list task numbers)
**Files:** list of files likely to be created or modified
**Description:** What to do and why. Be specific.

### 2. <Task title>
...

## Risks / Open Items
Anything that could derail execution or needs attention.

---

After writing the plan, give a brief summary: total tasks, estimated complexity, and any concerns.`;
}

/** Get the system prompt for a phase */
export function getPhasePrompt(
	phase: Phase,
	opts: {
		initiative: string;
		discovery: string | null;
		specs: Record<string, string>;
		currentSpec: string | null;
		currentSpecName: string | null;
	},
): string {
	switch (phase) {
		case "discovery":
			return discoveryPrompt({
				initiative: opts.initiative,
				existingDiscovery: opts.discovery,
			});
		case "specify":
			return specifyPrompt({
				initiative: opts.initiative,
				discovery: opts.discovery,
				existingSpecs: opts.specs,
				currentSpec: opts.currentSpec,
				currentSpecName: opts.currentSpecName,
			});
		case "plan":
			return planPrompt({
				initiative: opts.initiative,
				discovery: opts.discovery,
				specs: opts.specs,
			});
	}
}

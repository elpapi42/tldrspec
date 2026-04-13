/**
 * tldr-spec
 *
 * A lightweight, spec-driven planning framework for pi.
 * Three phases, three commands, no ceremony.
 *
 * /tldr-discovery <initiative>          — Understand what the user wants through focused Q&A
 * /tldr-specify <initiative> [spec-name] — Write specifications from discovery context
 * /tldr-plan <initiative>               — Break specifications into actionable tasks
 *
 * Artifacts are stored in ./tldrspec/<initiative-name>/
 *
 * The LLM drives the conversation in each phase, guided by phase-specific
 * system prompts. Custom tools (ask_question, ask_multi_select) handle all
 * user interactions — everything else uses pi's built-in tools.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getPhasePrompt } from "./phases.js";
import {
	type Phase,
	type SessionState,
	discoveryPath,
	ensureInitiativeDir,
	readAllSpecs,
	readArtifact,
	specPath,
} from "./state.js";
import { registerTools } from "./tools.js";

export default function tldrSpec(pi: ExtensionAPI) {
	let session: SessionState | null = null;

	// ── Tools ──────────────────────────────────────────────────────────

	registerTools(pi);

	// ── Helper to start a phase ────────────────────────────────────────

	function startPhase(phase: Phase, initiative: string, ctx: ExtensionContext, specName?: string) {
		const slug = initiative
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");

		if (!slug) {
			ctx.ui.notify("Initiative name is required. Usage: /tldr-discovery <name>", "error");
			return;
		}

		ensureInitiativeDir(ctx.cwd, slug);

		session = { phase, initiative: slug, specName };

		const label = phase === "specify" ? `specify${specName ? ` (${specName})` : ""}` : phase;
		ctx.ui.setStatus("ssp", ctx.ui.theme.fg("accent", `${label}: ${slug}`));
		ctx.ui.notify(`Starting ${phase} phase for "${slug}"`, "info");

		// Send an initial message to kick off the LLM
		const kickoff = buildKickoffMessage(phase, slug, ctx.cwd, specName);
		pi.sendUserMessage(kickoff);
	}

	function buildKickoffMessage(phase: Phase, initiative: string, cwd: string, specName?: string): string {
		switch (phase) {
			case "discovery": {
				const existing = readArtifact(discoveryPath(cwd, initiative));
				return existing
					? `I want to continue refining the discovery for the "${initiative}" initiative. The existing discovery document is at tldrspec/${initiative}/discovery.md. Please read it and help me fill any gaps.`
					: `I want to start discovery for a new initiative called "${initiative}". Help me understand and define what we're building. Start asking questions.`;
			}
			case "specify": {
				if (specName) {
					const existing = readArtifact(specPath(cwd, initiative, specName));
					return existing
						? `I want to refine the "${specName}" specification for the "${initiative}" initiative. The existing spec is at tldrspec/${initiative}/specs/${specName}.md. Please read it and help me improve it.`
						: `I want to write a "${specName}" specification for the "${initiative}" initiative. Read the discovery document at tldrspec/${initiative}/discovery.md and any existing specs, then help me write this spec.`;
				}
				return `I want to write a specification for the "${initiative}" initiative. Read the discovery document at tldrspec/${initiative}/discovery.md and any existing specs, then ask me what aspect I want to specify.`;
			}
			case "plan": {
				return `I want to create a task plan for the "${initiative}" initiative. Read all artifacts in tldrspec/${initiative}/ (discovery.md and all specs in specs/) and break them down into actionable tasks.`;
			}
		}
	}

	// ── Commands ────────────────────────────────────────────────────────

	pi.registerCommand("tldr-discovery", {
		description: "Start or continue discovery for an initiative. Usage: /tldr-discovery <initiative-name>",
		handler: async (args, ctx) => {
			const initiative = args?.trim();
			if (!initiative) {
				ctx.ui.notify("Usage: /tldr-discovery <initiative-name>", "error");
				return;
			}
			startPhase("discovery", initiative, ctx);
		},
	});

	pi.registerCommand("tldr-specify", {
		description:
			"Write or refine a specification for an initiative. Usage: /tldr-specify <initiative-name> [spec-name]",
		handler: async (args, ctx) => {
			const parts = args?.trim().split(/\s+/) ?? [];
			const initiative = parts[0];
			const specName = parts[1]; // optional

			if (!initiative) {
				ctx.ui.notify("Usage: /tldr-specify <initiative-name> [spec-name]", "error");
				return;
			}
			startPhase("specify", initiative, ctx, specName);
		},
	});

	pi.registerCommand("tldr-plan", {
		description: "Create a task plan from an initiative's artifacts. Usage: /tldr-plan <initiative-name>",
		handler: async (args, ctx) => {
			const initiative = args?.trim();
			if (!initiative) {
				ctx.ui.notify("Usage: /tldr-plan <initiative-name>", "error");
				return;
			}
			startPhase("plan", initiative, ctx);
		},
	});

	// ── System prompt injection ────────────────────────────────────────

	pi.on("before_agent_start", async (event, ctx) => {
		if (!session) return;

		const { phase, initiative, specName } = session;
		const cwd = ctx.cwd;

		const discovery = readArtifact(discoveryPath(cwd, initiative));
		const specs = readAllSpecs(cwd, initiative);

		let currentSpec: string | null = null;
		let currentSpecName: string | null = specName ?? null;

		if (phase === "specify" && currentSpecName) {
			currentSpec = readArtifact(specPath(cwd, initiative, currentSpecName));
		}

		const phasePrompt = getPhasePrompt(phase, {
			initiative,
			discovery,
			specs,
			currentSpec,
			currentSpecName,
		});

		return {
			systemPrompt: `${event.systemPrompt}\n\n${phasePrompt}`,
		};
	});

	// ── Clear status on session end ────────────────────────────────────

	pi.on("session_shutdown", async (_event, ctx) => {
		session = null;
		ctx.ui.setStatus("ssp", undefined);
	});
}

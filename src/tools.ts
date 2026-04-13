/**
 * Custom tools for tldr-spec.
 *
 * ask_question    — Single question with numbered options + free-text input
 * ask_multi_select — Checkbox multi-select for choosing topics to discuss
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface OptionWithDesc {
	label: string;
	description?: string;
}

interface QuestionDetails {
	question: string;
	options: string[];
	answer: string | null;
	wasCustom?: boolean;
}

interface MultiSelectDetails {
	question: string;
	options: string[];
	selected: string[];
}

export function registerTools(pi: ExtensionAPI) {
	// ── ask_question ──────────────────────────────────────────────────

	pi.registerTool({
		name: "ask_question",
		label: "Ask Question",
		description:
			"Ask the user a single question with concrete options. Always includes a free-text option at the bottom. Use this for EVERY user interaction — never ask questions in conversation text.",
		parameters: Type.Object({
			question: Type.String({ description: "The question to ask" }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ description: "Option label" }),
					description: Type.Optional(Type.String({ description: "Brief context shown below the option" })),
				}),
				{ description: "2-6 concrete options", minItems: 2 },
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [{ type: "text", text: "UI not available — running in non-interactive mode." }],
					details: { question: params.question, options: params.options.map((o) => o.label), answer: null } as QuestionDetails,
				};
			}

			type DisplayOption = OptionWithDesc & { isOther?: boolean; isDiscuss?: boolean };
			const allOptions: DisplayOption[] = [
				...params.options,
				{ label: "Something else (I'll explain)", isOther: true },
				{ label: "Let's discuss this", isDiscuss: true },
			];

			const result = await ctx.ui.custom<{ answer: string; wasCustom: boolean; wasDiscuss?: boolean; index?: number } | null>(
				(tui, theme, _kb, done) => {
					let optionIndex = 0;
					let customText = "";
					let cachedLines: string[] | undefined;

					function refresh() {
						cachedLines = undefined;
						tui.requestRender();
					}

					const isOnOther = () => allOptions[optionIndex]?.isOther === true;
					const isTyping = () => isOnOther() && customText.length > 0;

					function handleInput(data: string) {
						// When on "Something else" with text entered
						if (isTyping()) {
							if (matchesKey(data, Key.enter)) {
								const trimmed = customText.trim();
								if (trimmed) {
									done({ answer: trimmed, wasCustom: true });
								}
								return;
							}
							if (matchesKey(data, Key.escape)) {
								customText = "";
								refresh();
								return;
							}
							if (matchesKey(data, Key.backspace)) {
								customText = customText.slice(0, -1);
								refresh();
								return;
							}
							if (matchesKey(data, Key.up)) {
								customText = "";
								optionIndex = Math.max(0, optionIndex - 1);
								refresh();
								return;
							}
							// Printable characters
							if (data.length > 0 && data.charCodeAt(0) >= 32) {
								customText += data;
								refresh();
							}
							return;
						}

						if (matchesKey(data, Key.up)) {
							optionIndex = Math.max(0, optionIndex - 1);
							refresh();
							return;
						}
						if (matchesKey(data, Key.down)) {
							optionIndex = Math.min(allOptions.length - 1, optionIndex + 1);
							refresh();
							return;
						}

						if (matchesKey(data, Key.enter)) {
							const selected = allOptions[optionIndex];
							if (selected.isDiscuss) {
								done({ answer: "discuss", wasCustom: false, wasDiscuss: true });
							} else if (!selected.isOther) {
								done({ answer: selected.label, wasCustom: false, index: optionIndex + 1 });
							}
							return;
						}

						if (matchesKey(data, Key.escape)) {
							done(null);
							return;
						}

						// Printable character while on "Something else": start typing inline
						if (isOnOther() && data.length > 0 && data.charCodeAt(0) >= 32) {
							customText += data;
							refresh();
						}
					}

					function render(width: number): string[] {
						if (cachedLines) return cachedLines;

						const lines: string[] = [];
						const add = (s: string) => lines.push(truncateToWidth(s, width));

						add(theme.fg("accent", "─".repeat(width)));
						add(theme.fg("text", ` ${params.question}`));
						lines.push("");

						for (let i = 0; i < allOptions.length; i++) {
							const opt = allOptions[i];
							const focused = i === optionIndex;
							const prefix = focused ? theme.fg("accent", "> ") : "  ";

							if (opt.isOther) {
								const num = `${i + 1}. `;
								if (customText.length > 0) {
									add(prefix + theme.fg("accent", num + customText + "▎"));
								} else if (focused) {
									add(prefix + theme.fg("muted", num + "Type your answer...▎"));
								} else {
									add(`  ${theme.fg("dim", num + "Something else (I'll explain)")}`);
								}
							} else if (opt.isDiscuss) {
								const num = `${i + 1}. `;
								if (focused) {
									add(prefix + theme.fg("accent", num + "Let's discuss this"));
								} else {
									add(`  ${theme.fg("dim", num + "Let's discuss this")}`);
								}
							} else if (focused) {
								add(prefix + theme.fg("accent", `${i + 1}. ${opt.label}`));
							} else {
								add(`  ${theme.fg("text", `${i + 1}. ${opt.label}`)}`);
							}

							if (!opt.isOther && opt.description) {
								add(`     ${theme.fg("muted", opt.description)}`);
							}
						}

						lines.push("");
						if (isTyping()) {
							add(theme.fg("dim", " Enter to submit • Esc to clear • ↑ to go back"));
						} else {
							add(theme.fg("dim", " ↑↓ navigate • Enter to select • Esc to cancel"));
						}
						add(theme.fg("accent", "─".repeat(width)));

						cachedLines = lines;
						return lines;
					}

					return {
						render,
						invalidate: () => {
							cachedLines = undefined;
						},
						handleInput,
					};
				},
			);

			const simpleOptions = params.options.map((o) => o.label);

			if (!result) {
				return {
					content: [{ type: "text", text: "User cancelled the selection." }],
					details: { question: params.question, options: simpleOptions, answer: null } as QuestionDetails,
				};
			}

			if (result.wasDiscuss) {
				return {
					content: [{ type: "text", text: "User wants to discuss this topic in conversation. Switch to conversational mode — ask follow-ups in plain text, no tools. When you've understood enough, resume structured interaction with ask_question." }],
					details: { question: params.question, options: simpleOptions, answer: null, wasCustom: false } as QuestionDetails,
				};
			}

			if (result.wasCustom) {
				return {
					content: [{ type: "text", text: `User wrote: ${result.answer}` }],
					details: { question: params.question, options: simpleOptions, answer: result.answer, wasCustom: true } as QuestionDetails,
				};
			}

			return {
				content: [{ type: "text", text: `User selected: ${result.index}. ${result.answer}` }],
				details: { question: params.question, options: simpleOptions, answer: result.answer, wasCustom: false } as QuestionDetails,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("question ")) + theme.fg("muted", args.question);
			const opts = Array.isArray(args.options) ? args.options : [];
			if (opts.length) {
				const labels = opts.map((o: OptionWithDesc) => o.label);
				const numbered = [...labels, "Something else (I'll explain)", "Let's discuss this"].map((o, i) => `${i + 1}. ${o}`);
				text += `\n${theme.fg("dim", `  Options: ${numbered.join(", ")}`)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as QuestionDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.answer === null) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			if (details.wasCustom) {
				return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "(wrote) ") + theme.fg("accent", details.answer), 0, 0);
			}
			const idx = details.options.indexOf(details.answer) + 1;
			const display = idx > 0 ? `${idx}. ${details.answer}` : details.answer;
			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", display), 0, 0);
		},
	});

	// ── resume_structured ────────────────────────────────────────────

	pi.registerTool({
		name: "resume_structured",
		label: "Resume Structured",
		description:
			"Call this when you've gathered enough context from an open conversation (after 'Let's discuss this' or 'Not quite, let me explain') and are ready to return to structured questions via ask_question. Forces you to summarize what you learned before continuing.",
		parameters: Type.Object({
			summary: Type.String({ description: "Brief summary of what you learned from the open conversation" }),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			return {
				content: [
					{
						type: "text",
						text: `Conversation summary captured: ${params.summary}\n\nResuming structured questions. Use ask_question for your next interaction.`,
					},
				],
			};
		},

		renderCall(args, theme) {
			return new Text(theme.fg("toolTitle", theme.bold("resume ")) + theme.fg("muted", args.summary || ""), 0, 0);
		},

		renderResult(result, _options, theme) {
			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", "Resuming structured questions"), 0, 0);
		},
	});

	// ── ask_multi_select ──────────────────────────────────────────────

	pi.registerTool({
		name: "ask_multi_select",
		label: "Multi Select",
		description:
			"Let the user select multiple items from a list using checkboxes. Use when the user needs to choose which topics or areas to discuss. Requires at least one selection.",
		parameters: Type.Object({
			question: Type.String({ description: "The question to ask" }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ description: "Option label" }),
					description: Type.Optional(Type.String({ description: "Brief context shown below the option" })),
				}),
				{ description: "Items to select from", minItems: 2 },
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [{ type: "text", text: "UI not available — running in non-interactive mode." }],
					details: { question: params.question, options: params.options.map((o) => o.label), selected: [] } as MultiSelectDetails,
				};
			}

			const checkboxes = params.options.map((o) => ({ ...o, checked: false }));
			const totalItems = checkboxes.length + 1; // options + Done button

			const result = await ctx.ui.custom<string[] | null>((tui, theme, _kb, done) => {
				let optionIndex = 0;
				let cachedLines: string[] | undefined;

				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function handleInput(data: string) {
					if (matchesKey(data, Key.up)) {
						optionIndex = Math.max(0, optionIndex - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						optionIndex = Math.min(totalItems - 1, optionIndex + 1);
						refresh();
						return;
					}

					if (matchesKey(data, Key.enter) || data === " ") {
						if (optionIndex === checkboxes.length) {
							// "Done" selected
							const selected = checkboxes.filter((o) => o.checked).map((o) => o.label);
							if (selected.length > 0) {
								done(selected);
							}
							// Ignore if nothing selected
						} else {
							checkboxes[optionIndex].checked = !checkboxes[optionIndex].checked;
							refresh();
						}
						return;
					}

					if (matchesKey(data, Key.escape)) {
						done(null);
					}
				}

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const add = (s: string) => lines.push(truncateToWidth(s, width));
					const selectedCount = checkboxes.filter((o) => o.checked).length;

					add(theme.fg("accent", "─".repeat(width)));
					add(theme.fg("text", ` ${params.question}`));
					lines.push("");

					for (let i = 0; i < checkboxes.length; i++) {
						const opt = checkboxes[i];
						const focused = i === optionIndex;
						const checkbox = opt.checked ? theme.fg("success", "[x]") : theme.fg("dim", "[ ]");
						const prefix = focused ? theme.fg("accent", "> ") : "  ";

						if (focused) {
							add(prefix + checkbox + " " + theme.fg("accent", opt.label));
						} else {
							add(prefix + checkbox + " " + theme.fg("text", opt.label));
						}

						if (opt.description) {
							add(`       ${theme.fg("muted", opt.description)}`);
						}
					}

					lines.push("");
					const doneFocused = optionIndex === checkboxes.length;
					if (selectedCount > 0) {
						const label = `Done (${selectedCount} selected)`;
						add(doneFocused ? theme.fg("accent", `> ${label}`) : `  ${theme.fg("text", label)}`);
					} else {
						const label = "Done (select at least one)";
						add(doneFocused ? theme.fg("dim", `> ${label}`) : `  ${theme.fg("dim", label)}`);
					}

					lines.push("");
					add(theme.fg("dim", " ↑↓ navigate • Enter/Space to toggle • Esc to cancel"));
					add(theme.fg("accent", "─".repeat(width)));

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			const simpleOptions = params.options.map((o) => o.label);

			if (!result) {
				return {
					content: [{ type: "text", text: "User cancelled the selection." }],
					details: { question: params.question, options: simpleOptions, selected: [] } as MultiSelectDetails,
				};
			}

			return {
				content: [{ type: "text", text: `User selected: ${result.join(", ")}` }],
				details: { question: params.question, options: simpleOptions, selected: result } as MultiSelectDetails,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("multi-select ")) + theme.fg("muted", args.question);
			const opts = Array.isArray(args.options) ? args.options : [];
			if (opts.length) {
				const labels = opts.map((o: OptionWithDesc) => o.label);
				text += `\n${theme.fg("dim", `  Options: ${labels.join(", ")}`)}`;
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as MultiSelectDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.selected.length === 0) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			const display = details.selected.map((s, i) => `${i + 1}. ${s}`).join(", ");
			return new Text(theme.fg("success", "✓ ") + theme.fg("accent", display), 0, 0);
		},
	});
}

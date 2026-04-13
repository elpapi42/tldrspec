import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Phase = "discovery" | "specify" | "plan";

export interface SessionState {
	phase: Phase;
	initiative: string;
	/** Only used during /specify — the spec being written */
	specName?: string;
}

/** Get the root path for an initiative */
export function initiativePath(cwd: string, initiative: string): string {
	return join(cwd, "tldrspec", initiative);
}

/** Get the path to the discovery artifact */
export function discoveryPath(cwd: string, initiative: string): string {
	return join(initiativePath(cwd, initiative), "discovery.md");
}

/** Get the specs directory for an initiative */
export function specsDir(cwd: string, initiative: string): string {
	return join(initiativePath(cwd, initiative), "specs");
}

/** Get the path to a specific spec */
export function specPath(cwd: string, initiative: string, specName: string): string {
	return join(specsDir(cwd, initiative), `${specName}.md`);
}

/** Get the path to the plan artifact */
export function planPath(cwd: string, initiative: string): string {
	return join(initiativePath(cwd, initiative), "plan.md");
}

/** Ensure the initiative directory structure exists */
export function ensureInitiativeDir(cwd: string, initiative: string): void {
	const root = initiativePath(cwd, initiative);
	mkdirSync(root, { recursive: true });
	mkdirSync(specsDir(cwd, initiative), { recursive: true });
}

/** Read an artifact file, returns null if it doesn't exist */
export function readArtifact(path: string): string | null {
	if (!existsSync(path)) return null;
	return readFileSync(path, "utf-8");
}

/** List all spec files for an initiative */
export function listSpecs(cwd: string, initiative: string): string[] {
	const dir = specsDir(cwd, initiative);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.map((f) => f.replace(/\.md$/, ""));
}

/** Read all specs for an initiative, returns a map of name -> content */
export function readAllSpecs(cwd: string, initiative: string): Record<string, string> {
	const specs: Record<string, string> = {};
	for (const name of listSpecs(cwd, initiative)) {
		const content = readArtifact(specPath(cwd, initiative, name));
		if (content) specs[name] = content;
	}
	return specs;
}

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type ChangeStatus = "added" | "modified" | "deleted";

export type ChangeSummary = {
	path: string;
	status: ChangeStatus;
	additions: number;
	deletions: number;
};

export type ReviewEffort = "light" | "standard" | "deep";
export type TriageSource = "classifier" | "deterministic" | "fallback";

export type ReviewTriage = {
	path: string;
	effort: ReviewEffort;
	source: TriageSource;
	confidence: number | null;
	requiresIndependentReview: true;
	requiresMandatoryChecks: true;
};

type ClassifierLabel =
	| "low-review-effort"
	| "standard-review-effort"
	| "deep-review";

type ClassifierResponse = {
	results: Array<{
		label: ClassifierLabel;
		confidence: number | null;
	}>;
};

type ReviewCategory = "app-ui" | "shared-ui" | "app-code" | "test" | "other";

const CLASSIFIER_URL = "https://classifier.dev/v1/classify";
const CLASSIFIER_LABELS: ClassifierLabel[] = [
	"low-review-effort",
	"standard-review-effort",
	"deep-review",
];
const MAX_INPUTS_PER_REQUEST = 1_000;
const MIN_CONFIDENCE = 0.85;
const VALID_STATUSES = new Set<ChangeStatus>(["added", "modified", "deleted"]);

function result(
	path: string,
	effort: ReviewEffort,
	source: TriageSource,
	confidence: number | null = null,
): ReviewTriage {
	return {
		path,
		effort,
		source,
		confidence,
		requiresIndependentReview: true,
		requiresMandatoryChecks: true,
	};
}

function normalizedPath(path: string): string {
	return path.replaceAll("\\", "/").replace(/^\.\//u, "").toLowerCase();
}

function isValidChange(change: unknown): change is ChangeSummary {
	if (!change || typeof change !== "object") return false;
	const candidate = change as Partial<ChangeSummary>;
	const path = candidate.path;
	return (
		typeof path === "string" &&
		path.trim().length > 0 &&
		!path.startsWith("/") &&
		!/^[a-z]:/iu.test(path) &&
		!path.split(/[\\/]/u).includes("..") &&
		VALID_STATUSES.has(candidate.status as ChangeStatus) &&
		Number.isSafeInteger(candidate.additions) &&
		(candidate.additions ?? -1) >= 0 &&
		Number.isSafeInteger(candidate.deletions) &&
		(candidate.deletions ?? -1) >= 0
	);
}

function isProtectedPath(path: string): boolean {
	const normalized = normalizedPath(path);
	const file = normalized.split("/").at(-1) ?? "";

	return (
		[
			"agents.md",
			"claude.md",
			"design.md",
			"codeowners",
			"auth.ts",
			"proxy.ts",
		].includes(file) ||
		normalized.startsWith(".github/") ||
		normalized.startsWith(".beads/") ||
		normalized.startsWith("graft/") ||
		normalized.startsWith("packages/backend/") ||
		normalized.startsWith("packages/config/") ||
		normalized.startsWith("packages/ui/src/styles/") ||
		normalized.startsWith("apps/web/src/app/") ||
		normalized.startsWith("scripts/") ||
		normalized.startsWith("tooling/sprite-factory/") ||
		normalized.includes("/convex/") ||
		normalized.includes("/api/") ||
		normalized.includes("/auth") ||
		normalized.includes("/tenant") ||
		normalized.includes("/membership") ||
		normalized.includes("/permission") ||
		normalized.includes("/policy") ||
		normalized.includes("/security") ||
		normalized.includes("/schema") ||
		normalized.includes("/proxy.") ||
		normalized.includes("/deploy") ||
		normalized.includes("/vercel") ||
		file === ".env" ||
		file.startsWith(".env.") ||
		file === ".npmrc" ||
		file === "components.json" ||
		file === "package.json" ||
		file === "pnpm-lock.yaml" ||
		file === "pnpm-workspace.yaml" ||
		file === "turbo.json" ||
		file.startsWith("tsconfig") ||
		file.endsWith(".config.ts") ||
		file.endsWith(".config.js") ||
		file.endsWith(".config.mjs") ||
		file.endsWith(".config.json")
	);
}

function categoryFor(path: string): ReviewCategory | "documentation" | "asset" {
	const normalized = normalizedPath(path);
	const file = normalized.split("/").at(-1) ?? "";

	if (normalized.startsWith("docs/") || /\.(?:md|mdx|txt)$/u.test(file)) {
		return "documentation";
	}
	if (
		normalized.startsWith("public/") ||
		/\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/u.test(file)
	) {
		return "asset";
	}
	if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return "test";
	if (normalized.startsWith("packages/ui/")) return "shared-ui";
	if (normalized.startsWith("apps/web/src/components/")) return "app-ui";
	if (normalized.startsWith("apps/web/src/")) return "app-code";
	return "other";
}

function extensionFor(path: string): string {
	const file = normalizedPath(path).split("/").at(-1) ?? "";
	const match = /\.([a-z0-9]{1,8})$/u.exec(file);
	return match ? `.${match[1]}` : "none";
}

function classifierInput(change: ChangeSummary): string {
	return [
		`category=${categoryFor(change.path)}`,
		`extension=${extensionFor(change.path)}`,
		`status=${change.status}`,
		`additions=${change.additions}`,
		`deletions=${change.deletions}`,
	].join("; ");
}

function isClassifierResponse(value: unknown): value is ClassifierResponse {
	if (!value || typeof value !== "object" || !("results" in value))
		return false;
	const { results } = value as { results?: unknown };
	return (
		Array.isArray(results) &&
		results.every((entry) => {
			if (!entry || typeof entry !== "object") return false;
			const item = entry as { label?: unknown; confidence?: unknown };
			return (
				typeof item.label === "string" &&
				CLASSIFIER_LABELS.includes(item.label as ClassifierLabel) &&
				(item.confidence === null ||
					(typeof item.confidence === "number" &&
						Number.isFinite(item.confidence) &&
						item.confidence >= 0 &&
						item.confidence <= 1))
			);
		})
	);
}

function effortFor(label: ClassifierLabel): ReviewEffort {
	if (label === "low-review-effort") return "light";
	if (label === "deep-review") return "deep";
	return "standard";
}

async function classifyBatch(
	changes: ChangeSummary[],
	fetcher: typeof fetch,
): Promise<ReviewTriage[]> {
	const fallback = () =>
		changes.map((change) => result(change.path, "standard", "fallback"));

	try {
		const response = await fetcher(CLASSIFIER_URL, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				inputs: changes.map(classifierInput),
				labels: CLASSIFIER_LABELS,
				tier: "fast",
			}),
			signal: AbortSignal.timeout(5_000),
		});
		if (!response.ok) return fallback();

		const body: unknown = await response.json();
		if (!isClassifierResponse(body) || body.results.length !== changes.length) {
			return fallback();
		}

		return body.results.map((answer, index) => {
			const change = changes[index];
			if (
				!change ||
				answer.confidence === null ||
				answer.confidence < MIN_CONFIDENCE
			)
				return result(change?.path ?? "", "standard", "fallback");
			return result(
				change.path,
				effortFor(answer.label),
				"classifier",
				answer.confidence,
			);
		});
	} catch {
		return fallback();
	}
}

export function parseGitDiffSummaries(
	numstatOutput: string,
	nameStatusOutput: string,
): ChangeSummary[] {
	const statusTokens = nameStatusOutput.split("\0").filter(Boolean);
	const statusByPath = new Map<string, ChangeStatus>();
	for (let index = 0; index < statusTokens.length; index += 2) {
		const status = statusTokens[index];
		const path = statusTokens[index + 1];
		if (!status || !path)
			throw new Error("Malformed NUL-delimited name-status data");
		const code = status[0];
		statusByPath.set(
			path,
			code === "A" ? "added" : code === "D" ? "deleted" : "modified",
		);
	}

	const summaries: ChangeSummary[] = [];
	for (const record of numstatOutput.split("\0").filter(Boolean)) {
		const firstTab = record.indexOf("\t");
		const secondTab = record.indexOf("\t", firstTab + 1);
		if (firstTab < 0 || secondTab < 0)
			throw new Error("Malformed NUL-delimited numstat data");
		const additionsText = record.slice(0, firstTab);
		const deletionsText = record.slice(firstTab + 1, secondTab);
		const path = record.slice(secondTab + 1);
		const status = statusByPath.get(path);
		if (!path || !status)
			throw new Error("Numstat path missing from name-status data");
		const additions = additionsText === "-" ? 0 : Number(additionsText);
		const deletions = deletionsText === "-" ? 0 : Number(deletionsText);
		if (!Number.isSafeInteger(additions) || !Number.isSafeInteger(deletions))
			throw new Error("Invalid diff line counts");
		summaries.push({ path, status, additions, deletions });
	}
	if (summaries.length !== statusByPath.size)
		throw new Error("Diff stat and name-status paths do not match");
	return summaries;
}

export async function classifyChanges(
	changes: ChangeSummary[],
	fetcher: typeof fetch = fetch,
): Promise<ReviewTriage[]> {
	const output = new Array<ReviewTriage>(changes.length);
	const candidates: Array<{ index: number; change: ChangeSummary }> = [];

	for (const [index, unknownChange] of changes.entries()) {
		if (!isValidChange(unknownChange)) {
			const safePath =
				unknownChange &&
				typeof unknownChange === "object" &&
				"path" in unknownChange &&
				typeof unknownChange.path === "string"
					? unknownChange.path
					: "";
			output[index] = result(safePath, "standard", "fallback");
			continue;
		}
		const change = unknownChange;
		if (isProtectedPath(change.path)) {
			output[index] = result(change.path, "deep", "deterministic");
			continue;
		}
		const category = categoryFor(change.path);
		if (category === "documentation" || category === "asset") {
			output[index] = result(change.path, "light", "deterministic");
			continue;
		}
		candidates.push({ index, change });
	}

	for (
		let offset = 0;
		offset < candidates.length;
		offset += MAX_INPUTS_PER_REQUEST
	) {
		const batch = candidates.slice(offset, offset + MAX_INPUTS_PER_REQUEST);
		const classified = await classifyBatch(
			batch.map(({ change }) => change),
			fetcher,
		);
		for (const [index, triage] of classified.entries()) {
			const candidate = batch[index];
			if (candidate) output[candidate.index] = triage;
		}
	}

	return output;
}

export async function runReviewTriageCli(args = process.argv.slice(2)) {
	const baseIndex = args.indexOf("--base");
	const baseSha = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
	if (!baseSha || !/^[0-9a-f]{40}$/iu.test(baseSha)) {
		throw new Error(
			"Usage: tsx tooling/sprite-factory/jev-review-triage.ts --base <base-sha>",
		);
	}

	const dirty = execFileSync("git", ["status", "--porcelain"], {
		encoding: "utf8",
	});
	if (dirty.trim())
		throw new Error(
			"Commit the complete candidate first; dirty and untracked files are excluded.",
		);

	const headSha = execFileSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
	const range = `${baseSha}...${headSha}`;
	const numstat = execFileSync(
		"git",
		["diff", "--numstat", "-z", "--no-renames", range],
		{ encoding: "utf8" },
	);
	const nameStatus = execFileSync(
		"git",
		["diff", "--name-status", "-z", "--no-renames", range],
		{ encoding: "utf8" },
	);
	const changes = parseGitDiffSummaries(numstat, nameStatus);
	const results = await classifyChanges(changes);
	process.stdout.write(
		`${JSON.stringify({ baseSha, headSha, results }, null, 2)}\n`,
	);
}

const invokedPath = process.argv[1]
	? pathToFileURL(resolve(process.argv[1])).href
	: undefined;
if (invokedPath === import.meta.url) {
	runReviewTriageCli().catch((error: unknown) => {
		const message =
			error instanceof Error ? error.message : "Review triage failed";
		process.stderr.write(`${message}\n`);
		process.exitCode = 1;
	});
}

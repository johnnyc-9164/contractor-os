import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type PreviewVerificationInput = {
	target: string;
	previewUrl: string;
	expectedSha: string;
	bypassToken?: string;
};

export type PreviewVerificationResult = {
	target: "preview";
	previewUrl: string;
	expectedSha: string;
	observedSha: string;
	environment: "preview";
	convex: "ok";
};

export function assertMatchingSha(expectedSha: string, observedSha: string) {
	if (observedSha !== expectedSha) {
		throw new Error(
			`Preview SHA mismatch: expected ${expectedSha}, observed ${observedSha}`,
		);
	}
}

type HealthPayload = {
	sha?: unknown;
	environment?: unknown;
	convex?: unknown;
};

const PRODUCTION_ORIGINS = new Set(["https://contractoros-ten.vercel.app"]);
const PREVIEW_HOST_PATTERN = /^contractoros-[a-z0-9-]+-johnnyc\.vercel\.app$/u;

function required(value: string | undefined, name: string): string {
	const normalized = value?.trim();
	if (!normalized) throw new Error(`${name} is required`);
	return normalized;
}

function previewOrigin(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("Preview URL must be a valid absolute URL");
	}

	if (url.protocol !== "https:") {
		throw new Error("Preview URL must use HTTPS");
	}
	if (url.username || url.password) {
		throw new Error("Preview URL must not contain credentials");
	}
	if (PRODUCTION_ORIGINS.has(url.origin)) {
		throw new Error(`Production URL is not allowed: ${url.origin}`);
	}
	if (!PREVIEW_HOST_PATTERN.test(url.hostname)) {
		throw new Error(
			`Preview URL must use a Contractor OS Vercel Preview host; received ${url.hostname}`,
		);
	}

	return url.origin;
}

export async function verifyPreviewDeployment(
	input: PreviewVerificationInput,
	fetcher: typeof fetch = fetch,
): Promise<PreviewVerificationResult> {
	const target = required(input.target, "Deployment target").toLowerCase();
	if (target !== "preview") {
		throw new Error(
			`Deployment target must be preview; received ${JSON.stringify(target)}`,
		);
	}

	const expectedSha = required(input.expectedSha, "Expected SHA").toLowerCase();
	if (!/^[0-9a-f]{40}$/u.test(expectedSha)) {
		throw new Error("Expected SHA must be the full 40-character commit SHA");
	}
	const previewUrl = previewOrigin(required(input.previewUrl, "Preview URL"));
	const headers: Record<string, string> = { accept: "application/json" };
	if (input.bypassToken) {
		headers["x-vercel-protection-bypass"] = input.bypassToken;
	}

	const response = await fetcher(new URL("/api/health", previewUrl), {
		headers,
		redirect: "error",
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) {
		throw new Error(
			`Preview health request failed with HTTP ${response.status}`,
		);
	}

	let payload: HealthPayload;
	try {
		const value: unknown = await response.json();
		if (!value || typeof value !== "object") {
			throw new Error("invalid payload");
		}
		payload = value as HealthPayload;
	} catch {
		throw new Error("Preview health response is not valid JSON");
	}

	const observedSha =
		typeof payload.sha === "string" && payload.sha.trim()
			? payload.sha.trim().toLowerCase()
			: "<missing>";
	const environment =
		typeof payload.environment === "string" && payload.environment.trim()
			? payload.environment.trim().toLowerCase()
			: "<missing>";
	if (environment !== "preview") {
		throw new Error(
			`Deployment environment must be preview; observed ${environment}`,
		);
	}
	assertMatchingSha(expectedSha, observedSha);

	const convex =
		typeof payload.convex === "string" && payload.convex.trim()
			? payload.convex.trim()
			: "<missing>";
	if (convex !== "ok") {
		throw new Error(
			`Preview ${expectedSha} is live, but Convex health is ${convex}`,
		);
	}

	return {
		target: "preview",
		previewUrl,
		expectedSha,
		observedSha,
		environment: "preview",
		convex: "ok",
	};
}

function argument(args: string[], flag: string): string | undefined {
	const index = args.indexOf(flag);
	return index >= 0 ? args[index + 1] : undefined;
}

export async function runPreviewDeploymentCli(args = process.argv.slice(2)) {
	const result = await verifyPreviewDeployment({
		target: argument(args, "--target") ?? "",
		previewUrl: argument(args, "--preview-url") ?? "",
		expectedSha: argument(args, "--expected-sha") ?? "",
		bypassToken: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
	});

	process.stdout.write(
		`Preview verified: expected ${result.expectedSha}, observed ${result.observedSha}; Convex is healthy at ${result.previewUrl}\n`,
	);
}

const invokedPath = process.argv[1]
	? pathToFileURL(resolve(process.argv[1])).href
	: undefined;
if (invokedPath === import.meta.url) {
	runPreviewDeploymentCli().catch((error: unknown) => {
		const message =
			error instanceof Error ? error.message : "Preview verification failed";
		process.stderr.write(`${message}\n`);
		process.exitCode = 1;
	});
}

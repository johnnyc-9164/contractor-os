#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const TERMINAL_STATUSES = new Set([
	"succeeded",
	"awaiting-review",
	"blocked",
	"failed",
]);

function fail(message, code = 2) {
	const error = new Error(message);
	error.exitCode = code;
	throw error;
}

export function parseArgs(argv) {
	const options = {};
	const positionals = [];
	let passthrough = [];
	for (let index = 0; index < argv.length; index += 1) {
		const value = argv[index];
		if (value === "--") {
			passthrough = argv.slice(index + 1);
			break;
		}
		if (!value.startsWith("--")) {
			positionals.push(value);
			continue;
		}
		const key = value.slice(2);
		const next = argv[index + 1];
		if (next === undefined || next.startsWith("--")) {
			options[key] = true;
		} else {
			options[key] = next;
			index += 1;
		}
	}
	return { options, passthrough, positionals };
}

function git(root, args) {
	const result = spawnSync("git", args, {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	return result.status === 0 ? result.stdout.trim() : null;
}

function changedFiles(root) {
	const base =
		git(root, ["merge-base", "HEAD", "origin/master"]) ??
		git(root, ["merge-base", "HEAD", "master"]);
	const outputs = [
		git(root, ["diff", "--name-only"]),
		git(root, ["diff", "--cached", "--name-only"]),
		git(root, ["ls-files", "--others", "--exclude-standard"]),
		base ? git(root, ["diff", "--name-only", `${base}...HEAD`]) : null,
	];
	return [
		...new Set(
			outputs
				.flatMap((value) => (value ?? "").split("\n"))
				.filter((path) => path && !path.startsWith(".factory/runtime/")),
		),
	].sort();
}

export function resolveRoot(explicitRoot = process.env.FACTORY_ROOT) {
	if (explicitRoot) return resolve(explicitRoot);
	const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
	if (!root) fail("not inside a Git repository");
	return root;
}

function safeSegment(value, label) {
	if (!value || typeof value !== "string") fail(`${label} is required`);
	const safe = value
		.trim()
		.replace(/[^A-Za-z0-9._:-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (!safe) fail(`${label} has no usable characters`);
	return safe.slice(0, 120);
}

function now() {
	return new Date().toISOString();
}

function runtimeRoot(root) {
	return join(root, ".factory", "runtime");
}

function runDirectory(root, runId) {
	return join(runtimeRoot(root), safeSegment(runId, "run id"));
}

function statePath(root, runId) {
	return join(runDirectory(root, runId), "state.json");
}

function eventsPath(root, runId) {
	return join(runDirectory(root, runId), "events.jsonl");
}

function atomicWrite(path, value) {
	const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
	writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
	renameSync(temporary, path);
}

function readState(root, runId) {
	const path = statePath(root, runId);
	if (!existsSync(path)) fail(`unknown run: ${runId}`);
	return JSON.parse(readFileSync(path, "utf8"));
}

function readEvents(root, runId) {
	const path = eventsPath(root, runId);
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

function writeState(root, state) {
	state.updated_at = now();
	atomicWrite(statePath(root, state.run_id), state);
}

function appendEvent(root, state, event) {
	const events = readEvents(root, state.run_id);
	const entry = {
		schema_version: SCHEMA_VERSION,
		sequence: events.length + 1,
		timestamp: now(),
		run_id: state.run_id,
		task: state.task,
		...event,
	};
	appendFileSync(
		eventsPath(root, state.run_id),
		`${JSON.stringify(entry)}\n`,
		"utf8",
	);
	state.last_event = entry;
	state.phase = entry.phase ?? state.phase;
	writeState(root, state);
	return entry;
}

export function startRun({ root = resolveRoot(), task, title = "", runId }) {
	const safeTask = safeSegment(task, "task");
	const id = safeSegment(
		runId ??
			`${now().replace(/[-:.]/g, "").replace("Z", "Z")}-${safeTask}-${randomUUID().slice(0, 8)}`,
		"run id",
	);
	const directory = runDirectory(root, id);
	if (existsSync(directory)) fail(`run already exists: ${id}`);
	mkdirSync(directory, { recursive: true });
	const state = {
		schema_version: SCHEMA_VERSION,
		run_id: id,
		task: safeTask,
		title,
		status: "running",
		phase: "started",
		started_at: now(),
		updated_at: now(),
		branch: git(root, ["branch", "--show-current"]) ?? "unknown",
		head_sha: git(root, ["rev-parse", "HEAD"]) ?? "unknown",
		gates: [],
		verification: "not-run",
	};
	atomicWrite(statePath(root, id), state);
	appendEvent(root, state, {
		type: "run.started",
		phase: "started",
		message: title,
	});
	return readState(root, id);
}

export function recordEvent({
	root = resolveRoot(),
	runId,
	phase,
	message,
	type = "progress",
	evidence,
}) {
	const state = readState(root, runId);
	if (state.status !== "running") fail(`run is terminal: ${runId}`);
	return appendEvent(root, state, {
		type,
		phase: phase || state.phase,
		message: message || "",
		...(evidence ? { evidence } : {}),
	});
}

export function runCommand({
	root = resolveRoot(),
	runId,
	phase = "execution",
	command,
}) {
	if (!Array.isArray(command) || command.length === 0)
		fail("command is required after --");
	const state = readState(root, runId);
	if (state.status !== "running") fail(`run is terminal: ${runId}`);
	appendEvent(root, state, {
		type: "command.started",
		phase,
		command,
		message: command.join(" "),
	});
	const result = spawnSync(command[0], command.slice(1), {
		cwd: root,
		env: process.env,
		stdio: "inherit",
	});
	const exitCode = Number.isInteger(result.status) ? result.status : 1;
	const refreshed = readState(root, runId);
	appendEvent(root, refreshed, {
		type: "command.finished",
		phase,
		command,
		exit_code: exitCode,
		message: `${command[0]} exited ${exitCode}`,
	});
	return exitCode;
}

export function runGate({ root = resolveRoot(), runId, level = "full" }) {
	if (!new Set(["fast", "full", "deep"]).has(level))
		fail(`invalid gate level: ${level}`);
	const state = readState(root, runId);
	if (state.status !== "running") fail(`run is terminal: ${runId}`);
	appendEvent(root, state, {
		type: "gate.started",
		phase: "verification",
		message: `Running ${level} gates`,
		gate_level: level,
	});
	const result = spawnSync("bash", [".claude/scripts/gates.sh", level], {
		cwd: root,
		encoding: "utf8",
		env: process.env,
		maxBuffer: 64 * 1024 * 1024,
	});
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	const verdict = combined
		.split("\n")
		.reverse()
		.find((line) => line.startsWith("FACTORY_GATES:"));
	const gateStatus =
		verdict?.match(/\bstatus=(GREEN|RED|MISCONFIGURED)\b/)?.[1] ??
		"MISCONFIGURED";
	const refreshed = readState(root, runId);
	refreshed.gates.push({
		level,
		status: gateStatus,
		verdict:
			verdict ?? "FACTORY_GATES: status=MISCONFIGURED reason=missing-verdict",
		exit_code: Number.isInteger(result.status) ? result.status : 2,
		finished_at: now(),
	});
	writeState(root, refreshed);
	appendEvent(root, refreshed, {
		type: "gate.finished",
		phase: "verification",
		message: verdict ?? "Gate script emitted no verdict",
		gate_level: level,
		gate_status: gateStatus,
		exit_code: Number.isInteger(result.status) ? result.status : 2,
	});
	return Number.isInteger(result.status) ? result.status : 2;
}

export function finishRun({
	root = resolveRoot(),
	runId,
	status,
	summary,
	verification = "not-run",
	pullRequest = null,
}) {
	if (!TERMINAL_STATUSES.has(status))
		fail(`invalid terminal status: ${status}`);
	const state = readState(root, runId);
	if (state.status !== "running") fail(`run is already terminal: ${runId}`);
	const latestGate = state.gates.at(-1) ?? null;
	if (status === "succeeded" && latestGate?.status !== "GREEN") {
		fail("a succeeded run requires a recorded GREEN gate");
	}
	if (status === "succeeded" && verification !== "accepted") {
		fail("a succeeded run requires independent verification=accepted");
	}
	state.status = status;
	state.summary = summary || "";
	state.verification = verification;
	state.pull_request = pullRequest;
	state.finished_at = now();
	state.branch = git(root, ["branch", "--show-current"]) ?? state.branch;
	state.head_sha = git(root, ["rev-parse", "HEAD"]) ?? state.head_sha;
	state.changed_files = changedFiles(root);
	writeState(root, state);
	appendEvent(root, state, {
		type: "run.finished",
		phase: "finished",
		message: state.summary,
		status,
		verification,
	});
	const completed = readState(root, runId);
	const durableDirectory = join(root, "docs", "factory", "runs");
	mkdirSync(durableDirectory, { recursive: true });
	const durablePath = join(
		durableDirectory,
		`${safeSegment(runId, "run id")}.json`,
	);
	const record = { ...completed, events: readEvents(root, runId) };
	writeFileSync(durablePath, `${JSON.stringify(record, null, 2)}\n`, {
		encoding: "utf8",
		flag: "wx",
	});
	return { ...completed, durable_path: durablePath };
}

export function getStatus({ root = resolveRoot(), runId } = {}) {
	const base = runtimeRoot(root);
	const ids = runId
		? [safeSegment(runId, "run id")]
		: existsSync(base)
			? readdirSync(base, { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.map((entry) => entry.name)
			: [];
	const runs = ids
		.filter((id) => existsSync(statePath(root, id)))
		.map((id) => readState(root, id))
		.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
	return {
		schema_version: SCHEMA_VERSION,
		repository: basename(root),
		branch: git(root, ["branch", "--show-current"]) ?? "unknown",
		head_sha: git(root, ["rev-parse", "HEAD"]) ?? "unknown",
		working_tree: (git(root, ["status", "--short"]) ?? "")
			.split("\n")
			.filter(Boolean),
		runs,
	};
}

export function doctor({ root = resolveRoot() } = {}) {
	const requiredFiles = [
		"AGENTS.md",
		"CLAUDE.md",
		"WORKFLOW.md",
		"docs/factory/CHARTER.md",
		"docs/factory/CONTRACT.md",
		".factory/gates.conf",
		".claude/scripts/gates.sh",
	];
	const commands = ["git", "node", "pnpm", "rg"];
	const checks = [
		...requiredFiles.map((path) => ({
			check: `file:${path}`,
			status: existsSync(join(root, path)) ? "pass" : "fail",
		})),
		...commands.map((command) => ({
			check: `command:${command}`,
			status:
				spawnSync("sh", ["-lc", `command -v ${command}`], { cwd: root })
					.status === 0
					? "pass"
					: "fail",
		})),
	];
	const environment = [
		"GITHUB_TOKEN",
		"SYMPHONY_WORKSPACE_ROOT",
		"SOURCE_REPO_URL",
	].map((key) => ({
		key,
		present: Boolean(process.env[key]),
	}));
	return {
		schema_version: SCHEMA_VERSION,
		status: checks.some((check) => check.status === "fail") ? "fail" : "pass",
		checks,
		environment,
		note: "Environment values are never printed; presence is informational for the Symphony host.",
	};
}

function printHumanStatus(status) {
	for (const run of status.runs) {
		process.stdout.write(
			`${run.run_id}  ${run.status}  ${run.phase}  ${run.task}  ${run.last_event?.message ?? ""}\n`,
		);
	}
	if (status.runs.length === 0)
		process.stdout.write("No factory runs found in this workspace.\n");
}

export async function main(argv = process.argv.slice(2)) {
	const [command, ...rest] = argv;
	const { options, passthrough } = parseArgs(rest);
	const root = resolveRoot(options.root);
	switch (command) {
		case "start": {
			const state = startRun({
				root,
				task: options.task,
				title: options.title,
				runId: options.run,
			});
			process.stdout.write(`${JSON.stringify(state)}\n`);
			return 0;
		}
		case "event": {
			const event = recordEvent({
				root,
				runId: options.run,
				phase: options.phase,
				message: options.message,
				type: options.type,
				evidence: options.evidence,
			});
			process.stdout.write(`${JSON.stringify(event)}\n`);
			return 0;
		}
		case "exec":
			return runCommand({
				root,
				runId: options.run,
				phase: options.phase,
				command: passthrough,
			});
		case "gate":
			return runGate({ root, runId: options.run, level: options.level });
		case "finish": {
			const state = finishRun({
				root,
				runId: options.run,
				status: options.status,
				summary: options.summary,
				verification: options.verification,
				pullRequest: options.pr,
			});
			process.stdout.write(`${JSON.stringify(state)}\n`);
			return 0;
		}
		case "status": {
			const status = getStatus({ root, runId: options.run });
			if (options.json)
				process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
			else printHumanStatus(status);
			return 0;
		}
		case "doctor": {
			const result = doctor({ root });
			if (options.json)
				process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
			else
				for (const check of result.checks)
					process.stdout.write(
						`${check.status.toUpperCase()}  ${check.check}\n`,
					);
			return result.status === "pass" ? 0 : 1;
		}
		default:
			fail("usage: harness.mjs start|event|exec|gate|finish|status|doctor");
	}
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	main().then(
		(code) => {
			process.exitCode = code;
		},
		(error) => {
			process.stderr.write(`factory: ${error.message}\n`);
			process.exitCode = error.exitCode ?? 1;
		},
	);
}

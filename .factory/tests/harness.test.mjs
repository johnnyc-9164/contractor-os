import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	doctor,
	finalizeRun,
	finishRun,
	getStatus,
	recordEvent,
	runCommand,
	startRun,
} from "../harness.mjs";

function repository() {
	const root = mkdtempSync(join(tmpdir(), "contractor-factory-test-"));
	execFileSync("git", ["init", "-q"], { cwd: root });
	execFileSync(
		"git",
		["config", "user.email", "factory-test@example.invalid"],
		{ cwd: root },
	);
	execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
	for (const path of [
		".factory/runtime",
		".claude/scripts",
		"docs/factory/runs",
	])
		mkdirSync(join(root, path), { recursive: true });
	for (const path of [
		"AGENTS.md",
		"CLAUDE.md",
		"WORKFLOW.md",
		"docs/factory/CHARTER.md",
		"docs/factory/CONTRACT.md",
		".factory/gates.conf",
		".claude/scripts/gates.sh",
	]) {
		writeFileSync(join(root, path), `${path}\n`, "utf8");
	}
	writeFileSync(
		join(root, ".factory/runtime/.gitignore"),
		"*\n!.gitignore\n",
		"utf8",
	);
	writeFileSync(join(root, "tracked.txt"), "baseline\n", "utf8");
	execFileSync("git", ["add", "."], { cwd: root });
	execFileSync("git", ["commit", "-qm", "baseline"], { cwd: root });
	execFileSync("git", ["branch", "-M", "master"], { cwd: root });
	return root;
}

test("run lifecycle produces observable and durable evidence", () => {
	const root = repository();
	execFileSync("git", ["update-ref", "refs/remotes/origin/master", "HEAD"], {
		cwd: root,
	});
	const state = startRun({
		root,
		task: "COS-76",
		title: "Build the lead flow",
		runId: "run-COS-76",
	});
	assert.equal(state.status, "running");
	recordEvent({
		root,
		runId: state.run_id,
		phase: "reproduction",
		message: "Reproduced missing state",
	});
	assert.equal(
		runCommand({
			root,
			runId: state.run_id,
			phase: "test",
			command: ["node", "-e", "process.exit(0)"],
		}),
		0,
	);
	writeFileSync(join(root, "tracked.txt"), "changed\n", "utf8");

	const statePath = join(root, ".factory/runtime/run-COS-76/state.json");
	const current = JSON.parse(readFileSync(statePath, "utf8"));
	current.gates.push({
		status: "GREEN",
		level: "full",
		verdict: "FACTORY_GATES: level=full status=GREEN",
		exit_code: 0,
	});
	writeFileSync(statePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");

	const finished = finishRun({
		root,
		runId: state.run_id,
		status: "awaiting-review",
		summary: "Lead flow ready for controller review",
	});
	assert.equal(finished.status, "awaiting-review");
	assert.equal(finished.record_status, "pending-controller-finalization");
	const durablePath = join(root, "docs/factory/runs/run-COS-76.json");
	assert.equal(existsSync(durablePath), false);

	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	execFileSync("git", ["add", "tracked.txt"], { cwd: root });
	execFileSync("git", ["commit", "-qm", "candidate"], { cwd: root });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	const finalized = finalizeRun({
		root,
		runId: state.run_id,
		candidateSha,
	});
	assert.equal(finalized.candidate_sha, candidateSha);
	const durable = JSON.parse(readFileSync(durablePath, "utf8"));
	assert.ok(durable.events.length >= 5);
	assert.equal(durable.summary, "Lead flow ready for controller review");
	assert.deepEqual(durable.changed_files, ["tracked.txt"]);
	assert.deepEqual(durable.worker_changed_files, ["tracked.txt"]);
	assert.equal(durable.worker_branch, "master");
	assert.equal(durable.branch, "candidate");
	assert.equal(durable.head_sha, candidateSha);
	assert.notEqual(durable.worker_head_sha, candidateSha);
	assert.equal(getStatus({ root }).runs[0].status, "awaiting-review");
});

test("controller finalization rejects a dirty or mismatched candidate", () => {
	const root = repository();
	startRun({ root, task: "COS-78", runId: "run-COS-78" });
	finishRun({ root, runId: "run-COS-78", status: "blocked" });
	assert.throws(
		() =>
			finalizeRun({
				root,
				runId: "run-COS-78",
				candidateSha: "not-current-head",
			}),
		/candidate SHA must equal/,
	);
	writeFileSync(join(root, "untracked.ts"), "export {};\n", "utf8");
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: "run-COS-78", candidateSha }),
		/candidate working tree is not clean/,
	);
});

test("controller finalization rejects protected branch candidates", () => {
	const root = repository();
	startRun({ root, task: "COS-79", runId: "run-COS-79" });
	finishRun({ root, runId: "run-COS-79", status: "blocked" });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: "run-COS-79", candidateSha }),
		/candidate branch is protected: master/,
	);
});

test("controller finalization rejects review candidates without a green gate", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-80", runId: "run-COS-80" });
	finishRun({ root, runId: state.run_id, status: "awaiting-review" });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: state.run_id, candidateSha }),
		/a review candidate requires a recorded GREEN gate with exit code 0/,
	);
});

test("controller finalization rejects a green verdict with a nonzero exit", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-80B", runId: "run-COS-80B" });
	const statePath = join(root, ".factory/runtime/run-COS-80B/state.json");
	const current = JSON.parse(readFileSync(statePath, "utf8"));
	current.gates.push({ status: "GREEN", exit_code: 1 });
	writeFileSync(statePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
	finishRun({ root, runId: state.run_id, status: "awaiting-review" });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: state.run_id, candidateSha }),
		/a review candidate requires a recorded GREEN gate with exit code 0/,
	);
});

test("controller finalization includes tracked runtime metadata in dirty checks", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-81", runId: "run-COS-81" });
	finishRun({ root, runId: state.run_id, status: "blocked" });
	writeFileSync(
		join(root, ".factory/runtime/.gitignore"),
		"*\n!.gitignore\n# tracked change\n",
		"utf8",
	);
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: state.run_id, candidateSha }),
		/candidate working tree is not clean: \.factory\/runtime\/\.gitignore/,
	);
});

test("controller finalization disables worker repository Git hooks", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-82", runId: "run-COS-82" });
	finishRun({ root, runId: state.run_id, status: "blocked" });
	const marker = join(root, "controller-context-was-executed");
	const hook = join(root, ".git", "malicious-fsmonitor.sh");
	writeFileSync(
		hook,
		'#!/bin/sh\nprintf "executed\\n" > "$FACTORY_PROBE_MARKER"\nexit 1\n',
		{ encoding: "utf8", mode: 0o755 },
	);
	execFileSync("git", ["config", "core.fsmonitor", hook], { cwd: root });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	const previousMarker = process.env.FACTORY_PROBE_MARKER;
	process.env.FACTORY_PROBE_MARKER = marker;
	try {
		finalizeRun({ root, runId: state.run_id, candidateSha });
	} finally {
		if (previousMarker === undefined) delete process.env.FACTORY_PROBE_MARKER;
		else process.env.FACTORY_PROBE_MARKER = previousMarker;
	}
	assert.equal(existsSync(marker), false);
});

test("controller finalization fails closed when Git cleanliness probes error", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-83", runId: "run-COS-83" });
	finishRun({ root, runId: state.run_id, status: "blocked" });
	writeFileSync(join(root, "tracked.txt"), "changed\n", "utf8");
	writeFileSync(join(root, ".git/index"), "not a git index\n", "utf8");
	assert.throws(
		() =>
			finalizeRun({ root, runId: state.run_id, candidateSha: state.base_sha }),
		/unable to inspect unstaged candidate changes: Git command failed/,
	);
});

test("controller finalization rejects symlinks in the durable record path", () => {
	const root = repository();
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	const state = startRun({ root, task: "COS-84", runId: "run-COS-84" });
	finishRun({ root, runId: state.run_id, status: "blocked" });
	const external = mkdtempSync(join(tmpdir(), "contractor-factory-external-"));
	rmSync(join(root, "docs/factory/runs"), { recursive: true });
	symlinkSync(external, join(root, "docs/factory/runs"), "dir");
	execFileSync("git", ["add", "-A"], { cwd: root });
	execFileSync("git", ["commit", "-qm", "malicious durable path"], {
		cwd: root,
	});
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	assert.throws(
		() => finalizeRun({ root, runId: state.run_id, candidateSha }),
		/durable record path is not a real directory/,
	);
	assert.equal(existsSync(join(external, "run-COS-84.json")), false);
});

test("durable evidence recomputes candidate changed files from the approved base", () => {
	const root = repository();
	const state = startRun({ root, task: "COS-85", runId: "run-COS-85" });
	writeFileSync(join(root, "tracked.txt"), "worker change\n", "utf8");
	finishRun({ root, runId: state.run_id, status: "blocked" });
	execFileSync("git", ["restore", "tracked.txt"], { cwd: root });
	execFileSync("git", ["switch", "-qc", "candidate"], { cwd: root });
	writeFileSync(join(root, "candidate.txt"), "controller candidate\n", "utf8");
	execFileSync("git", ["add", "candidate.txt"], { cwd: root });
	execFileSync("git", ["commit", "-qm", "different candidate"], { cwd: root });
	const candidateSha = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	const finalized = finalizeRun({ root, runId: state.run_id, candidateSha });
	assert.deepEqual(finalized.worker_changed_files, ["tracked.txt"]);
	assert.deepEqual(finalized.changed_files, ["candidate.txt"]);
});

test("success fails closed without green gates and independent acceptance", () => {
	const root = repository();
	startRun({ root, task: "COS-77", runId: "run-COS-77" });
	assert.throws(
		() =>
			finishRun({
				root,
				runId: "run-COS-77",
				status: "succeeded",
				verification: "accepted",
			}),
		/requires a recorded GREEN gate/,
	);
});

test("doctor reports file and command checks without exposing values", () => {
	const root = repository();
	const result = doctor({ root, isCommandAvailable: () => true });
	assert.equal(result.status, "pass");
	assert.equal(result.environment.length, 3);
	assert.ok(
		result.environment.every(
			(entry) => Object.keys(entry).sort().join(",") === "key,present",
		),
	);
});

test("doctor fails closed for a missing hard prerequisite", () => {
	const root = repository();
	const result = doctor({
		root,
		isCommandAvailable: (command) => command !== "graft",
	});
	assert.equal(result.status, "fail");
	assert.deepEqual(
		result.checks.find((check) => check.check === "command:graft"),
		{ check: "command:graft", status: "fail" },
	);
});

test("controller handoff fails closed when GitHub label lookup fails", () => {
	const root = mkdtempSync(join(tmpdir(), "contractor-factory-gh-test-"));
	const bin = join(root, "bin");
	mkdirSync(bin, { recursive: true });
	writeFileSync(
		join(bin, "gh"),
		`#!/bin/sh
if [ "$1 $2" = "auth status" ]; then exit 0; fi
if [ "$1 $2" = "issue view" ]; then exit 55; fi
exit 0
`,
		{ encoding: "utf8", mode: 0o755 },
	);
	const script = fileURLToPath(
		new URL("../scripts/bootstrap-github.sh", import.meta.url),
	);
	assert.throws(
		() =>
			execFileSync("bash", [script, "--handoff", "80"], {
				env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
				stdio: "pipe",
			}),
		(error) => {
			assert.equal(error.status, 1);
			assert.match(
				error.stderr.toString(),
				/unable to read issue labels before handoff/,
			);
			return true;
		},
	);
});

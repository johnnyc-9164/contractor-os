import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	doctor,
	finishRun,
	getStatus,
	recordEvent,
	runCommand,
	startRun,
} from "../harness.mjs";

function repository() {
	const root = mkdtempSync(join(tmpdir(), "contractor-factory-test-"));
	execFileSync("git", ["init", "-q"], { cwd: root });
	execFileSync("git", ["config", "user.email", "factory-test@example.invalid"], { cwd: root });
	execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
	for (const path of [
		".factory/runtime",
		".claude/scripts",
		"docs/factory/runs",
	]) mkdirSync(join(root, path), { recursive: true });
	for (const path of ["AGENTS.md", "CLAUDE.md", "WORKFLOW.md", "docs/factory/CHARTER.md", "docs/factory/CONTRACT.md", ".factory/gates.conf", ".claude/scripts/gates.sh"]) {
		writeFileSync(join(root, path), `${path}\n`, "utf8");
	}
	writeFileSync(join(root, "tracked.txt"), "baseline\n", "utf8");
	execFileSync("git", ["add", "."], { cwd: root });
	execFileSync("git", ["commit", "-qm", "baseline"], { cwd: root });
	return root;
}

test("run lifecycle produces observable and durable evidence", () => {
	const root = repository();
	const state = startRun({ root, task: "COS-76", title: "Build the lead flow", runId: "run-COS-76" });
	assert.equal(state.status, "running");
	recordEvent({ root, runId: state.run_id, phase: "reproduction", message: "Reproduced missing state" });
	assert.equal(runCommand({ root, runId: state.run_id, phase: "test", command: ["node", "-e", "process.exit(0)"] }), 0);
	writeFileSync(join(root, "tracked.txt"), "changed\n", "utf8");

	const statePath = join(root, ".factory/runtime/run-COS-76/state.json");
	const current = JSON.parse(readFileSync(statePath, "utf8"));
	current.gates.push({ status: "GREEN", level: "full", verdict: "FACTORY_GATES: level=full status=GREEN" });
	writeFileSync(statePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");

	const finished = finishRun({
		root,
		runId: state.run_id,
		status: "succeeded",
		summary: "Lead flow verified",
		verification: "accepted",
	});
	assert.equal(finished.status, "succeeded");
	const durable = JSON.parse(readFileSync(join(root, "docs/factory/runs/run-COS-76.json"), "utf8"));
	assert.ok(durable.events.length >= 5);
	assert.equal(durable.summary, "Lead flow verified");
	assert.deepEqual(durable.changed_files, ["tracked.txt"]);
	assert.equal(getStatus({ root }).runs[0].status, "succeeded");
});

test("success fails closed without green gates and independent acceptance", () => {
	const root = repository();
	startRun({ root, task: "COS-77", runId: "run-COS-77" });
	assert.throws(
		() => finishRun({ root, runId: "run-COS-77", status: "succeeded", verification: "accepted" }),
		/requires a recorded GREEN gate/,
	);
});

test("doctor reports file and command checks without exposing values", () => {
	const root = repository();
	const result = doctor({ root });
	assert.equal(result.status, "pass");
	assert.equal(result.environment.length, 3);
	assert.ok(result.environment.every((entry) => Object.keys(entry).sort().join(",") === "key,present"));
});

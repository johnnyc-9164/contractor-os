/**
 * Smart postinstall for varlock codegen.
 *
 * The generated apps/web/src/env.ts is gitignored, so it must be created
 * during install/build. Varlock needs either .env files or environment
 * variables.
 *
 * Strategy:
 * 1. If apps/web/.env or .env.local exists -> run varlock (uses the files).
 * 2. Else, parse .env.schema for var names, check process.env, write the
 *    found ones to a temp .env, run varlock, delete the temp file.
 * 3. Else -> skip gracefully (don't break install).
 *
 * Cross-platform (Node.js, works on Windows/Linux/macOS).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, "..");
const webDir = path.join(repoRoot, "apps", "web");
const envPath = path.join(webDir, ".env");
const envLocalPath = path.join(webDir, ".env.local");
const schemaPath = path.join(webDir, ".env.schema");

function runVarlock() {
	execSync("varlock codegen --path ./apps/web/", {
		stdio: "inherit",
		cwd: repoRoot,
	});
}

// Case 1: .env file exists, use it directly.
if (fs.existsSync(envPath) || fs.existsSync(envLocalPath)) {
	console.log("[postinstall] Found .env, running varlock codegen...");
	try {
		runVarlock();
		console.log("[postinstall] ✅ Code generated successfully");
	} catch (e) {
		console.log("[postinstall] varlock failed, skipping (non-fatal)");
	}
	process.exit(0);
}

// Case 2: No .env. Try to build one from environment variables.
if (fs.existsSync(schemaPath)) {
	const schema = fs.readFileSync(schemaPath, "utf8");
	const varNames = schema
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"))
		.map((line) => line.split("=")[0].trim())
		.filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));

	const found = {};
	for (const name of varNames) {
		if (process.env[name] !== undefined && process.env[name] !== "") {
			found[name] = process.env[name];
		}
	}

	if (Object.keys(found).length > 0) {
		console.log(
			`[postinstall] No .env file, generating from ${Object.keys(found).length} environment variables...`,
		);
		const envContent = Object.entries(found)
			.map(([k, v]) => `${k}=${v}`)
			.join("\n");
		fs.writeFileSync(envPath, envContent);
		try {
			runVarlock();
			console.log("[postinstall] ✅ Code generated successfully");
		} catch (e) {
			console.log("[postinstall] varlock failed, skipping (non-fatal)");
		} finally {
			try {
				fs.unlinkSync(envPath);
			} catch {}
		}
		process.exit(0);
	}
}

// Case 3: Nothing to work with, skip gracefully.
console.log(
	"[postinstall] No .env file and no env vars, skipping varlock codegen",
);
process.exit(0);

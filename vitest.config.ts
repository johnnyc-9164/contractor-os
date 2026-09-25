import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: [
			"packages/*/src/**/*.test.ts",
			"packages/backend/convex/**/*.test.ts",
			"apps/web/src/**/*.test.ts",
		],
	},
});

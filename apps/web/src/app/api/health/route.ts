import { api } from "@contractor-os/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export const dynamic = "force-dynamic";

export async function GET() {
	const sha =
		process.env.VERCEL_GIT_COMMIT_SHA ??
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
		"unknown";
	let convex: "ok" | "error" = "error";

	try {
		const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
		if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");

		const client = new ConvexHttpClient(convexUrl);
		await client.query(api.healthCheck.get);
		convex = "ok";
	} catch {
		convex = "error";
	}

	return Response.json({ sha, convex, ts: new Date().toISOString() });
}

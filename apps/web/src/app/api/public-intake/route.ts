import { api } from "@contractor-os/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

async function fingerprintFor(request: Request) {
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	const userAgent = request.headers.get("user-agent") ?? "";
	const acceptLanguage = request.headers.get("accept-language") ?? "";
	const material = `${forwarded ?? "unknown"}|${userAgent}|${acceptLanguage}`;
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(material),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function statusFor(code: string) {
	if (code === "RATE_LIMITED") return 429;
	if (code === "SITE_UNAVAILABLE") return 503;
	return 400;
}

export async function POST(request: Request) {
	const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
	const bridgeSecret = process.env.PUBLIC_INTAKE_BRIDGE_SECRET;
	if (!convexUrl || !bridgeSecret) {
		return Response.json(
			{ ok: false, received: false, error: { code: "SITE_UNAVAILABLE" } },
			{ status: 503 },
		);
	}
	let body: Body;
	try {
		body = (await request.json()) as Body;
	} catch {
		return Response.json(
			{ ok: false, received: false, error: { code: "VALIDATION" } },
			{ status: 400 },
		);
	}
	try {
		const client = new ConvexHttpClient(convexUrl);
		const result = await client.mutation(api.publicIntake.submit, {
			bridgeSecret,
			idempotencyKey: text(body.idempotencyKey),
			fingerprint: await fingerprintFor(request),
			payload: {
				contactName: text(body.contactName),
				email: text(body.email) || undefined,
				phone: text(body.phone) || undefined,
				projectType: text(body.projectType),
				location: text(body.location),
				timeline: text(body.timeline) || undefined,
				notes: text(body.notes) || undefined,
				consent: body.consent === true,
				consentPolicyVersion: text(body.consentPolicyVersion) || undefined,
			},
		});
		return Response.json(result, {
			status: result.ok ? 200 : statusFor(result.error.code),
		});
	} catch {
		return Response.json(
			{ ok: false, received: false, error: { code: "SITE_UNAVAILABLE" } },
			{ status: 503 },
		);
	}
}

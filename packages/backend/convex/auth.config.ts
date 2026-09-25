import type { AuthConfig } from "convex/server";

export default {
	providers: [
		{
			// Clerk Frontend API URL from the Convex integration in the Clerk Dashboard.
			// Set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment (npx convex env set).
			// See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
			// biome-ignore lint/style/noNonNullAssertion: The Convex deployment contract requires this environment variable.
			domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;

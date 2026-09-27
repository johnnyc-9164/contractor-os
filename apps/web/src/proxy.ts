import { clerkClient, clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export function isProtectedRoute(pathname: string): boolean {
	// NOTE: route groups like (app) never appear in real URL pathnames, so the
	// guard must name the actual paths. /(app) entries below are dead and kept
	// only as documentation of intent; /leads is the live (app) route.
	return (
		pathname === "/dashboard" ||
		pathname.startsWith("/dashboard/") ||
		pathname === "/leads" ||
		pathname.startsWith("/leads/")
	);
}

function getAdminEmails(): string[] {
	return (process.env.ADMIN_EMAILS ?? "")
		.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
}

function isAllowlistExempt(pathname: string): boolean {
	return (
		pathname === "/sign-in" ||
		pathname.startsWith("/sign-in/") ||
		pathname === "/not-authorized" ||
		pathname.startsWith("/api/") ||
		pathname.startsWith("/__clerk/")
	);
}

export default clerkMiddleware(
	async (auth, request) => {
		const pathname = request.nextUrl.pathname;

		if (isProtectedRoute(pathname)) await auth.protect();

		// Private admin panel: only allowlisted emails may use the app. This
		// runs server-side in middleware so it cannot be bypassed from the
		// client. Signed-out visitors pass through here; auth.protect() above
		// already redirects them away from protected routes. Set ADMIN_EMAILS
		// (comma-separated) in the Vercel project env. Fail closed: an empty
		// or missing ADMIN_EMAILS admits nobody.
		if (isAllowlistExempt(pathname)) return;

		const { userId } = await auth();
		if (!userId) return;

		const client = await clerkClient();
		const user = await client.users.getUser(userId);
		const primary = user.emailAddresses.find(
			(address) => address.id === user.primaryEmailAddressId,
		);
		const email = (
			primary ?? user.emailAddresses[0]
		)?.emailAddress?.toLowerCase();
		if (!email || !getAdminEmails().includes(email)) {
			const url = request.nextUrl.clone();
			url.pathname = "/not-authorized";
			url.search = "";
			return NextResponse.redirect(url);
		}
	},
	{
		// Signed-out visitors to protected routes redirect here instead of
		// hitting a dead end (previously rewrote to /404: no sign-in route
		// existed). No signUpUrl: this panel has no public sign-up surface.
		signInUrl: "/sign-in",
	},
);

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
		"/__clerk/(.*)",
	],
};

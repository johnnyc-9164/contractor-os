import { clerkMiddleware } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, request) => {
	if (isProtectedRoute(request.nextUrl.pathname)) await auth.protect();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
		"/__clerk/(.*)",
	],
};

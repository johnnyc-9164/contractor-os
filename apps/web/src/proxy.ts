import { clerkMiddleware } from "@clerk/nextjs/server";

// Public URL surface. Everything else requires authentication by default.
// The (app) route group — present and future routes — is protected without
// naming paths: route groups like (app) never appear in URL pathnames, so
// the guard allowlists the small, stable public surface instead of
// maintaining a list of protected paths (which ships new routes unguarded
// when forgotten). Adding a public page is a deliberate allowlist edit;
// adding an (app) page needs no guard change.
function isPublicPath(pathname: string): boolean {
	// Marketing / landing page
	if (pathname === "/") return true;
	// Access-denied page must be reachable without auth
	if (pathname === "/no-access") return true;
	// API routes manage their own auth
	if (pathname === "/api" || pathname.startsWith("/api/")) return true;
	if (pathname === "/trpc" || pathname.startsWith("/trpc/")) return true;
	// Clerk internal routes
	if (pathname.startsWith("/__clerk/")) return true;
	return false;
}

export function isProtectedRoute(pathname: string): boolean {
	return !isPublicPath(pathname);
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

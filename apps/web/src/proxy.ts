import { clerkMiddleware } from "@clerk/nextjs/server";

export function isProtectedRoute(pathname: string): boolean {
	return (
		pathname === "/dashboard" ||
		pathname.startsWith("/dashboard/") ||
		pathname === "/(app)" ||
		pathname.startsWith("/(app)/")
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

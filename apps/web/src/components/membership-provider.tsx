"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

export type MembershipRole = "viewer" | "operator" | "admin";

interface MembershipContextValue {
	role: MembershipRole | null;
	enabled: boolean;
	isLoading: boolean;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
	const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
	const membership = useQuery(
		api.memberships.get,
		isClerkLoaded && isSignedIn && !isAuthLoading && isAuthenticated
			? {}
			: "skip",
	);
	const router = useRouter();
	const pathname = usePathname();
	const value = {
		role: membership?.role ?? null,
		enabled: Boolean(isSignedIn && isAuthenticated && membership?.enabled),
		isLoading:
			!isClerkLoaded ||
			isAuthLoading ||
			(isSignedIn && isAuthenticated && membership === undefined),
	};
	const authenticationFailed =
		isClerkLoaded && isSignedIn && !isAuthLoading && !isAuthenticated;

	useEffect(() => {
		if (
			isClerkLoaded &&
			isSignedIn &&
			isAuthenticated &&
			!value.isLoading &&
			!value.enabled &&
			pathname !== "/no-access"
		) {
			router.replace("/no-access");
		}
	}, [
		isClerkLoaded,
		isSignedIn,
		isAuthenticated,
		pathname,
		router,
		value.enabled,
		value.isLoading,
	]);

	if (authenticationFailed) {
		return (
			<main role="alert" className="mx-auto max-w-lg space-y-4 p-8">
				<h1 className="font-semibold text-2xl">Unable to verify access</h1>
				<p>
					We could not verify your account. Try again, or sign out from the
					account menu and sign back in.
				</p>
				<a href={pathname} className="underline">
					Try again
				</a>
				<UserButton />
			</main>
		);
	}

	if (value.isLoading || !value.enabled) return null;

	return (
		<MembershipContext.Provider value={value}>
			{children}
		</MembershipContext.Provider>
	);
}

export function useMembership(): MembershipContextValue {
	const membership = useContext(MembershipContext);
	if (!membership) {
		throw new Error("useMembership must be used within MembershipProvider");
	}
	return membership;
}

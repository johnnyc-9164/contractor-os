"use client";

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
	const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
	const membership = useQuery(
		api.memberships.get,
		!isAuthLoading && isAuthenticated ? {} : "skip",
	);
	const router = useRouter();
	const pathname = usePathname();
	const value = {
		role: membership?.role ?? null,
		enabled: isAuthenticated && (membership?.enabled ?? false),
		isLoading: isAuthLoading || (isAuthenticated && membership === undefined),
	};

	useEffect(() => {
		if (
			isAuthenticated &&
			!value.isLoading &&
			!value.enabled &&
			pathname !== "/no-access"
		) {
			router.replace("/no-access");
		}
	}, [isAuthenticated, pathname, router, value.enabled, value.isLoading]);

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

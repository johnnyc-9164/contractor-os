"use client";

import { SignInButton } from "@clerk/nextjs";
import { api } from "@contractor-os/backend/convex/_generated/api";
import { Button } from "@contractor-os/ui/components/button";
import { useConvexAuth, useQueries } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { WorkspaceError, WorkspaceFeedback } from "./workspace-feedback";

export type MembershipRole = "viewer" | "operator" | "admin";

interface MembershipContextValue {
	role: MembershipRole | null;
	enabled: boolean;
	isLoading: boolean;
}

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function useWorkspaceMembership() {
	const { isLoading, isAuthenticated, isRefreshing } = useConvexAuth();
	const isAuthLoading = isLoading || isRefreshing;
	const canQuery = !isAuthLoading && isAuthenticated;
	// useQueries returns query errors as values instead of throwing during render.
	const result = useQueries(
		canQuery ? { membership: { query: api.memberships.get, args: {} } } : {},
	);
	const membership = (canQuery ? result.membership : undefined) as
		| FunctionReturnType<typeof api.memberships.get>
		| Error
		| undefined;
	return { membership, isAuthLoading, isAuthenticated };
}

export function MembershipProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { membership, isAuthLoading, isAuthenticated } =
		useWorkspaceMembership();
	const router = useRouter();
	const pathname = usePathname();
	const hasNoAccess =
		!isAuthLoading &&
		isAuthenticated &&
		membership !== undefined &&
		!(membership instanceof Error) &&
		!membership.enabled;

	useEffect(() => {
		if (hasNoAccess && pathname !== "/no-access") {
			router.replace("/no-access");
		}
	}, [hasNoAccess, pathname, router]);

	if (isAuthLoading) {
		return <WorkspaceFeedback title="Checking your session" isLoading />;
	}
	if (!isAuthenticated) {
		return (
			<WorkspaceFeedback title="Workspace sign-in required">
				<p>
					Sign in to access Contractor OS. If you are already signed in, reload
					the page or sign in again to reconnect your session.
				</p>
				<SignInButton>
					<Button type="button" className="min-h-11">
						Sign in
					</Button>
				</SignInButton>
				<Button
					type="button"
					variant="outline"
					className="ml-2 min-h-11"
					onClick={() => window.location.reload()}
				>
					Reload page
				</Button>
			</WorkspaceFeedback>
		);
	}
	if (membership instanceof Error) return <WorkspaceError />;
	if (membership === undefined) {
		return <WorkspaceFeedback title="Checking workspace access" isLoading />;
	}
	if (!membership.enabled) {
		return (
			<WorkspaceFeedback title="No workspace access">
				<p>
					Your account does not have an enabled Contractor OS membership. Ask
					your administrator to check your access.
				</p>
			</WorkspaceFeedback>
		);
	}

	return (
		<MembershipContext.Provider value={{ ...membership, isLoading: false }}>
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

"use client";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@contractor-os/ui/components/button";
import type { Route } from "next";
import Link from "next/link";
import {
	type MembershipRole,
	useWorkspaceMembership,
} from "./membership-provider";
import { ModeToggle } from "./mode-toggle";

export function canSeeAdminActions(role: MembershipRole | null): boolean {
	return role === "operator" || role === "admin";
}

export default function Header() {
	const { isSignedIn } = useAuth();
	const { membership } = useWorkspaceMembership();
	const links: { to: Route; label: string }[] = [{ to: "/", label: "Home" }];
	if (
		membership &&
		!(membership instanceof Error) &&
		membership.enabled &&
		canSeeAdminActions(membership.role)
	) {
		links.push({ to: "/dashboard", label: "Dashboard" });
	}

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} href={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					{isSignedIn ? (
						<UserButton />
					) : (
						<SignInButton>
							<Button className="rounded-lg">Sign in</Button>
						</SignInButton>
					)}
					<ModeToggle />
				</div>
			</div>
			<hr />
		</div>
	);
}

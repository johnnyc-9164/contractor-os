"use client";

import { UserButton } from "@clerk/nextjs";
import { cn } from "@contractor-os/ui/lib/utils";
import {
	FileText,
	KanbanSquare,
	LayoutDashboard,
	Receipt,
	Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
	label: string;
	to?: Route;
	icon: React.ComponentType<{ className?: string }>;
	disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
	{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
	{ label: "Leads", to: "/leads", icon: Users },
	{ label: "Pipeline", icon: KanbanSquare, disabled: true },
	{ label: "Quotes", icon: FileText, disabled: true },
	{ label: "Invoices", icon: Receipt, disabled: true },
];

export function NavRail() {
	const pathname = usePathname();

	return (
		<aside className="fixed inset-y-0 left-0 flex w-[280px] flex-col border-r bg-card">
			<div className="flex h-16 items-center border-b px-6">
				<span className="font-semibold text-base tracking-tight">
					Painter OS
				</span>
			</div>
			<nav
				className="flex-1 space-y-1 overflow-y-auto p-4"
				aria-label="Primary"
			>
				{NAV_ITEMS.map((item) => {
					const isActive =
						!item.disabled &&
						item.to !== undefined &&
						(pathname === item.to || pathname.startsWith(`${item.to}/`));
					const Icon = item.icon;
					const classes = cn(
						"flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
						isActive
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
						item.disabled &&
							"cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
					);
					const content = (
						<>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="flex-1">{item.label}</span>
							{item.disabled && (
								<span className="text-[10px] uppercase tracking-wide">
									soon
								</span>
							)}
						</>
					);
					return item.disabled || item.to === undefined ? (
						<span key={item.label} className={classes} aria-disabled="true">
							{content}
						</span>
					) : (
						<Link
							key={item.label}
							href={item.to}
							className={classes}
							aria-current={isActive ? "page" : undefined}
						>
							{content}
						</Link>
					);
				})}
			</nav>
			<div className="flex items-center gap-3 border-t p-4">
				<UserButton />
				<span className="text-muted-foreground text-xs">Operator</span>
			</div>
		</aside>
	);
}

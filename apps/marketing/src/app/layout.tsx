import type { Metadata, Viewport } from "next";
import "../index.css";

export const metadata: Metadata = {
	title: "Painting contractor operations",
	description: "A forthcoming work system for painting contractors.",
	manifest: "/manifest.webmanifest",
	other: {
		// Baked in at build time by Vercel (VERCEL_GIT_COMMIT_SHA). The CD
		// smoke job polls for this to confirm the new commit is actually live.
		"x-commit-sha": process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
	},
};

export const viewport: Viewport = {
	themeColor: "#262626",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}

import type { Metadata, Viewport } from "next";
import "../index.css";

export const metadata: Metadata = {
	title: "Painting contractor operations",
	description: "A forthcoming work system for painting contractors.",
	manifest: "/manifest.webmanifest",
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

import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
	dest: "public",
	disable: process.env.NODE_ENV === "development",
	dynamicStartUrl: false,
	register: true,
});

const nextConfig: NextConfig = {
	typedRoutes: true,
};

export default withPWA(nextConfig);

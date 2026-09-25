// apps/web/src/env.ts
// Client-safe configuration only. Never put deploy keys here.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL. Set it in the environment used to build apps/web.",
  );
}
export const ENV = {
  NEXT_PUBLIC_CONVEX_URL: convexUrl,
} as const;

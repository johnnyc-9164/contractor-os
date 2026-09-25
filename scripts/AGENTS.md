# scripts — ops scripts

- `sync-vercel-env.ts` — syncs environment variables to the Vercel project.
  Run from the repo root with `pnpm tsx scripts/sync-vercel-env.ts`.
  Never commit secrets; this script reads them from the local environment.

# Hosted SQL adapter

This isolated Sites Vinext adapter serves the maintained `../dist/index.html`, its browser assets and `/api/catalog` using Cloudflare D1. The standalone local app uses Node's built-in SQLite instead; both adapters share `../server/catalog.mjs`, sources, seed release and generated SQL schema.

From the repository root, install hosting dependencies with `npm --prefix backend ci`, then run `npm run build`. The build copies maintained browser assets to an ignored `backend/public/`, builds in `backend/dist/`, and copies generated output into `../dist/server/`, `../dist/client/` and `../dist/.openai/`. It never replaces the maintained top-level browser files.

The parent hosting manifest remains authoritative. The build copies its existing Site identity and D1 binding `DB` into this adapter. `catalogue-seed.json` is generated, ignored build input. Schema migrations are generated from `db/schema.ts` into the repository's root `drizzle/` with `npm run db:generate` and applied by Sites before deployment. Seeds are separate from schema migrations and imported atomically on the first catalogue read for a new release.

For local Worker QA after building, apply each pending root migration using the local D1 command documented by the Sites skill. From this directory, start the built Worker with:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --port 4174 --inspector-port 0
```

Local preview D1 and hosted D1 are separate databases. Keep the supplied `sites()` build integration and its license.

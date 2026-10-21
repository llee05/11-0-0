# Release on Cloudflare Pages

The Cloudflare release runs the complete game in the browser. Build-time SQLite exports the canonical catalogue to `catalog.json`; visitors need no API, Worker, D1 database or application account. This is separate from the existing Sites deployment.

## Build and preview

From the repository root, using Node.js 22.13 or newer:

```bash
npm run check
npm test
npm run build:cloudflare
npm run preview:cloudflare
```

Open **http://localhost:4175/** and stop the preview with Ctrl+C. The preview serves only `release/cloudflare/`; it does not emulate Cloudflare's header rules or custom error pages. `PORT` overrides the port, and `PAGES_BASE_PATH` can mount a subpath for asset checks. The Cloudflare custom 404 page assumes deployment at a domain root.

The output contains only the browser assets, font licenses, canonical catalogue, `_headers` and `404.html`. Builds replace only `release/cloudflare/`, preserving maintained `dist/`, local SQLite files, GitHub Pages output and the Sites identity/D1 configuration. Generated releases are ignored by Git.

For a ready-to-upload ZIP, Python 3's standard library is also needed:

```bash
npm run package:cloudflare
```

Upload **`release/11-0-0-cloudflare.zip`** or the **`release/cloudflare/` folder**. The ZIP has `index.html` at its root. Upload the generated release, rather than the repository or maintained `dist/` source.

## Choose how to deploy

**Git integration is recommended for ongoing updates.** Cloudflare rebuilds the site when you push source changes. Direct Upload is convenient for a first manual release. A Direct Upload project cannot later enable Git integration; automatic Git builds require a new project. Dashboard uploads accept ZIPs or folders; Wrangler accepts a folder. See [Cloudflare's upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/).

### Git integration

1. Push the reviewed source to a GitHub or GitLab repository.
2. In Cloudflare, open **Workers & Pages**, create a **Pages** project and connect that repository. Choose `main` as the production branch, or your actual default branch.
3. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None |
   | Root directory | Repository root |
   | Build command | `npm run build:cloudflare` |
   | Build output directory | `release/cloudflare` |
   | Build environment | `NODE_VERSION=22.16.0`, `SKIP_DEPENDENCY_INSTALL=true` |

   The explicit Node version supports built-in SQLite. Dependency installation can be skipped because this build uses only Node built-ins and checked-in sources. Do not use `npm run build`, which builds the separate Sites backend. See Cloudflare's [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) and [build environment documentation](https://developers.cloudflare.com/pages/configuration/build-image/).
4. Deploy, then open the production URL shown by Cloudflare. A project named `11-0-0` would normally use `https://11-0-0.pages.dev`, subject to name availability. Check Quick Draft, Quick Sim, reloading a result and a missing path such as `/missing/page`.

Cloudflare performs the static build; run `npm run check` and `npm test` before pushing. The existing GitHub Pages workflow controls its own deployment independently.

### Dashboard Direct Upload

1. Run `npm run package:cloudflare` locally.
2. In **Workers & Pages**, create a **Pages** project using **Direct Upload**.
3. Choose the project name and upload `release/11-0-0-cloudflare.zip` or the generated folder.
4. Deploy and check the URL Cloudflare provides. For later updates, rebuild and create a new production deployment in the same project.

### Optional Wrangler commands

The isolated [Wrangler configuration](../cloudflare/wrangler.json) defaults to project name `11-0-0`. Change `name` to the exact Pages project name you chose. Its output path is relative to that configuration file; every command below runs from the repository root. Keeping the configuration under `cloudflare/` prevents automatic discovery by the separate Sites backend. Dashboard Git builds use the settings above.

To emulate Cloudflare headers and error-page routing locally:

```bash
npm run build:cloudflare
npx wrangler@4 pages dev --cwd cloudflare --port 4176
```

To publish manually with Wrangler, authenticate to your Cloudflare account and use the folder output:

```bash
npx wrangler@4 login
npx wrangler@4 pages deploy --cwd cloudflare --branch main
```

These commands may install Wrangler temporarily. Deployment requires an existing Pages project or following Wrangler's project-creation prompt. No account ID, token, domain ownership or deployment credentials are committed to the repository.

## Custom domain and saved games

After the Pages URL works, add your purchased domain in that project's **Custom domains** settings and follow Cloudflare's DNS instructions. For an apex domain such as `11-0-0.com`, Cloudflare requires the zone to use its nameservers; a subdomain can use an external DNS provider. Registering a domain and connecting it are separate steps. No domain is hardcoded into this release. See [Cloudflare's custom domain guide](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Saves, appearance preferences and best-run records remain in browser local storage. Each origin has separate storage: the existing Sites URL, `pages.dev`, `www` and an apex domain do not share saves. Moving domains does not change game rules or the save format, but existing games do not transfer automatically. Choose the final public domain before inviting regular players.

## Release behavior and checks

The catalogue and game modules use Cloudflare's default caching; avoid adding long browser cache lifetimes to these unversioned filenames. The supplied `_headers` sets MIME sniffing protection, a referrer policy and frame protection. The root `404.html` keeps unknown paths, including `/api/catalog`, as actual 404 responses instead of serving the game shell. See Cloudflare's [serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) and [header rules](https://developers.cloudflare.com/pages/configuration/headers/).

Source/catalogue changes require rebuilding and deploying. The static export preserves catalogue release IDs, source citations, raw ratings, trait rules and all 31 opponents. The original API/Sites build remains available through `npm run build`.

With the optional Playwright setup from [README.md](../README.md#checks), run the focused and full browser flows against the simple preview:

```bash
QA_URL=http://localhost:4175/ node scripts/browser-pages-qa.mjs
QA_URL=http://localhost:4175/ node scripts/browser-qa.mjs
```

With the Wrangler preview running on port 4176, check Cloudflare's actual rules as well:

```bash
QA_CLOUDFLARE=1 QA_URL=http://localhost:4176/ node scripts/browser-pages-qa.mjs
```

The focused flow checks local assets, correct JSON/JS MIME types, missing backend routes, mobile layout, best-run reports, catalogue failure recovery and preserved saves. Cloudflare mode also checks response headers and returning from a nested 404 page to the saved game. Full browser QA covers desktop and mobile gameplay. The Node suite checks the canonical export, isolated build configuration, license files and reproducible upload ZIP contents.

Offline play is opt-in from **Saves & offline**. Each build emits `sw.js` with an integrity manifest for the complete browser release and exported catalogue. Cache names include the hosting path and release fingerprint; partial or changed downloads never become the active offline copy. Run `QA_URL=<preview URL ending in /> node scripts/browser-offline-qa.mjs` with the same Playwright environment as the hosting checks to verify disconnected reloads and a complete 50-team tournament. Backups can move games between origins when their rules and catalogue still match; independent valid reports remain importable after those change.

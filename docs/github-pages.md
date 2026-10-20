# Release on GitHub Pages

The Pages release runs the complete game in the browser. Build-time SQLite exports the same catalogue as `/api/catalog`; the published site loads `./catalog.json`. No runtime database, API server, backend dependencies or deployment secrets are needed.

## Build and preview locally

Use Node.js 22.13 or newer, from the repository root:

```bash
npm run check
npm test
npm run build:pages
npm run preview:pages
```

Open **http://localhost:4174/11-0-0/**. This preview serves only `release/pages/`, mounted under a repository path so absolute-URL mistakes are visible. Stop it with Ctrl+C. To preview a different repository name or a root-level site:

```bash
PAGES_BASE_PATH=/my-chess-game/ npm run preview:pages
PAGES_BASE_PATH=/ PORT=4175 npm run preview:pages
```

The generated `release/pages/` directory contains the HTML shell, browser modules, CSS, SVGs, fonts and their licenses, `.nojekyll`, and `catalog.json`. The build preserves `dist/` and persistent SQLite files. It replaces only the generated Pages directory and removes obsolete release files. Never upload the whole repository, maintained `dist/` directory or Sites Worker build as the Pages artifact. Generated output is ignored by Git; Actions rebuilds it from source.

The output works at both `https://OWNER.github.io/REPOSITORY/` and `https://OWNER.github.io/` without setting a base URL or changing the build. Use HTTP for local preview rather than opening `index.html` as a file.

## Enable the GitHub release

Use a public repository for GitHub Free, or a plan that supports Pages from private repositories; see [GitHub's availability information](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#who-can-use-this-feature).

1. Create an empty GitHub repository and push this checkout to its `main` branch. If an existing `origin` belongs to another host, keep it and add a separate remote:

   ```bash
   git remote add github https://github.com/OWNER/REPOSITORY.git
   git push github main
   ```

   Replace `OWNER` and `REPOSITORY` with your GitHub account and repository. If `github` is already configured correctly, only run the push. GitHub authentication uses your normal Git credentials.
2. In the repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
3. Open **Actions → GitHub Pages → Run workflow**, select `main`, and run it. This also retries the initial push if Pages was not enabled yet.
4. Wait for the `build` and `deploy` jobs to pass. The deployment environment and Pages settings show the published URL. Open it and check a draft, Quick Sim, and reloading a saved result.

The workflow in [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) checks syntax, runs the catalogue/game tests, builds the static release, uploads only `release/pages/`, then deploys the artifact. Pull requests run the build and tests without deploying. Pushes to `main` and manual runs on `main` deploy after validation. If you use a different default branch, update the workflow's triggers and deploy condition together. The deployment job uses the `github-pages` environment and GitHub's scoped deployment token; no personal access token is required. See GitHub's [custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Data updates and existing games

Pages serves a catalogue snapshot. Import and review source changes locally, commit the checked-in data, and push to `main` to rebuild. Visitors never run SQL or download source archives. Catalogue release IDs, source ratings, historical qualifications, trait rules and the 31 all-time opponents match the API version.

Game saves and the three best completed-run reports remain in each browser's local storage. Saves and records on the previous Sites domain do not automatically transfer to the GitHub Pages domain. Hosting alone does not change the save format or rules; existing catalogue/rules incompatibilities still use the normal backup flow. Best-run reports remain readable across catalogue/rules updates. Projects on the same Pages origin share browser storage, including this game's save and record keys.

The Sites deployment remains separately available through `npm run build`, using its existing D1 binding and Site identity. The Pages workflow never installs or publishes that backend.

## Optional browser release checks

With the static preview running, use the existing Chromium installation and the optional Playwright setup described in [README.md](../README.md#checks):

```bash
QA_URL=http://localhost:4174/11-0-0/ node scripts/browser-pages-qa.mjs
QA_URL=http://localhost:4174/11-0-0/ node scripts/browser-qa.mjs
```

The focused hosting check verifies relative assets, JSON MIME type, absent backend routes, mobile layout, best-run reports, and preservation/recovery of games and records when the catalogue is missing or malformed. The full browser flow covers drafting, eleven rounds, reserve rotation, Quick Sim, top-three records, reloads and desktop/mobile layouts. Repeat the focused check with `QA_URL=http://localhost:4175/` against the root preview. Set `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM_PATH` and `QA_ARTIFACTS` as needed.

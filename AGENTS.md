# Agent instructions

These instructions apply throughout this repository. Read `README.md` for setup, gameplay and the simulation's data boundaries before changing the app.

## App architecture

11–0–0 is a fantasy Chess Olympiad game with a browser ES-module UI and a shared historical rating catalogue. Local development uses Node.js 22.13 or newer and built-in SQLite without runtime packages. Hosted Sites uses an isolated Vinext adapter and Cloudflare D1.

`dist/` contains the maintained browser source. Edit its top-level files directly. Hosted builds generate only `dist/server/`, `dist/client/` and `dist/.openai/`; never replace or clean the entire directory. The app requires `/api/catalog` and cannot run on static-only hosting.

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Page shell, metadata, navigation, main rendering target, shared dialog and toast container; loads `app.js` as an ES module. |
| `dist/app.js` | Loads the SQL catalogue, renders country-year drafts and archive/source dialogs, handles UI events, clipboard and browser saves. |
| `dist/engine.js` | Configurable catalogue indexes, budget and person-uniqueness rules, complete top-five offers, seeded simulation, pairings, scoring, fatigue and save validation. Independent of DOM, storage and SQL APIs. |
| `dist/styles.css` | Responsive presentation, interaction states and reduced-motion behavior. |
| `dist/*.svg`, `dist/fonts/` | Local artwork and fonts, including font licenses. |
| `scripts/serve.mjs`, `server/sqlite.mjs` | Local static server and read-only `/api/catalog` backed by persistent SQLite, schema migrations and source imports. Bound to `127.0.0.1:4173`; configure `PORT` and `DATABASE_PATH`. |
| `server/catalog.mjs`, `data/` | Shared SQLite/D1 catalogue queries and atomic imports, rating normalization, source observations, checksums and federation metadata. |
| `backend/` | Isolated Sites Vinext/D1 API adapter and maintained Sites build integration; dependencies installed here. |
| `backend/db/schema.ts`, `drizzle/` | Drizzle schema, generated schema-only SQL migrations, snapshots and journal. |
| `scripts/ratings/`, `scripts/import-ratings.mjs` | Reproducible, checksum-verified source extraction. |
| `tests/engine.test.mjs` | Node's built-in test suite for game rules, simulations and save validation. |
| `scripts/browser-qa.mjs` | Optional Playwright Core flow using an existing Chromium installation. |
| `.openai/hosting.json`, `scripts/build-hosted.mjs` | Existing Site identity, D1 binding `DB`, and non-destructive hosted build. |

### State and data flow

- The page loads `app.js`, fetches `/api/catalog`, configures engine indexes, then creates `initialState()`. Catalogue failures show a retry view rather than stale placeholder players.
- The UI attempts to restore JSON from local storage under `11-0-0:save:v2`, accepting it only when `validSave` passes.
- Game state progresses through `draft`, `tournament` and `results`. UI event handlers apply engine functions, then render and save the state.
- Selection, busy flags, the viewed round and the chosen results view are transient UI state, separate from the saved game.
- Draft offers use `Math.random` by default. Tournament simulation uses a stored seed and round number; preserve reproducibility for identical inputs and rotation decisions.
- Game saves carry a catalogue release ID. Preserve version-1 saves, and back up incompatible version-2 saves before replacing them.
- There are no application accounts or remote game saves. SQL stores the shared player catalogue.
- Country snapshots use period federation and the top five published standard ratings, independent of Olympiad participation. Show all five; disable ineligible picks. Prevent drafting the same person from multiple years.
- Official-list coverage is 1974–2026 at four-year intervals. Earlier observations back to 1927 are historical estimates awaiting verified affiliations; never publish speculative country top fives.
- Preserve source date, URL, SHA256 and raw ratings. Gameplay ratings use the documented 2026 top-100-median adjustment; never describe adjusted ratings as official FIDE values.

## Implementation guidance

- Keep rules in `engine.js`, browser APIs in `app.js`, and database access in `server/` or the hosted API adapter.
- SQLite and D1 share the generated schema and atomic seed logic. Keep migrations schema-only, immutable after application, and separate from data imports. Do not create migration-owned tables in request handlers.
- Keep local and hosted catalogue shapes consistent. Source updates must replace stale rankings atomically and advance the catalogue release.
- After schema changes, run `npm run db:generate` and commit the SQL, Drizzle snapshot and journal together.
- Follow the existing ES module structure. Add dependencies or build tooling only when the task requires them.
- Preserve draft constraints: five unique players within 100 credits, with four active boards and one reserve. Preserve the eleven-round, 32-team tournament unless the task changes those rules.
- When changing saved state, update validation and deliberately handle existing saves. Keep `SAVE_VERSION` and the UI storage key consistent with the chosen compatibility strategy.
- Escape user-controlled values before inserting them into HTML. Preserve keyboard access, dialog focus, reduced-motion support and responsive layouts when changing the UI.
- Preserve local font licenses and update `README.md` and this architecture guide when relevant behavior, file responsibilities or commands change.
- Inspect the working tree before editing. Preserve unrelated user changes and include only task-related changes in commits.

## Validation

Run commands from the repository root:

```bash
npm start       # Same server as npm run dev; http://localhost:4173
npm run check  # Syntax checks for app.js and engine.js
npm test       # SQL catalogue, rules and simulation tests
npm run build  # Hosted Worker/assets; requires npm --prefix backend ci
```

For catalogue changes, test SQLite persistence, foreign keys, complete source-ranked top fives, known modern rosters, normalization and atomic release replacement. For engine changes, run the syntax checks and engine suite; add or adjust tests for changed behavior. The suite covers 1,000 drafts, 100 complete tournaments, deterministic results, scoring, pairings, fatigue, invalid actions and saved-game validation.

For UI changes, run syntax checks and verify the affected browser flows at desktop and mobile widths. The optional full browser QA setup and environment overrides are documented in `README.md`. For documentation-only changes, verify commands, file paths and statements against the source, and check the diff for whitespace errors with `git diff --check`.

## Task and commit workflow

- Split each task into appropriate, focused commits. A small cohesive task can use one commit; separate independent concerns into distinct commits.
- Each commit should represent one reviewable change. Keep its implementation, relevant tests and accompanying documentation together, and keep intermediate commits working.
- Validate each logical change before committing. Review the diff and stage only the files or hunks belonging to that commit.
- Write every commit message in the exact form `action: message`. Use a lowercase action such as `add`, `fix`, `refactor`, `docs`, `test`, `style` or `chore`, followed by a colon, one space and a concise description. Use imperative wording for the description.
- Report the completed changes and validation, including any checks that could not be run.

Examples:

```text
add: support reserve rotation between rounds
fix: preserve the selected draft slot after a reroll
refactor: isolate tournament pairing rules
docs: describe app architecture and contribution workflow
test: cover invalid saved tournament data
```

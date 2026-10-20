# Agent instructions

These instructions apply throughout this repository. Read `README.md` for setup, gameplay and the simulation's data boundaries before changing the app.

## App architecture

11–0–0 is a fantasy Chess Olympiad game with a browser ES-module UI and a shared historical rating catalogue. Local development uses Node.js 22.13 or newer and built-in SQLite without runtime packages. Hosted Sites uses an isolated Vinext adapter and Cloudflare D1.

`dist/` contains the maintained browser source. Edit its top-level files directly. Sites builds generate only `dist/server/`, `dist/client/` and `dist/.openai/`; never replace or clean the entire directory. Local development and Sites use `/api/catalog`. The separate GitHub Pages build exports the same SQL catalogue to `release/pages/catalog.json` and uses an explicit relative catalogue URL; static hosting must serve `release/pages/`, not the maintained `dist/` source.

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Page shell, metadata, navigation, main rendering target, shared dialog and toast container; loads `app.js` as an ES module. |
| `dist/app.js` | Loads the SQL catalogue, renders country-year drafts and archive/source dialogs, handles UI events, clipboard and browser saves. |
| `dist/engine.js` | Configurable catalogue indexes, person-uniqueness rules, complete top-five offers, all-time opponent field, seeded simulation, pairings, scoring, fatigue and save validation. Independent of DOM, storage and SQL APIs. |
| `dist/traits.js`, `data/traits.md` | Sourced career-inspired profiles, random trait rolls and pure matchup effects. Numerical modifiers are fictional game rules, separate from source ratings. |
| `dist/player-profile.js` | Pure style, stamina, form and consistency rules and game presets shared by all teams. |
| `data/captaincy.md` | Sourced captain research and the accepted decision that the user manages the team; no captain attribute or staff system. |
| `dist/styles.css` | Almanac paper/serif identity, broadcast scoreboards, responsive presentation, interaction states and reduced-motion behavior. |
| `dist/*.svg`, `dist/fonts/` | Local artwork and fonts, including font licenses. |
| `scripts/serve.mjs`, `server/sqlite.mjs` | Local static server and read-only `/api/catalog` backed by persistent SQLite, schema migrations and source imports. Bound to `127.0.0.1:4173`; configure `PORT` and `DATABASE_PATH`. |
| `server/catalog.mjs`, `server/all-time.mjs`, `data/` | Shared SQLite/D1 catalogue queries and atomic imports, source-rating selection, source observations, checksums, identity crosswalks, federation metadata and all-time A/B roster selection. |
| `backend/` | Isolated Sites Vinext/D1 API adapter and maintained Sites build integration; dependencies installed here. |
| `backend/db/schema.ts`, `drizzle/` | Drizzle schema, generated schema-only SQL migrations, snapshots and journal. |
| `scripts/ratings/`, `scripts/import-ratings.mjs` | Reproducible, checksum-verified source extraction. |
| `tests/engine.test.mjs` | Node's built-in test suite for game rules, simulations and save validation. |
| `scripts/browser-qa.mjs` | Optional Playwright Core flow using an existing Chromium installation. |
| `scripts/audit-simulation.mjs`, `reports/` | Read-only seeded simulation experiments, counterfactual substitution probes and dated findings; use an in-memory catalogue and keep measured results tied to their audited rules and release. |
| `.openai/hosting.json`, `scripts/build-hosted.mjs` | Existing Site identity, D1 binding `DB`, and non-destructive hosted build. |
| `scripts/build-pages.mjs`, `release/pages/` | Dependency-free static release with canonical SQL catalogue JSON; allowlisted browser assets and font licenses, no Worker or hosting metadata. Generated output is ignored by Git. |
| `scripts/preview-pages.mjs`, `scripts/browser-pages-qa.mjs` | Static-only preview under a configurable repository path and focused release checks; no API fallback. |
| `.github/workflows/pages.yml`, `docs/github-pages.md` | Pages build/test/deploy workflow and release guide; pull requests validate, successful pushes to `main` deploy when Pages is enabled. |

### State and data flow

- The page loads `app.js`, fetches the `catalogue-url` meta value (`/api/catalog` by default; `./catalog.json` in Pages releases), configures engine indexes, then creates `initialState()`. Catalogue failures show a retry view rather than stale placeholder players. Keep API and static exports identical, including source citations, canonical identities and the catalogue release.
- The UI attempts to restore JSON from local storage under `11-0-0:save:v4`, accepting it only when `validSave` passes.
- Game state progresses through `draft`, `tournament` and `results`. UI event handlers apply engine functions, then render and save the state.
- Quick Sim completes the draft and all eleven rounds through the existing engine rules and reserve planner. Preserve existing picks, outstanding offer assignments and starting profiles; do not mutate the input draft or overwrite it before success. Quick Draft shares `completeDraft`; seeded `quickSim` reproduces the same squad and tournament for identical inputs. Its UI busy state is transient and its results use the normal save shape.
- Selection, busy flags, the viewed round and the chosen results view are transient UI state, separate from the saved game.
- Match-report performance breakdowns use native keyboard-accessible disclosures and never change saved state. Keep source/effective ratings, traits and readiness visible, and show all modifier calculations directly in pre-match forecasts. Trait symbols and form/fatigue colours supplement readable labels. Keep draft controls before the lineup in reading and keyboard order, round actions above reports, and compact standings directly beneath reports in the same column. Mobile draft boards use two columns; never clip their profiles or hide any of the five offered players.
- Draft offers use `Math.random` by default. Every eligible country-year has positive weight `2 ** ((strength − 2600) / 50)`, where strength averages the eligible leader and eligible top-three mean; preserve full top fives and canonical-person exclusion. Quick Draft and Quick Sim use shared `rankedCandidates`/`draftValue` estimates over eleven rounds, including reference trait/style effects, fatigue/recovery, decaying starting form and integrated consistency swings. Keep `DRAFT_RULESET` in the save fingerprint. Tournament simulation uses a stored seed and round number; preserve reproducibility for identical inputs and rotation decisions.
- Game saves carry catalogue, trait and profile rules versions. Preserve version-1 through version-3 saves under their original keys; back up incompatible or malformed version-4 saves before replacing them.
- Call shared fixed abilities career traits; reserve signature for an ability unique to exactly one player. Famous career traits use exact canonical person IDs and cited recurring career characteristics. Unprofiled players roll 25% no trait, otherwise uniformly among all traits, once per draft offer; retain the picked assignment. Never reroll during render or reload. Opponents use separate seeded assignments fixed for their tournament. Random traits and numerical tradeoffs are game data, not biographical facts; see `data/traits.md`.
- Individual trait modifiers use `TRAIT_BONUS_CAP` (80 in `career-traits-3`); preserve specialist conditions, counter interactions and documented tradeoffs. Generalists receive a smaller constant bonus. Defender strength changes smoothly with the rating gap rather than jumping at a threshold. Keep numerical descriptions and tests aligned with the pure effect resolver.
- Maintain sourced fixed career traits for recognizable players, including everyone with a sampled catalogue edition rated at least 2750. This coverage floor does not justify inventing a trait from rating alone. Retain qualifications about evolving styles and young players' careers so far. The current 94 career traits share fixed profile presets across editions and opposing teams; expanding assignments requires a trait rules version bump and deliberate save handling.
- Both sides use the same trait, style, stamina, form and consistency rules. Famous profiles use fixed game-archetype presets; unprofiled players roll them per offer, and everyone rolls starting form. Numerical profiles are game values, not sourced personal qualities. Retain immutable starting profiles separately from each team's current form. The user acts as captain through lineup and reserve decisions. Do not add captain attributes, selected captains, staff slots or leadership bonuses to either side.
- Match forecasts must be pure and match the subsequent simulation for identical inputs. Daily performance depends only on seed, round, team and player; board moves cannot reroll it. AI reserves consider fatigue and form under the same rules used for user lineup recommendations. Source ratings determine board order. Keep source Elo separate from every game modifier. Bump `TRAIT_RULESET` or `PROFILE_RULESET` as appropriate and deliberately handle saves after rule changes. Validation checks temporal form/fatigue history as well as effect arithmetic.
- Simulation rules have their own `SIMULATION_RULESET` included in the saved rules fingerprint. Immutable `seedingRating` uses the roster's best four source ratings for pairings and standings; `rating` remains the current lineup's display average. Round fixtures derive colours from played team/player histories and neutral readiness projections of the next four; individual imbalance and repeated colours take priority over the team’s first-board pattern. Reconstruct temporal forms/loads when validating historical colour choices. Derive conditions/outcomes from independent fixture/board seeds. Substitutions must preserve fixtures and unrelated matches. Validate historical colour/context rules and never use a proposed lineup to regenerate fixture conditions.
- Fatigue load is an integer 0–100 on every team's player maps, distinct from consecutive-game streaks. Playing adds `14 − stamina`; sitting out removes 30. Load above 24 costs one Elo per point, halved for grinders. Only playing a round updates load. Previews, substitutions and lineup recommendations are pure with respect to load. Validate the complete load history and preserve incompatible saves before a fresh draft.
- Opponents plan all five possible reserves over up to three remaining rounds using expected match points, current traits/styles, workload and form. Evaluate current fixture matchups against a neutral projection of the opposing lineup, independent of user substitutions; future rounds use averaged reference effects. User recommendations use the visible planned opponent. They must not peek at future results or daily swings. Use the same planner for user recommendations and Auto-rotate & finish, while manual round play preserves the selected lineup. Opponent roster dialogs show the next planned lineup and fatigue; completed tournaments show the final lineup.
- There are no application accounts or remote game saves. SQL stores the shared player catalogue.
- Country snapshots use period federation and the top five published standard ratings, independent of Olympiad participation. Show all five; disable ineligible picks. Prevent drafting the same person from multiple years.
- Tournament opponents are the strongest 31 all-time A/B lineups by unrounded four-board total, plus the user's team for 32 total. For each person keep their best observed source edition (ties: latest year, federation, edition ID), using its federation. Each federation's first five form A and the next five B. Never repeat a person across opposing teams or combine Russia and the Soviet Union. Source coverage is selective; do not describe sampled ratings as exhaustive career peaks.
- Official-list coverage is 1974–2026 at four-year intervals. Twelve labelled Chessmetrics country snapshots cover every scheduled early year from 1927–1970. Their country coverage is selective and each has a complete higher-rank affiliation audit. Additional early countries remain unavailable pending evidence; never publish speculative top fives. Preserve temporal inference qualifications and sourced person-identity crosswalks.
- Preserve source date, URL, SHA256 and raw ratings. Gameplay uses source ratings unchanged, with no era adjustment. Country-year rolls must contain at least one player rated at least 2600; preserve the complete top five of each qualifying snapshot.

## Implementation guidance

- Keep orchestration in `engine.js`, pure trait definitions/effects in `traits.js`, browser APIs in `app.js`, and database access in `server/` or the hosted API adapter.
- SQLite and D1 share the generated schema and atomic seed logic. Keep migrations schema-only, immutable after application, and separate from data imports. Do not create migration-owned tables in request handlers.
- Keep local and hosted catalogue shapes consistent. Source updates must replace stale rankings atomically and advance the catalogue release. Identity crosswalks are source-name-qualified, preserve namesakes/reused IDs, and are included in the release fingerprint. Bump the selection-policy marker when changing field-generation rules.
- After schema changes, run `npm run db:generate` and commit the SQL, Drizzle snapshot and journal together.
- Follow the existing ES module structure. Add dependencies or build tooling only when the task requires them.
- Preserve draft constraints: five unique players, with four active boards and one reserve. Preserve the eleven-round, 32-team tournament unless the task changes those rules.
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
npm run build:pages # Static release/pages/; no backend dependencies or remote database
npm run preview:pages # Static-only http://localhost:4174/11-0-0/; PAGES_BASE_PATH and PORT configurable
```

For catalogue changes, test SQLite persistence, foreign keys, complete source-ranked top fives, known modern rosters, unchanged ratings, the inclusive 2600 cutoff, all-time A/B selection, cross-era identity links and atomic release replacement. For engine changes, run the syntax checks and engine suite; add or adjust tests for changed behavior. The suite covers 1,000 drafts, 100 complete tournaments, deterministic results, scoring, pairings, fatigue, invalid actions and saved-game validation.

For UI changes, run syntax checks and verify the affected browser flows at desktop and mobile widths. The optional full browser QA setup and environment overrides are documented in `README.md`. For documentation-only changes, verify commands, file paths and statements against the source, and check the diff for whitespace errors with `git diff --check`.

For Pages changes, run the static export integration test and build. Verify both root and repository-subpath previews, relative catalogue/assets, no backend requests, save persistence and catalogue-failure recovery; see `docs/github-pages.md`. Keep the static catalogue identical to the SQL API and preserve source/font licenses. Do not change the existing Sites identity or D1 configuration for a Pages release.

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

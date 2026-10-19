# Agent instructions

These instructions apply throughout this repository. Read `README.md` for setup, gameplay and the simulation's data boundaries before changing the app.

## App architecture

11–0–0 is a browser-local fantasy Chess Olympiad game built with HTML, CSS and JavaScript ES modules. It has no runtime dependencies, bundler or backend. Node.js 22 or newer runs development tools and tests.

`dist/` is the maintained application source and the deployable static site. Edit it directly; there is no build step that regenerates it.

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Page shell, metadata, navigation, main rendering target, shared dialog and toast container; loads `app.js` as an ES module. |
| `dist/app.js` | Browser state, rendering, delegated `data-action` handlers, dialogs, focus handling, clipboard sharing and local-storage persistence. Imports game rules from `engine.js`. |
| `dist/engine.js` | Curated player/nation data, budget and offer rules, board ordering, seeded simulation, Swiss-style pairings, scoring, standings, reserve fatigue and save validation. Independent of the DOM and browser storage. |
| `dist/styles.css` | Responsive presentation, interaction states and reduced-motion behavior. |
| `dist/*.svg`, `dist/fonts/` | Local artwork and fonts, including font licenses. |
| `scripts/serve.mjs` | Development static server for `dist/`, bound to `127.0.0.1`; port defaults to 4173 and can be set with `PORT`. |
| `tests/engine.test.mjs` | Node's built-in test suite for game rules, simulations and save validation. |
| `scripts/browser-qa.mjs` | Optional Playwright Core flow using an existing Chromium installation. |
| `.openai/hosting.json` | Static hosting configuration; serves `dist/`. |

### State and data flow

- The page loads `app.js`, which imports `engine.js` and creates an `initialState()`.
- The UI attempts to restore JSON from local storage under `11-0-0:save:v1`, accepting it only when `validSave` passes.
- Game state progresses through `draft`, `tournament` and `results`. UI event handlers apply engine functions, then render and save the state.
- Selection, busy flags, the viewed round and the chosen results view are transient UI state, separate from the saved game.
- Draft offers use `Math.random` by default. Tournament simulation uses a stored seed and round number; preserve reproducibility for identical inputs and rotation decisions.
- There are no accounts or remote saves. Ratings and prices are curated fantasy data inspired by the 2024 player pool.

## Implementation guidance

- Keep game rules and validation in `engine.js`; keep DOM, storage and other browser APIs in `app.js`.
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
npm test       # Engine rules and simulation tests
```

For engine changes, run the syntax checks and engine suite; add or adjust tests for changed behavior. The suite covers 1,000 drafts, 100 complete tournaments, deterministic results, scoring, pairings, fatigue, invalid actions and saved-game validation.

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

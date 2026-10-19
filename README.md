# 11–0–0 · The Fantasy Chess Olympiad

A playable browser prototype: spin a federation, draft five real grandmasters within 100 credits, choose four starting boards, and chase an eleven-win Olympiad.

## Run locally

Requires Node.js 22 or newer. There are no packages to install.

```bash
cd olympiad
npm start
```

Open http://localhost:4173. Set `PORT` to use another port. The entire deployable app is in `dist/`; any static web server can serve it. Use an HTTP server rather than opening the HTML as a local file, because the JavaScript uses ES modules.

## The game

- **Draft:** 60 grandmasters across 12 federations. Each spin reveals up to three eligible players. You get two nation rerolls. Every offered player leaves enough credits to complete your squad; duplicates are excluded.
- **Lineup:** Four active boards and one reserve. Choose a slot before picking; click two filled slots to swap. Active boards sort by rating before the tournament and after substitutions. A quick draft can complete your remaining slots.
- **Modes:** Classic shows game ratings. Expert hides them during the draft; prices still provide a clue.
- **Olympiad:** Your fantasy team faces 31 national teams over eleven rounds. Four board scores determine each match: win = 2 match points; draw = 1. Pairings prefer similar scores and never repeat opponents. All 32 teams play every round.
- **Reserve:** Rotate between rounds to manage fatigue. Starting with a player's fifth consecutive appearance, each extra consecutive game reduces effective rating by 8, capped at 40. One round on the bench resets fatigue.
- **Results:** Inspect each round's four boards or the complete standings. Copy a result to share. A new draft asks before replacing your progress.
- **Persistence:** The current game automatically saves to this browser's local storage. No account or server is required. Saves are versioned and validated before loading.

## Why this stack

**HTML, CSS and modern JavaScript ES modules** fit this prototype's actual needs: one browser-local game, no authentication, shared data, payments, or remote computation. There is no production dependency, bundler, framework runtime, or build pipeline to configure. Static hosting is inexpensive and the source can be edited directly.

**A separate, pure JavaScript game engine** keeps budgets, probability, pairings, scoring and save validation independent of the DOM. It makes simulation changes easy to test and would allow a future React, Svelte, or mobile interface to reuse the rules. Tournament randomness is seeded, so a completed draft and seed produce repeatable results.

**Local storage** gives immediate resume behavior without introducing a backend before the game loop is proven. The tradeoff is deliberate: saves remain on one browser and device. Multiplayer, public leaderboards, cross-device saves, and trusted competitive results would need a server and identity system.

**Node's built-in test runner** verifies the rules without test dependencies. A tiny development-only Node HTTP server serves the static app. Optional browser QA uses Playwright Core and an existing Chromium installation.

**CSS, SVG, and locally bundled open-source fonts** keep the presentation sharp, responsive and independent of third-party asset services. The native HTML dialog handles modal focus and Escape. Reduced-motion preferences are respected, and the game can be operated by keyboard.

## Checks

```bash
npm run check
npm test
```

The rules suite exercises 1,000 drafts, 100 complete tournaments, score conservation, unique pairings, deterministic results, reserve fatigue, invalid actions, and saved-game validation.

Optional browser QA (with the app running):

```bash
npm install --no-save --package-lock=false playwright-core
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-qa.mjs
```

Override `QA_URL`, `QA_ARTIFACTS`, or `PLAYWRIGHT_MODULE` if needed. The browser flow covers manual and quick drafts, Expert mode, rerolls, team naming, slot selection, reload persistence, reserve rotation, results, standings, clipboard sharing, reset confirmation and narrow/mobile/desktop widths. Screenshots go to `/tmp/eleven-zero-zero-qa/screenshots` by default.

## Model and data boundaries

This is a fantasy simulation, not a chess engine or an official Olympiad predictor. No moves are played. Each board samples win/draw/loss probabilities from Elo expected score, a rating-gap-dependent draw rate, a small color advantage, and fatigue. Simulated national teams use generated board ratings around curated team strengths.

Player names are real. All ratings and prices are **curated game data inspired by the 2024 player pool**, not current FIDE ratings. Fantasy rosters can combine nationalities; the pool is not intended to reproduce official team lineups.

The eleven-round, four-board, one-reserve and 2/1/0 match-point structure follows the [2024 FIDE Olympiad format](https://handbook.fide.com/files/handbook/Olympiad2024.pdf). This prototype uses a smaller 32-team field and simplified score-group Swiss matching, with full Sonneborn–Berger (`sum of opponent match points × board points scored against that opponent`), then board points, then initial rating and ID as deterministic tiebreaks. It does not implement FIDE's complete controlled-Swiss/color-allocation or cut-tiebreak rules.

The random nation → player choice → campaign loop is inspired by [38–0–0](https://38-0-0.com/). This is an independent prototype, unaffiliated with that game or FIDE.

## Files

```text
dist/
  index.html      App shell and metadata
  styles.css      Responsive presentation
  app.js          UI, actions, dialogs and persistence
  engine.js       Player pool, draft rules and tournament simulation
  *.svg           Original vector chess artwork
  fonts/          DM Sans and Manrope, including SIL OFL licenses
scripts/
  serve.mjs       Local static server
  browser-qa.mjs  Optional full browser playthrough
tests/
  engine.test.mjs Game-rule and simulation checks
.openai/
  hosting.json    Static Sites hosting configuration
```

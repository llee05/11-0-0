# 11–0–0 · The Fantasy Chess Olympiad

Draft a team from historical country-year rating lists, choose five players, and chase eleven tournament wins.

## Run locally

Requires **Node.js 22.13 or newer** (for built-in SQLite). The local app needs no npm dependencies. Run from this repository's root:

```bash
npm start
```

Open http://localhost:4173. `npm run dev` starts the same server; set `PORT` for another port. The server creates `.data/catalogue.sqlite`, applies pending schema migrations and imports the checked-in rating catalogue. Override `DATABASE_PATH` to choose another database file. Game progress still saves in the browser; SQLite stores the shared historical player catalogue.

Edit the maintained HTML, CSS and ES modules in `dist/` directly. Local development and Sites load `/api/catalog`. For static hosting, `npm run build:pages` exports the same SQL catalogue to `release/pages/catalog.json` and builds a separate browser release in `release/pages/`. Serve that output over HTTP; serving `dist/` alone still requires the API. Sites builds add generated `dist/server/`, `dist/client/` and `dist/.openai/` directories without replacing the maintained source files.

## Play

- **Appearance:** Use the moon/sun button in the header to toggle dark mode. The almanac follows your system theme until you choose one; your choice is saved separately under `11-0-0:theme` and shared across tabs. Theme controls also work while the catalogue loads or is unavailable.
- **Country-year rolls:** USA 2026 and USA 2022 are separate rollable options. Every offer shows its source list's five highest standard-rated players, ordered by the original rating. A snapshot is playable only if at least one of those players is rated at least 2600. Rolls favour strong, deep rosters: weight doubles per 50 Elo of the mean of the available leader and the available top-three average. Every qualifying snapshot with an eligible player remains possible. Olympiad participation is never a selection filter.
- **Legends:** Eight rollable collections add forty distinct pre-1927 players. Each shows five strong sampled editions across countries and dates, with individual source links. These are fictional draft collections, not national teams; they do not enter the national opponent field. The same person cannot be picked again from a later country-year edition.
- **Draft:** Pick five distinct people. Two nation rerolls are available. Already-drafted players remain visible and disabled; lower-ranked players never replace them. Only snapshots with an eligible pick can be rolled. Quick Draft can complete a squad using projected eleven-round strength from ratings, traits, styles, stamina, starting form and consistency.
- **Quick Sim:** From the draft, choose **Quick sim** to keep your existing picks, fill empty slots and simulate all eleven rounds with automatic reserve rotation. It uses the same full tournament rules, traits, fatigue and form as manual play. Results include every round, all boards and full standings, and save normally. It uses the same profile-aware picks as Quick Draft, retaining existing picks and offers. With a complete squad, it immediately simulates that team.
- **Player traits:** 115 famous players have fixed, sourced career-inspired traits across their year editions. Everyone else rolls one of 25 abilities or no trait (25% chance) with each new draft offer. A picked trait stays for the game and survives reloads. The **Player traits** guide explains every effect and links the career trait sources. Trait rolls are visible in both modes.
- **Player profiles:** Each player has a playing style plus stamina and consistency rated 1–5. Famous players use fixed game presets derived from their career trait archetype; other players roll profiles with each offer. Everyone rolls starting form. These numerical values are fictional balance choices. Both your squad and all 31 opponents use the complete system.
- **You are the captain:** Draft the five players, choose four starters, rotate the reserve and manage fatigue. **Team profiles** shows each player's style, stamina, form and consistency. There are no captain attributes, staff slots or leadership bonuses; [the captaincy notes](data/captaincy.md) record this design decision.
- **Lineup:** Four active boards and one reserve. Choose an empty slot before picking; click two filled slots to swap. Active boards start in source-rating order. Between rounds, use **Arrange boards** above the match report or in the preview. Compare each board’s opponent, colour, conditions and readiness, then move a starter up/down or choose a player to swap. Changes save immediately. **Order by rating** restores the active four to source order; the reserve stays out. A reserve substitution takes the exact board being rested, preserving the other positions.
- **Modes:** Classic shows source ratings. Expert hides ratings on draft cards; use traits, styles and your chess knowledge. The archive and source dialogs remain available as reference material.
- **Olympiad:** Face the 31 strongest all-time national A/B lineups derived from the catalogue, alongside your fantasy squad in a 32-team field. Each opposing roster can mix eras; Russia and the Soviet Union remain separate. Open **All-time field** to inspect the teams and their source editions. Play eleven rounds with no rematches. A match win gives 2 match points; a draw gives 1. All 32 teams play every round.
- **Match preview:** Compare the teams and projected board points, then inspect each matchup with explicit piece colours, source/effective ratings, visible modifier calculations and win/draw/loss bars. Both reserves appear below the boards. Conditional specialist and counter bonuses reach up to 80 effective Elo, allowing a lower-rated player to outperform a stronger player in favourable conditions; generalists receive a smaller constant bonus. Published source ratings stay unchanged, and manual board choices are retained.
- **Stable rounds and colours:** Seeding and the last rating tiebreak use the roster's strongest four source ratings, fixed at registration. Substitutions and manual board swaps cannot change pairings, standings order, board colours or abstract conditions. Colour allocation considers team and individual histories and projected reserve-related board shifts, balancing white/black appearances and discouraging long colour runs while retaining alternating boards and two whites per team. Rotations can still make perfect individual balance impossible.
- **Stamina and fatigue:** Every player, including all opponents, carries fatigue load from 0–100. A played round adds `14 − stamina` load (9–13); sitting out removes 30. Each point above 24 costs 0.5 effective Elo, up to 38; grinders lose half as much. Recovery occurs after a played round, so swapping or previewing cannot erase fatigue. Squad, opponent-roster and rotation views show the load and penalty.
- **Reserve planning:** Opponents compare all five possible reserves over up to three remaining rounds, maximising expected match points from source rating, traits, playing styles, draw chances, fatigue, form and recovery. Current fixtures use their known conditions and projected opposing lineup; unknown future rounds use a neutral 2720 reference mix. They cannot see future results or daily performance. Choose your own reserve manually or use **Use recommended lineup**. **Auto-rotate & finish** uses the same planner for your team before every remaining round. AI boards remain ordered by source rating. Your recommendations preserve your chosen board positions, replacing a rested starter in that exact slot; automatic finishing uses that same rule.
- **Form and consistency:** Form runs from Cold to Hot (−2 to +2), worth 6 Elo per level. Beating or falling short of the expected board score by more than 0.15 changes form one step; resting moves it toward neutral. Consistency 1–5 narrows the daily performance swing from ±16 to ±2 Elo (±16, ±12, ±8, ±4 and ±2 for consistency 1–5). Each player's daily performance is fixed for the round; previews and board moves cannot reroll it.
- **Results:** Review individual boards, previous rounds and full standings, or copy your result. Match reports show source/effective ratings, traits and readiness; open **Performance breakdown** for each player's full modifier and post-game details. Pre-match forecasts show the full calculations directly. Starting over asks before replacing progress.
- **Best runs:** Open **Best runs** from the main navigation to revisit your three best completed games. Records rank by match points, wins, finishing place, Sonneborn–Berger and board points; exact ties keep the earlier record. Each includes the five-player squad and source editions, individual scores, all eleven complete match reports with performance breakdowns, every round's 16 team scores and the final 32-team standings. Manual play, Auto-rotate & finish and Quick sim all record results automatically. Records stay in this browser across new drafts and reloads; reviewing one leaves the active game untouched. An existing completed save is recorded on its next load; previously discarded games cannot be recovered.
- **Resume:** Valid version-4 saves resume from browser local storage. Version-1, version-2 and version-3 games remain under their original keys; the new profile rules start with a fresh draft. Incompatible or malformed version-4 saves are copied to a backup key before replacement.

## Rating data and historical coverage

The playable catalogue contains **774 country-year snapshots**, **8 mixed-country Legends collections**, **3,910 player editions**, including 40 pre-1927 Legends, across **71 national federation codes**. Official-list coverage is **1972–2026 every two years**, plus **22 audited historical country snapshots from 1927–1970**. The schedule is 2026, 2024, …, 1928, plus 1927, the first Olympiad year. **50 of the 51 scheduled years are playable; January 1944 remains an explicit affiliation-audit gap.** Seven neutral `FID` observations are retained in the source data and excluded from country rolls.

Sources:

- [Official FIDE rating downloads](https://ratings.fide.com/download_lists.phtml): January standard lists for 2002–2026.
- [OlimpBase's transcribed historical FIDE lists](https://www.olimpbase.org/Elo/summary.html): 1972–2000. The available 1972 list is July and 1974 is May; other imported periods use January. Source notes record incomplete early coverage of women and missing activity flags.
- [Official FIDE federation rankings](https://ratings.fide.com/top_federations.phtml): federation names and country codes, supplemented by historical names such as the Soviet Union, East Germany and Yugoslavia. A player's federation is taken from that period's list.
- [Chessmetrics](http://www.chessmetrics.com/cm/): 2,300 historical estimates across January 1927 and every even year from 1928–1970 are retained in `data/historical-observations.json`, with original URLs and hashes. Separate affiliation audits establish 22 playable top fives: Soviet Union 1927/1928; USA 1930/1932/1934/1936/1940/1942; Hungary 1938; and Soviet Union every even year from 1946–1970. These are **estimates, not official FIDE ratings**, which began in 1971.

**Early country coverage is selective.** The January 1944 source table is retained, but no complete national top five has passed the affiliation audit. The archive shows that year as a gap. Other early countries also remain unavailable until their top fives can be verified. Each included country's fifth member appears within the source top 100 and every higher-ranked possible member is checked. `data/historical-affiliations.json` preserves 462 player/year decisions, source URLs, temporal qualifications and identity links. National careers support explicitly labelled continuity inferences; these are not claims of exact-month FIDE registration. Ambiguous wartime and emigration cases are not forced into unsupported national assignments. The January 1930 source's duplicate Takács entries remain documented; neither alters the American top five.

All titles and sexes are eligible. An explicit inactive flag excludes a player; inactivity is not inferred when historical lists lack reliable flags. Countries need at least five listed eligible players. Ties use source name, then source ID. Birth country, current citizenship and Olympiad team rosters are not substituted for the period federation. Historical name spellings and IDs may vary; unique matching source names and sourced identity crosswalks link older records to later FIDE identities where possible. Namesakes remain separate.

Each snapshot records its source date, URL, archive SHA256 and published player ratings. The in-game **Countries & years** archive exposes available years, top fives, source notes and coverage gaps.

### Comparing eras

Top-five selection and gameplay both use the **published source rating unchanged**. There is no era adjustment. Pre-FIDE Chessmetrics estimates remain labelled as estimates; comparing these ratings across eras does not establish absolute playing strength. Source top-100 statistics remain recorded for provenance but do not affect gameplay.

Only country-year snapshots containing a player rated **at least 2600** are playable. A top rating of exactly 2600 qualifies; 2599 does not. Qualifying snapshots retain their complete top five, including players below the cutoff. The checked-in source observations retain excluded snapshots for reproducibility.

No actual chess moves are played: each board samples an outcome from Elo expected score, a draw probability, color advantage, fatigue, traits, styles, form and daily performance. Tournament randomness is seeded; the same squad, traits, profiles, seed and reserve decisions produce repeatable results.

Effective rating gaps use `E = 1 / (1 + 10 ** (-gap / 320))`, including a 28-point White advantage. The scale of 320 makes favourites more dependable than the previous 400; it is a game balance choice. Draw probability still falls with the gap and responds to traits/styles, while `win + draw / 2` retains that expected score. Source ratings, the opponent field and conditional trait effects remain unchanged.

### Career-inspired traits

The 115 curated career traits cover every person with a sampled catalogue edition rated at least 2750, plus many other recognizable players. They include Nepomniachtchi, Firouzja, Mamedyarov, Rapport, Svidler, Leko, Adams, Keres, Bronstein and Seirawan alongside the original champions. Each career trait highlights a sourced recurring aspect of play; younger players' profiles describe their careers so far, and some sources explicitly describe changes in style. Profiles match canonical person IDs, including sourced cross-era links; the modern Tigran L. Petrosian remains a separate person. Sources and rationales are in `dist/traits.js`, the in-game guide and [the trait data notes](data/traits.md).

All numerical modifiers, drawbacks and conditions are **fictional balance rules**, not measured strengths or biographical weaknesses. Unprofiled players' random traits make no claims about their real styles. Match conditions (opening theory, sharp play, quiet maneuvering, technical endings and time pressure) are abstract, seeded inputs, not positions from simulated moves. Effects are resolved simultaneously for both sides; counters reduce positive bonuses, and Elo bonuses are bounded at 80 per side. Draw modifiers change variance while retaining the expected score implied by effective Elo and color. Match previews and reports distinguish source Elo, fatigue and trait bonuses.

Roll each draft candidate's trait once when creating an offer. Save the offer and the selected player's assignment; rendering, opening dialogs and reloading never reroll them. A new offer can generate a different unprofiled trait. Opponents receive their own deterministic assignments at tournament start and retain them throughout. Traits live in browser game state and a versioned pure rules module; they do not change the shared SQL source catalogue.

The expanded career traits use trait rules `career-traits-5`; gentler fatigue, form and daily performance use profile rules `squad-profiles-4`; manual user board order, the stronger rating curve, stable pairings, fixture random streams and history-based colours use simulation rules `olympiad-6`. Weighted offers and profile-aware automatic picks use `competitive-draft-1`. Within the same catalogue and trait rules, compatible `olympiad-5` drafts and active tournaments are fully validated and upgraded in place, preserving picks, played rounds and readiness. Completed `olympiad-5` saves keep their original rules identity so Best runs does not duplicate them. Incompatible version-4 saves are preserved under `11-0-0:save:v4:backup` before a fresh draft starts. The expanded catalogue and new career profiles change the saved fingerprint, so previous active games are backed up before a fresh draft. Best-run reports stay independently readable. Earlier saves retain their original histories.

Playing style is separate from an individual ability: attacking favors sharp play, positional favors quiet/technical conditions, defensive counters attacking styles, and universal provides a small constant bonus. Fixed famous-player presets are interpretations of the career trait's game archetype; stamina and consistency are not sourced measurements of those real people. Other profiles are random game data. Current form evolves separately from immutable starting profiles, on both sides. Previews and reports show each modifier and the form after a game; the all-time roster dialog exposes opponents' current profiles and fatigue.

### Reproduce or extend the catalogue

The checked-in source data makes normal startup independent of external websites. To reproduce the official-list extraction, install Python 3 and run:

```bash
npm run data:import
npm run db:seed
```

The importer downloads only missing archives to `.data/rating-archives/` and validates them against `data/rating-sources.json`. Set `RATINGS_CACHE` to reuse an archive directory. Updating a source requires deliberately updating its pinned checksum and reviewing the resulting top fives. Run `npm run data:historical` to regenerate the audited early snapshot from `historical-observations.json` and `historical-affiliations.json`. The importer rejects a country if any player ranked above its fifth member lacks a sourced affiliation or explicit exclusion. Other early country rosters remain unavailable until their affiliations and country rankings are verified. The 1927 Soviet country label does not imply FIDE membership; the Soviet Union joined FIDE in 1947.

### All-time tournament field

The tournament keeps 32 teams: your squad plus the strongest 31 national A/B teams. Build the field from the playable catalogue as follows:

1. Keep each person's highest recorded source-rating edition. A player who represented multiple federations belongs to the federation in that edition. Equal ratings prefer the latest year, then federation code and edition ID.
2. Within each federation, rank those distinct people by rating. Its first five form the A team; its next five form the B team. Each roster has four starting boards and a fifth reserve. Opponents can rotate that reserve to rest tired starters during the simulation; roster allocation stays fixed. No person repeats across opposing teams.
3. Rank all complete A/B teams by the sum of their four starting ratings, before display rounding, and select 31. B teams receive no reserved places. Russia (`RUS`) and the Soviet Union (`URS`) are independent federation pools. No C teams are generated.

These are **best observed editions**, not complete career peaks: two-year sampling, source top-five cutoffs and selective early coverage can omit stronger editions or players. Historical estimates remain estimates and are used unchanged. The **All-time field** dialog lists every opponent and links each player's edition to its original country-year source. Your fantasy squad is independent of opposing roster allocation and may draft the same historical person as an opponent.

`data/identity-links.json` documents verified ID changes and name-qualified exceptions. It prevents duplicate transferred players without merging namesakes, including the two Andrei Sokolovs, or reused historical IDs (Oll/Ladva and Braga/Codenotti). The original source IDs remain in the observation files. Identity-link changes advance the catalogue release automatically; bump the policy marker in `CATALOGUE_FORMAT` after changing selection rules. Existing incompatible browser saves are backed up before a new draft starts.

`server/catalog.mjs` builds an atomic catalogue release from the source files. SQLite and D1 use the same six-table schema: sources, periods, country snapshots, people, player editions and metadata. Imports are separate from schema-only migrations. A changed release replaces stale rosters atomically; browser saves carry the release ID to reject incompatible data safely.

## Architecture

The interface combines a chess almanac with tournament broadcast graphics: warm paper, forest green, serif headings, country/year stamps and tabular scoreboards. A compact cover and wider desktop canvas bring the game controls forward. The draft comes before the lineup, with two offer columns on larger screens and one on phones; every offer retains all five players and their details. Tournament actions sit above the match report, and compact standings follow it directly rather than waiting for the squad column. Trait symbols supplement their written labels; form and fatigue retain text readouts alongside colour. Mobile lineups use two columns so all five players and their profiles remain readable. The serif stack uses system fonts; the existing local sans fonts and licenses remain bundled.

| Path | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/styles.css`, SVGs, `dist/fonts/` | Maintained browser shell, responsive presentation and local assets; retain font licenses. |
| `dist/app.js` | Loads the catalogue URL declared in the page; renders the draft, archive, dialogs and tournament; handles browser saves. |
| `dist/engine.js` | Configurable catalogue indexes, unique-player rules, full-five offers, seeded simulation, pairings, scoring, fatigue and save validation; independent of DOM and database APIs. |
| `dist/traits.js`, `data/traits.md` | Career-inspired career profiles, source citations, random trait assignment and pure matchup effects; numerical effects are fictional game rules. |
| `dist/player-profile.js` | Style presets, stamina, form and consistency rules; pure game mechanics shared by user and opponent teams. |
| `dist/run-history.js` | Independent completed-run reports, top-three ranking, deduplication and history validation; no browser storage access. |
| `server/catalog.mjs`, `server/all-time.mjs` | Shared source selection, identity crosswalks, atomic import/query logic and ranked all-time A/B rosters for SQLite/D1. |
| `server/sqlite.mjs`, `scripts/serve.mjs` | Local persistent database, migrations, seeding, read-only catalogue API and static assets. |
| `data/`, `scripts/ratings/` | Checked-in observations, source checksums, federation metadata and reproducible importers. |
| `backend/` | Isolated Sites Vinext/D1 adapter using the supplied Sites build integration. Existing browser modules stay framework independent. |
| `backend/db/schema.ts`, `drizzle/` | Drizzle schema and generated schema-only SQL migrations, snapshots and journal. |
| `scripts/build-hosted.mjs`, `.openai/hosting.json` | Hosted build and D1 binding; preserves the existing Site identity and browser source. |
| `scripts/build-pages.mjs`, `release/pages/` | Separate static build, exporting the canonical SQL catalogue as JSON with relative browser asset URLs; generated output is ignored by Git. |

The game moves through `draft` → `tournament` → `results`. UI actions update state through the engine and re-render. Quick Sim automates that same sequence through pure `completeDraft` and `quickSim` engine functions, committing the completed result to browser state only after success. Existing offer assignments and picked traits/profiles are retained. Saves use `11-0-0:save:v4` and carry catalogue, trait and profile rules versions; selected dialogs and views are transient. Teams retain their starting profiles, current form, consecutive-game streaks and persistent fatigue loads. Validation reconstructs form, load and rest history from recorded boards. There are no application accounts or remote game saves.

Personal records use a separate `11-0-0:best-runs:v1` local-storage key and retain at most three completed reports. They copy player editions, source links, profiles, final standings, all team scores and the user's 44 board reports; other teams' individual boards are omitted to keep storage small. Archived reports retain their catalogue/rules versions and remain readable independently of the current catalogue and active-save compatibility. They are reports, not resumable games. Reloading the same result does not duplicate it or change its recorded date. Unreadable history is backed up under `11-0-0:best-runs:v1:backup` before new records replace it; storage failures leave records available for the current tab and show a notice.

## Checks

```bash
npm run check
npm test
```

Parser regression checks require Python 3, also used by the source importer. Tests cover headerless FIDE files, long title fields, unknown birth years, persistent SQL data, source ordering, known USA rosters, unchanged ratings, the inclusive 2600 cutoff, source identity links, all-time A/B field selection, cross-year player uniqueness, complete five-player offers, 1,000 drafts, 100 tournaments, scoring, pairings, reproducibility, symmetric stamina/fatigue, trait/style effects, captain-free profiles and match modifiers, bounded form and consistency, forecast consistency and invalid saves. Browser QA also checks board swaps, stable fixtures, exact-slot reserve changes, native select controls and focus return, compatible old-save restoration without duplicate reports, system-theme following, keyboard toggling, saved appearance preferences, cross-tab updates, mobile theme controls, saved profiles, guide/source dialogs, forecasts, seeded opponent traits/profiles and preservation of legacy or malformed saves.

Static release tests compare exported JSON with the SQL API catalogue, verify complete browser assets and font licenses, preserve maintained source and persistent database bytes, and check reproducible rebuilds without stale files.

For a reproducible simulation investigation, run the read-only audit against an in-memory catalogue:

```bash
node scripts/audit-simulation.mjs --runs 200 --output /tmp/11-0-0-simulation-audit.json
```

This compares five drafting/rotation policies across 1,000 complete tournaments, probes substitution effects and checks probability arithmetic, colour allocation and fatigue. It changes no game rules, persistent database or browser saves. See the [original investigation](reports/simulation-audit-2026-10-20.md) and [follow-up fixes and measurements](reports/simulation-fixes-2026-10-20.md). The follow-up uses `--runs 100 --probe-seeds 10` (500 tournaments, 880 substitutions); `--skip-probes` is available for isolated balance experiments. Regenerate measurements after changing the engine or catalogue.

To diagnose strong squads and compare balance settings, run:

```bash
node scripts/audit-balance.mjs --runs 500 --workers 4 --baseline-ref 68a4ff6 --output /tmp/11-0-0-balance.json
```

This runs 6,000 complete tournaments: four fixed squads near 2700/2750/2800/2850, 500 paired seeds and three variants. `baseline` loads the recorded Git revision; `profiles` uses current profiles with Elo scale 400; `steeper` uses the same profiles with scale 320. Copies run in temporary directories against an in-memory catalogue, leaving the app, persistent database and saves untouched. Reports include exact four-board match forecasts, sampler calibration, modifier contributions, paired score differences, W–D–L distributions, titles, perfect runs and poor-run frequencies with confidence intervals. A poor run means at most 10 match points, the score of 2–6–3. Summed forecasts describe the opponents actually encountered; Swiss pairings and form adapt to results, so those sums are not unconditional tournament expectations.

Use `--cohorts 2800`, `--variants baseline,profiles`, `--offset 1000` or `--include-samples` for focused comparisons, fresh evaluation seeds or individual records. The four squads are explicit benchmarks, not representative samples of every squad with those ratings. Runtime depends on the machine and worker count; the default performs thousands of tournaments. The [21 October balance evaluation](reports/simulation-balance-2026-10-21.md) records the selected settings and 5,250 tournaments on fresh evaluation seeds under `olympiad-5`, before manual board-order support. Reproduce those measurements at its recorded commit.

Historical rating modes are investigated in the [era-rating study](reports/era-ratings-2026-10-21.md). It compares a fictional rank-based balance candidate with the evidence needed for move-based strength estimates. These modes are proposals; current gameplay still uses unadjusted source ratings. Reproduce the descriptive study without changing the app or persistent database:

```bash
node scripts/audit-era-ratings.mjs --output /tmp/era-ratings.json
```

The [pre-1927 investigation](reports/pre-1927-2026-10-21.md) compares twelve original Chessmetrics/Edo tables, identifies rated candidate pools and explains affiliation, annual-period and duplicate-person requirements. The research remains a dated study. The playable Legends extension now uses 43 pinned Chessmetrics tables: January every two years from 1844–1926 plus June 1859, retaining the strongest forty distinct observed source editions in eight groups of five. `python -B scripts/import-legends.py` reproduces the source observations; `server/legends.mjs` selects the groups. These mixed-country groups infer no period affiliations and do not publish additional national top fives. Download the exact source files listed in its manifest, then reproduce the coverage study:

```bash
python -B scripts/research-early-history.py --source-dir .data/early-history-research --output /tmp/pre-1927.json
```

Optional browser QA, with the local app running:

```bash
npm install --no-save --package-lock=false playwright-core
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-qa.mjs
```

Override `QA_URL`, `QA_ARTIFACTS` or `PLAYWRIGHT_MODULE` if needed. Screenshots default to `/tmp/eleven-zero-zero-qa/screenshots`.

## GitHub Pages release

Run `npm run build:pages` to generate the static site in `release/pages/`, then `npm run preview:pages` to test it at http://localhost:4174/11-0-0/. The build exports the canonical catalogue through an in-memory SQLite database; the published game loads local JSON and needs no backend. Relative URLs support a repository subpath or a root domain with the same artifact.

[The release guide](docs/github-pages.md) covers local checks, GitHub setup, save migration boundaries and catalogue updates. The included GitHub Actions workflow validates pull requests and deploys successful pushes to `main` once Pages is enabled. This preparation does not publish anything by itself.

## Hosted database and build

The existing Sites deployment uses Cloudflare D1 through binding `DB`. Install the isolated hosting dependencies with `npm --prefix backend ci`, then run `npm run build`. The Sites workflow packages the generated Worker/assets and applies pending Drizzle schema migrations before deployment. On the first catalogue request for a release, an idempotent D1 data import publishes the complete roster and release marker in one transaction. No arbitrary SQL or import endpoint is exposed to browsers.

After changing `backend/db/schema.ts`, run `npm run db:generate`, review the generated SQL and commit the migration and metadata together. Applied migrations are immutable. Local SQLite and hosted D1 are separate databases seeded from the same checked-in sources. Restart the local server after a data import so its catalogue cache uses the new release.

## Contributing

Read [AGENTS.md](AGENTS.md). Split each task into focused, reviewable commits; keep implementation, relevant tests and accompanying docs together. Write messages as `action: message`, for example `add: import historical country-year rating snapshots`.

The [2024 Olympiad format](https://handbook.fide.com/files/handbook/Olympiad2024.pdf) inspires the eleven-round, four-board, one-reserve and 2/1/0 structure. This smaller 32-team simulation uses simplified Swiss matching and full Sonneborn–Berger, then board points, fixed roster seeding rating and ID as tiebreaks. The draft loop is inspired by [38–0–0](https://38-0-0.com/). This is an independent game, unaffiliated with FIDE or 38–0–0.

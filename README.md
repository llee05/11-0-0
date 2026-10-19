# 11–0–0 · The Fantasy Chess Olympiad

Draft a team from historical country-year rating lists, spend up to 100 credits on five players, and chase eleven tournament wins.

## Run locally

Requires **Node.js 22.13 or newer** (for built-in SQLite). The local app needs no npm dependencies. Run from this repository's root:

```bash
npm start
```

Open http://localhost:4173. `npm run dev` starts the same server; set `PORT` for another port. The server creates `.data/catalogue.sqlite`, applies pending schema migrations and imports the checked-in rating catalogue. Override `DATABASE_PATH` to choose another database file. Game progress still saves in the browser; SQLite stores the shared historical player catalogue.

Edit the maintained HTML, CSS and ES modules in `dist/` directly. The app now needs its `/api/catalog` endpoint, so a static-only web server is insufficient. Hosted builds add generated `dist/server/`, `dist/client/` and `dist/.openai/` directories without replacing the maintained source files.

## Play

- **Country-year rolls:** USA 2026 and USA 2022 are separate rollable options. Every offer shows its source list's five highest standard-rated players, ordered by the original rating. A snapshot is playable only if at least one of those players is rated strictly above 2500. Olympiad participation is never a selection filter.
- **Draft:** Pick five distinct people within 100 credits. Two nation rerolls are available. Unaffordable or already-drafted players remain visible and disabled; lower-ranked players never replace them. Only snapshots with an eligible pick can be rolled. Quick Draft can complete an affordable squad.
- **Lineup:** Four active boards and one reserve. Choose an empty slot before picking; click two filled slots to swap. Active boards sort by source rating before the tournament and after substitutions.
- **Modes:** Classic shows source ratings. Expert hides ratings on draft cards; prices hint at strength. The archive and source dialogs remain available as reference material.
- **Olympiad:** Face the 31 strongest all-time national A/B lineups derived from the catalogue, alongside your fantasy squad in a 32-team field. Each opposing roster can mix eras; Russia and the Soviet Union remain separate. Open **All-time field** to inspect the teams and their source editions. Play eleven rounds with no rematches. A match win gives 2 match points; a draw gives 1. All 32 teams play every round.
- **Fatigue:** Starting with the fifth consecutive appearance, each extra game reduces effective rating by 8, capped at 40. One round on the bench resets fatigue.
- **Results:** Review individual boards, previous rounds and full standings, or copy your result. Starting over asks before replacing progress.
- **Resume:** Valid version-2 saves resume from browser local storage. Old prototype saves remain under their original version-1 key. Incompatible version-2 saves are copied to a backup key before a fresh draft starts.

## Rating data and historical coverage

The playable catalogue contains **722 country-year snapshots**, **3,610 player editions** and **93 federation codes**, covering **1974–2026 every four years**, plus **12 audited historical estimates from 1927–1970**. All 26 scheduled years now have at least one country. Four neutral `FID` entries are excluded from country rolls. The intended schedule is 2026, 2022, …, 1930, plus 1927, the year of the first Chess Olympiad.

Sources:

- [Official FIDE rating downloads](https://ratings.fide.com/download_lists.phtml): January standard lists for 2002–2026.
- [OlimpBase's transcribed historical FIDE lists](https://www.olimpbase.org/Elo/summary.html): 1974–1998. The earliest 1974 list available here is May; subsequent snapshots use January. Source notes record incomplete early coverage of women and missing activity flags.
- [Official FIDE federation rankings](https://ratings.fide.com/top_federations.phtml): federation names and country codes, supplemented by historical names such as the Soviet Union, East Germany and Yugoslavia. A player's federation is taken from that period's list.
- [Chessmetrics](http://www.chessmetrics.com/cm/): 1,200 historical rating estimates across January 1927, 1930, 1934, …, 1970 are retained in `data/historical-observations.json`. Separate affiliation audits establish 12 playable country-year top fives: Soviet Union 1927; USA 1930/1934/1942; Hungary 1938; and Soviet Union 1946/1950/1954/1958/1962/1966/1970. These are **estimates, not official FIDE ratings**, which began in 1971. Contemporary records and federation histories support the affiliations, with surrounding-career inferences explicitly qualified.

**Early country coverage is selective.** Every scheduled year has a rollable country, but other countries in those early years remain unavailable until their top fives and affiliations can be audited. The source lists cover only the world top 100; each included country's fifth member appears before that cutoff and every higher-ranked possible member is checked. `data/historical-affiliations.json` preserves 222 player/year affiliation decisions, source URLs, temporal qualifications and curated identity links. Ambiguous wartime and emigration cases are not forced into unsupported country assignments. The January 1930 source's duplicate Takács entries are documented; neither alters the American top five.

All titles and sexes are eligible. An explicit inactive flag excludes a player; inactivity is not inferred when historical lists lack reliable flags. Countries need at least five listed eligible players. Ties use source name, then source ID. Birth country, current citizenship and Olympiad team rosters are not substituted for the period federation. Historical name spellings and IDs may vary; unique matching source names and sourced identity crosswalks link older records to later FIDE identities where possible. Namesakes remain separate.

Each snapshot records its source date, URL, archive SHA256 and published player ratings. The in-game **Countries & years** archive exposes available years, top fives, source notes and coverage gaps.

### Comparing eras

Top-five selection and gameplay both use the **published source rating unchanged**. There is no era adjustment. Pre-FIDE Chessmetrics estimates remain labelled as estimates; comparing these ratings across eras does not establish absolute playing strength. Source top-100 statistics remain recorded for provenance but do not affect gameplay.

Only country-year snapshots containing a player rated **strictly above 2500** are playable. A top rating of exactly 2500 does not qualify. Qualifying snapshots retain their complete top five, including players below the cutoff. The checked-in source observations retain excluded snapshots for reproducibility.

Prices use `max(8, round((game Elo − 2320) / 20))`. No actual chess moves are played: each board samples an outcome from Elo expected score, a draw probability, color advantage and fatigue. Tournament randomness is seeded; the same squad, seed and reserve decisions produce repeatable results.

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
2. Within each federation, rank those distinct people by rating. Its first five form the A team; its next five form the B team. Each roster has four starting boards and a fifth reserve; the simulation uses the four starters. No person repeats across opposing teams.
3. Rank all complete A/B teams by the sum of their four starting ratings, before display rounding, and select 31. B teams receive no reserved places. Russia (`RUS`) and the Soviet Union (`URS`) are independent federation pools. No C teams are generated.

These are **best observed editions**, not complete career peaks: four-year sampling, source top-five cutoffs and selective early coverage can omit stronger editions or players. Historical estimates remain estimates and are used unchanged. The **All-time field** dialog lists every opponent and links each player's edition to its original country-year source. Your fantasy squad is independent of opposing roster allocation and may draft the same historical person as an opponent.

`data/identity-links.json` documents verified ID changes and name-qualified exceptions. It prevents duplicate transferred players without merging namesakes, including the two Andrei Sokolovs, or reused historical IDs (Oll/Ladva and Braga/Codenotti). The original source IDs remain in the observation files. Identity-link changes advance the catalogue release automatically; bump the policy marker in `CATALOGUE_FORMAT` after changing selection rules. Existing incompatible browser saves are backed up before a new draft starts.

`server/catalog.mjs` builds an atomic catalogue release from the source files. SQLite and D1 use the same six-table schema: sources, periods, country snapshots, people, player editions and metadata. Imports are separate from schema-only migrations. A changed release replaces stale rosters atomically; browser saves carry the release ID to reject incompatible data safely.

## Architecture

| Path | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/styles.css`, SVGs, `dist/fonts/` | Maintained browser shell, responsive presentation and local assets; retain font licenses. |
| `dist/app.js` | Loads `/api/catalog`; renders the draft, archive, dialogs and tournament; handles browser saves. |
| `dist/engine.js` | Configurable catalogue indexes, affordability, unique-player rules, full-five offers, seeded simulation, pairings, scoring, fatigue and save validation; independent of DOM and database APIs. |
| `dist/traits.js`, `data/traits.md` | Career-inspired signature profiles, source citations, random trait assignment and pure matchup effects; numerical effects are fictional game rules. |
| `server/catalog.mjs`, `server/all-time.mjs` | Shared source selection, identity crosswalks, atomic import/query logic and ranked all-time A/B rosters for SQLite/D1. |
| `server/sqlite.mjs`, `scripts/serve.mjs` | Local persistent database, migrations, seeding, read-only catalogue API and static assets. |
| `data/`, `scripts/ratings/` | Checked-in observations, source checksums, federation metadata and reproducible importers. |
| `backend/` | Isolated Sites Vinext/D1 adapter using the supplied Sites build integration. Existing browser modules stay framework independent. |
| `backend/db/schema.ts`, `drizzle/` | Drizzle schema and generated schema-only SQL migrations, snapshots and journal. |
| `scripts/build-hosted.mjs`, `.openai/hosting.json` | Hosted build and D1 binding; preserves the existing Site identity and browser source. |

The game moves through `draft` → `tournament` → `results`. UI actions update state through the engine and re-render. Saves use `11-0-0:save:v2`; selected dialogs and views are transient. There are no application accounts or remote game saves.

## Checks

```bash
npm run check
npm test
```

Tests cover persistent SQL data, source ordering, known USA rosters, unchanged ratings, the strict 2500 cutoff, source identity links, all-time A/B field selection, cross-year player uniqueness, complete five-player offers, 1,000 drafts, 100 tournaments, scoring, pairings, reproducibility, fatigue and invalid saves.

Optional browser QA, with the local app running:

```bash
npm install --no-save --package-lock=false playwright-core
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/browser-qa.mjs
```

Override `QA_URL`, `QA_ARTIFACTS` or `PLAYWRIGHT_MODULE` if needed. Screenshots default to `/tmp/eleven-zero-zero-qa/screenshots`.

## Hosted database and build

The existing Sites deployment uses Cloudflare D1 through binding `DB`. Install the isolated hosting dependencies with `npm --prefix backend ci`, then run `npm run build`. The Sites workflow packages the generated Worker/assets and applies pending Drizzle schema migrations before deployment. On the first catalogue request for a release, an idempotent D1 data import publishes the complete roster and release marker in one transaction. No arbitrary SQL or import endpoint is exposed to browsers.

After changing `backend/db/schema.ts`, run `npm run db:generate`, review the generated SQL and commit the migration and metadata together. Applied migrations are immutable. Local SQLite and hosted D1 are separate databases seeded from the same checked-in sources. Restart the local server after a data import so its catalogue cache uses the new release.

## Contributing

Read [AGENTS.md](AGENTS.md). Split each task into focused, reviewable commits; keep implementation, relevant tests and accompanying docs together. Write messages as `action: message`, for example `add: import historical country-year rating snapshots`.

The [2024 Olympiad format](https://handbook.fide.com/files/handbook/Olympiad2024.pdf) inspires the eleven-round, four-board, one-reserve and 2/1/0 structure. This smaller 32-team simulation uses simplified Swiss matching and full Sonneborn–Berger, then board points, team rating and ID as tiebreaks. The draft loop is inspired by [38–0–0](https://38-0-0.com/). This is an independent game, unaffiliated with FIDE or 38–0–0.

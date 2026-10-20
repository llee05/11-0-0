# Legends and era-balanced game ratings · 21 October 2026

The game now has eight rollable **Legends collections** containing forty distinct pre-1927 players. **Era-balanced ratings apply throughout the main game**, in both Classic and Expert; no extra rating mode was added. The [release snapshot](era-balanced-release-2026-10-21.json) records the catalogue/rules identity, source hashes and rating-change counts.

## Legends

`data/legends-observations.json` retains 43 checksum-pinned Chessmetrics tables: January every two years from 1844 through 1926, plus June 1859. `server/legends.mjs` keeps each source person's strongest observed estimate, prefers the latest month for a tie, ranks the strongest forty qualifying people and divides consecutive fives into Legends I–VIII. Sampling can miss stronger editions; these are not claimed to be exhaustive career peaks.

The collections include Morphy, Anderssen, Steinitz, Lasker, Capablanca, Alekhine, Rubinstein and Nimzowitsch. Each edition keeps its actual source date, URL, checksum and rating. Their neutral star identifies a mixed-country collection; no nationality is inferred from birthplace, residence or later federation. They are draft offers and do not enter the national opposing field. Canonical identities link people such as Marshall to their later country editions, preventing a second pick of the same person.

SQL stores collection kind and display period separately from each edition's actual year and source. The generated schema migration, Drizzle snapshot and journal are committed together. Existing country top-five audits and the 1944 evidence gap are preserved. Reproduce the original observations with `npm run data:legends`; missing archives are downloaded and every response must match its pinned checksum and period title.

Seventeen sourced career profiles bring the total to 115. They cover every newly sampled source edition at least 2750, plus Morphy, Anderssen and Nimzowitsch. Their citations and style qualifications are retained in the player-trait guide. The fixed numerical presets remain fictional game archetypes.

## The main-game rating rule

`dist/rating-rules.js` owns `era-balanced-1`. Map each source rating to the same world rank in the fixed January 2026 distribution. Equal source ratings share the mean reference value across their tied ranks. Interpolate between observed anchors; beyond the observed range, retain the gap from the nearest endpoint. Cap each change at ±150 and round to a whole point. Sparse early lists contribute only their published ranks; a missing top-100 tail is never fabricated.

| Edition | Original estimate | Era adjustment | Game base |
| --- | ---: | ---: | ---: |
| Morphy, June 1859 | 2743 | +97 | 2840 |
| Capablanca, January 1920 | 2873 | −33 | 2840 |
| Lasker, January 1900 | 2858 | −18 | 2840 |

These examples are design outputs, **not measured predictions of how those players would perform today**. The original [Chessmetrics observations](http://www.chessmetrics.com/cm/CM2/HistoricalRatings.asp) remain estimates. January 2026 editions are unchanged. Across all 3,910 playable editions, 1,952 game ratings increase, 1,749 decrease and 209 stay the same; the largest absolute adjustment is 150.

The source is retained in `rawRating`, the difference in `eraAdjustment`, and the game base in `rating`. In a board forecast/report, `baseRating` is the game base and effective `rating` includes traits, style, form, daily performance and fatigue. The visible calculation follows that complete chain.

Draft weights, automatic picks, starting/AI board order, reserve planning, immutable roster seeding, forecasts and simulation all consume game bases on both sides. National A/B allocation selects each person's best era-balanced **country** edition; equal game ratings prefer the latest year. The field is therefore rebuilt under the new ranking policy. Country snapshot membership, source order and the inclusive source-2600 eligibility cutoff remain source-based. Users retain free manual board order between rounds.

## Presentation and save handling

A visible disclaimer appears in the draft and tournament, with a **How ratings work** dialog. Draft cards and archive/source dialogs show the game rating alongside its original source and adjustment. Forecasts show **Source → Game → Effective**. Expert hides source and game ratings on draft cards; reference dialogs remain available as before.

The rules fingerprint now includes `career-traits-5/squad-profiles-4/olympiad-7/competitive-draft-1/era-balanced-1`. Incompatible active/completed saves are backed up before a fresh draft rather than replayed under changed arithmetic. The browser storage key remains version 4. Existing completed reports stay independently readable; new reports retain their rating identity and validate source-plus-adjustment arithmetic.

## Validation

- All **78 tests pass**, including all 3,910 transformations, source preservation, bounded adjustments, 2026 identity, duplicate-person exclusions, forecasts versus played results, forged save rejection, 1,000 drafts and 100 complete tournaments.
- Desktop/mobile browser QA passes at 320, 390 and 1440 pixels. A focused manual Legends pick confirms Morphy's source date, source/game/effective calculation, partial Quick Draft confirmation and readable source dialogs.
- Syntax checks, hosted build and Pages build pass. Static-only browser checks pass at both `/` and `/11-0-0/`, including the shared rating asset, save/report persistence and catalogue-failure recovery.
- Read-only simulation and module-snapshot checks exercise the updated audit tooling. Reports distinguish raw source ratings, game bases, era contributions and effective ratings. These execution checks are not a calibrated historical-strength study or a large comparative balance evaluation; earlier measured balance reports retain their original rules/catalogue scope.

The earlier [rating research proposal](era-ratings-2026-10-21.md) remains a dated record. Move-based historical-strength estimation still requires a separate verified game-score benchmark and is not part of this release.

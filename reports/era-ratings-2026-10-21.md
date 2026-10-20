# Historical rating modes · 21 October 2026

Subsequent decision: era balance has been implemented in the main game, without a new mode. See the [release details](era-balanced-release-2026-10-21.md). The proposal and measured source study below retain their original research scope.

Recommendation: develop **Era-balanced** as a clearly fictional game mode, and investigate **Analysed strength** separately. Keep the current sourced-rating mode available. Classic/Expert should continue to control rating visibility independently. This report and its executable study introduce no gameplay adjustments or new mode controls.

## Why a fixed bonus per decade is insufficient

The [51-period study](era-ratings-2026-10-21.json) preserves the source distributions, catalogue release and input hashes. The sampled top-100 median is 2530 in July 1972, 2535 in January 1980, 2565 in 1990, 2627.5 in 2000, 2684 in 2020 and 2664.5 in 2026. That movement is not consistently upward. It mixes changing coverage, player-pool depth, rating-system effects and possible changes in playing strength. These data alone cannot separate those causes.

Our pre-FIDE numbers are already retrospective Chessmetrics estimates. [Sonas describes](http://www.chessmetrics.com/cm/CM2/Formulas.asp) a four-year weighted performance model with padding and inactivity effects, and month-to-month calibration through overlapping players ranked 3–20. Applying another blanket “inflation correction” to them risks changing an existing historical calibration without evidence.

The [Regan–Haworth study](https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf) estimates skill from move choices and reports little inflation in its sampled rating bands across 1976–1979, 1991–1994 and 2006–2009. Its particular engines, samples and period coverage do not establish an exact conversion for all twentieth-century players. [Guid and Bratko](https://en.chessbase.com/news/2006/world_champions2006.pdf) also account for positional difficulty and playing style, showing why raw mistake counts are an incomplete comparison.

## Era-balanced: a practical game experiment

Use an edition’s standing within its own source list to map its rating to the same rank in a fixed reference distribution. The prototype uses January 2026, averages reference values across source-rating ties, interpolates between observed ratings, preserves gaps beyond the observed endpoints and caps changes at ±150. Equal source ratings stay equal. The cap, reference and mapping are **candidate game rules**, not measured corrections; they need balance experiments before adoption.

| Edition / source-list leader | Source rating | Naive median alignment | Candidate rank mapping |
| --- | ---: | ---: | ---: |
| Alekhine, January 1932 estimate | 2849 | 2971.5 | 2840 |
| Fischer, July 1972 | 2785 | 2919.5 | 2840 |
| Karpov, January 1980 | 2725 | 2854.5 | 2840 |
| Kasparov, January 1990 | 2800 | 2899.5 | 2840 |
| Kasparov, January 2000 | 2851 | 2888 | 2840 |

These are illustrations of the selected transformation, not new published ratings. Reuben Fine’s January 1940 edition, for example, maps from 2760 to 2810. Mapping each world number one to the same reference value is an intentional fairness choice; it does not establish equal absolute skill. A capped/blended version and several reference periods should be compared, since one reference year is itself a design choice. Source-list incompleteness and duplicate historical observations also limit the interpretation.

Implementation should keep `sourceRating`, `eraAdjustment` and the resulting game base distinct in previews, drafts and reports. Preserve source country top fives and the inclusive source-2600 qualification rule. For the first experiment, retain the existing source-based opponent/person allocation and initial/AI board-order policy, and use fixed squads and fields to isolate the adjustment’s effects. Apply the same mapping to both sides, including reserves. Feed the game base through forecasts, planners, draft estimates, fatigue/style/trait calculations and validation consistently. A later change to field selection needs its own explicit policy version and audit.

Before enabling it, run paired-seed experiments over strong, mixed-era and early squads, then evaluate held-out seeds: match points, title rates, poor runs, draft frequency, reserve usage and probability calibration. The study has **not** run these tournament experiments and makes no claim that the ±150 candidate is balanced.

## Analysed strength: an evidence-based research path

This mode should estimate the quality of moves **as played**, rather than assign an age bonus. It cannot answer how an old champion would perform after modern training. The current catalogue contains rating observations, not the PGNs and engine measurements needed for this estimate.

A defensible prototype needs verified game scores and player identities; a pinned engine, network, options and search budget; a consistent phase/time-control policy; treatment of forced moves, repetitions, already decided positions and positional difficulty; and calibration against modern players with known ratings. Hold out players and events during evaluation, report uncertainty and sample counts, and test sensitivity to the engine/search configuration. Avoid converting an arbitrary centipawn-loss number directly into Elo. Missing or weak evidence should remain visibly unsupported, rather than silently receive a guessed correction.

The first deliverable should be a reproducible offline benchmark spanning several twentieth-century periods, followed by a separately versioned estimate dataset. Published FIDE and Chessmetrics numbers remain immutable. Only after the benchmark supports usable estimates should they become a selectable game mode.

## State and records

A future mode choice belongs at new-game creation and must persist in saves, the rules fingerprint and completed reports. Validate every derived adjustment. Compare personal records within the same rating mode/rules, since scores under different strength models are not interchangeable. Preserve incompatible active saves through the existing backup flow and keep archived reports independent of the current catalogue.

Reproduce the descriptive study:

```bash
node scripts/audit-era-ratings.mjs --output /tmp/era-ratings.json
node --test --test-isolation=none tests/era-ratings.test.mjs
```

The script uses an in-memory catalogue and writes only its requested report. Tests cover ties, interpolation, tail gaps, monotonicity, caps, input purity and identity mapping on the reference scale. All 51 source periods were checked for ordered distributions and monotone candidate mappings. These checks validate the study implementation, not historical accuracy or tournament balance.

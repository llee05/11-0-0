# Strong-team balance · 21 October 2026

The implemented rules make effective rating advantages more dependable while retaining occasional upsets, contextual traits and reserve decisions. In 1,000 fresh seeds for the fixed 2803-Elo benchmark, runs scoring at most 10 match points fell from **16 to 6**; mean match points rose from **14.912 to 15.416**. Smaller profile modifiers alone did not establish an improvement. The additional rating-curve change did.

This follows the [earlier fixes](simulation-fixes-2026-10-20.md). The source catalogue, published ratings, career traits, 31 all-time opponents, eleven rounds and scoring are unchanged. These experiments measure the game, not agreement with real-world chess results.

## 1. Reduce the extra rating swings

| Rule | Original | Implemented |
| --- | --- | --- |
| Form per level | 12 Elo; maximum ±24 | 6 Elo; maximum ±12 |
| Daily swing limits, consistency 1–5 | ±32, ±24, ±16, ±8, ±4 | ±16, ±12, ±8, ±4, ±2 |
| Fatigue per load point above 24 | 1 Elo; maximum 76 | 0.5 Elo; maximum 38 |
| Grinder fatigue | Half the ordinary penalty | Half the ordinary penalty |

Load still increases by `14 − stamina`, recovers by 30 when resting and stays within 0–100. Form progression, conditional career traits (up to 80), styles and source-based board ordering are unchanged. Automatic drafting now reads the shared `SWINGS` table rather than retaining a second copy of the former values. The guide reads the same form, fatigue and swing constants as the engine.

The 2803 benchmark's profile-only mean change was **−0.084 match points**, with paired approximate 95% interval **−0.274 to +0.106**. Its low-score count was 23/1,000 versus the original 16/1,000. This does not establish that simply reducing modifiers fixes poor tournament results; both teams receive the gentler rules, and board-outcome randomness remains.

## 2. Compare forecasts with outcomes

`scripts/audit-balance.mjs` convolves the four board probabilities into exact team win/draw/loss chances. It compares those predictions with recorded results, reports source/effective rating gaps and each modifier's contribution, and retains the rounds of example poor runs.

For the primary benchmark, observed match frequencies tracked the final forecasts:

| Result | Forecast | Observed |
| --- | ---: | ---: |
| Win | 59.46% | 59.77% |
| Draw | 20.76% | 20.60% |
| Loss | 19.78% | 19.63% |

These are 11,000 user matches under the implemented rules. Each deviation was within 0.71 approximate standard errors. Across 704,000 boards per variant, all outcome deviations were within 2.1 approximate standard errors and probability normalisation error was at most `1.11e-16`. The sample does not suggest a systematic sampler disadvantage for the user.

The original 16 poor runs averaged 9.81 actual match points against a sum of 15.46 from their encountered forecasts. The final six each scored 10, against a mean forecast sum of 16.39. Source strength generally remained an advantage on those paths. One final example, seed `723411743`, finished 5–0–6 despite scoring 25.5/44 board points: four-board match thresholds can yield a poor match record without a poor overall board score.

These sums describe the actual, adaptive Swiss paths. Losses affect later opponents, colours, readiness and form; forecast sums cannot be treated as unconditional tournament expectations or multiplied into an exact probability of the final record. Selecting poor runs also selects negative forecast residuals. The diagnostics support examining individual paths and calibration, rather than attributing every bad record to modifiers or a sampling bug.

## 3. Strengthen rating advantages

The implemented expected-score curve uses `E = 1 / (1 + 10 ** (-gap / 320))`, replacing scale 400. The gap includes both players' effective modifiers and the existing 28-point White advantage. Draw calculations retain the same base curve and trait/style shifts, bounded so `win + draw / 2 = E` and all probabilities remain valid.

With an 80-Elo advantage on each board, two Whites, two Blacks and no draw modifiers, match-win chance rises from about **62% to 68%** and loss chance falls from about **16% to 12%**. This is an intentional game balance setting. Traits still matter because the curve acts on the complete effective gap.

Compared with the gentler profiles at scale 400, scale 320 added **0.588 match points** for the primary benchmark, with paired approximate 95% interval **+0.396 to +0.780**. Both variants share profiles and seeds; reserve choices and the later Swiss paths can legitimately diverge as results change.

## 4. Evaluate complete tournament distributions

The final evaluation uses **5,250 complete tournaments**: 1,000 paired seeds for the 2803 benchmark and 250 paired seeds for each of three other fixed squads, across three variants. All teams use automatic reserve planning. Evaluation seed indices start at 1,000, separate from the pilot indices 0–99. Preliminary pilot measurements are excluded from the tables below.

| Primary benchmark | Original | Gentler profiles, scale 400 | Implemented, scale 320 |
| --- | ---: | ---: | ---: |
| Mean wins | 6.281 | 6.246 | 6.575 |
| Mean draws | 2.350 | 2.336 | 2.266 |
| Mean losses | 2.369 | 2.418 | 2.159 |
| Mean match points / 22 | 14.912 | 14.828 | 15.416 |
| 5th / median / 95th percentile match points | 11 / 15 / 19 | 11 / 15 / 19 | 12 / 15 / 19 |
| At most 10 match points | 16/1,000 | 23/1,000 | 6/1,000 |
| At most two wins | 0/1,000 | 2/1,000 | 0/1,000 |
| Exactly 2–6–3 | 0/1,000 | 0/1,000 | 0/1,000 |
| Titles | 222/1,000 | 202/1,000 | 254/1,000 |
| Eleven wins | 0/1,000 | 2/1,000 | 1/1,000 |

The low-score rate's Wilson 95% intervals are **0.99–2.58%** originally and **0.28–1.30%** after both changes. These are estimates from one roster, not guarantees about every 2800 squad. The exact 2–6–3 example did not occur under either original or final rules; zero observations in 1,000 trials has an approximate 95% upper bound of 0.38%, not zero probability. The low-score threshold is a broader measure with the same 10 match points as that example.

The other fixed squads remain ordered by source strength:

| Registered first-four Elo | Seeds per variant | Original mean MP | Gentler profiles, scale 400 | Implemented mean MP | Low-score runs, original → implemented | Implemented titles | Implemented eleven wins |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2701.75 | 250 | 10.716 | 10.816 | 10.796 | 117 → 109 | 0 | 0 |
| 2749.75 | 250 | 12.912 | 12.644 | 12.884 | 35 → 29 | 7 | 0 |
| 2851.25 | 250 | 16.792 | 16.800 | 17.376 | 0 → 0 | 134 | 9 |

For the 2851 benchmark, the curve change added **0.576 match points** over gentler profiles alone, with paired approximate 95% interval **+0.214 to +0.938**. The corresponding changes for the 2702 and 2750 benchmarks were −0.020 and +0.240, with intervals spanning zero. There is no clear general score improvement at those two levels. The strongest unrestricted benchmark won all eleven rounds in 9/250 runs; the 2803 benchmark did so in 1/1,000. Perfect runs remain possible and depend strongly on squad strength.

Each variant's user-match calibration within each additional cohort was within 1.9 approximate standard errors for all three outcomes. Cohorts reuse seed indices and can repeat identical AI fixtures, so pooled board observations across cohorts are correlated; their aggregate standard errors should not be interpreted as independent evidence. The JSON retains those pooled diagnostics, while conclusions about user forecasts use the individual cohorts. Approximate intervals for mean differences use paired seed results; rate intervals use Wilson's method. They quantify sampling uncertainty for these rosters, not uncertainty from choosing a different roster.

## Reproduction and compatibility

Audited implementation: `5899a97327db2575cb66adcbe1177d8007d8a7f6`; baseline: `68a4ff679b453a4dc79ed79bed84edb177aed9d0`. Node: `v26.7.0`. Catalogue release: `a0fdb700d517ce26894c43a6a85f6f8b4325621db06369b805f08387605b8db2`. The primary benchmark comprises Topalov 2010, Mamedyarov 2018, Firouzja 2022, Ding 2022 and Vachier-Lagrave 2018; registered first-four average 2803. The JSON files list every source edition and the SHA256 of each variant's engine, profile and trait module.

```bash
node scripts/audit-balance.mjs --runs 1000 --workers 10 --cohorts 2800 --offset 1000 --baseline-ref 68a4ff6 --output /tmp/11-0-0-balance-primary.json
node scripts/audit-balance.mjs --runs 250 --workers 10 --cohorts 2700,2750,2850 --offset 1000 --baseline-ref 68a4ff6 --output /tmp/11-0-0-balance-field.json
```

Raw measurements: [primary benchmark](simulation-balance-2026-10-21-primary.json), [other rating bands](simulation-balance-2026-10-21-field.json). These contain summaries, complete W–D–L count distributions, confidence intervals, calibration and example poor-run round traces; add `--include-samples` to retain every individual seed result. The four explicit rosters are controlled benchmarks, not representative samples of all squads at each rating. Starting form and unprofiled assignments vary by seed, with the same assignments across variants. Historical estimates remain labelled best-observed source editions, not complete career peaks or proof of cross-era strength.

The `profiles` counterfactual is the current source with scale forced to 400 in a temporary copy. Its rules label therefore matches the current label; its explicit scale and source hashes distinguish the experiment. It is never installed as an app configuration. The `steeper` variant's module hashes exactly match the maintained implementation. The script uses temporary modules and an in-memory SQL catalogue; it changes no application source, persistent catalogue or browser saves.

Active saves keep version 4 and the existing browser key. Profile rules advance to `squad-profiles-4` and simulation rules to `olympiad-5`; incompatible active saves follow the existing backup flow before a fresh draft. Saved best-run reports remain independent and retain their copied numerical breakdowns and original form scale.

Validation passed: syntax checks; engine, catalogue, identity, trait, profile and saved-history suites; static export integration; hosted and Pages builds; desktop/mobile Chromium QA including guide values, old-save backups, Quick Sim, manual play, rotations and archived reports. The Pages integration check initially hit the sandbox's child-process restriction and passed when rerun with local process access. The existing audit's 24,050 probability cases had no invalid values and at most `1.11e-16` expected-score error; a 50-tournament smoke run also exercised its five drafting/rotation policies. No deployment was performed.

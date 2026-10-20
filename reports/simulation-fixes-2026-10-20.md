# Simulation fixes · 20 October 2026

This follows the [original investigation](simulation-audit-2026-10-20.md). The accepted balance target is competitive drafts, occasional tournament titles and rare eleven-win runs. All changes are local. Source ratings, the 396 qualifying snapshots, full top-five offers, five distinct drafted people, the 31 all-time opponents, separate Russian/Soviet pools and the eleven-round tournament remain the game's boundaries.

## Implemented changes

| Original finding | Change |
| --- | --- |
| Substitutions changed opponents, conditions and standings | Immutable `seedingRating` uses the registered roster's best four source ratings. Pairings and tiebreaks use that value; current lineup averages remain available for display. Fixture colours, abstract contexts and board-result streams are independent of proposed substitutions and other fixtures. |
| Individual colours could remain identical for eleven rounds | Both legal alternating colour patterns are evaluated against individual histories and projected match-aware reserve choices. Imbalance and long runs carry increasing costs. Both teams still receive two whites and two blacks. Historical save validation reconstructs forms and fatigue before checking each colour decision. |
| Ordinary drafts were much weaker than the all-time field | Offers favour stronger, deeper available rosters. Strength averages the eligible leader and eligible top-three mean; every additional 50 Elo doubles the offer weight. Every qualified snapshot with an eligible pick keeps positive probability. |
| Reserve planning ignored matchup abilities | The planner maximises expected four-board match points using the same trait/style resolver as forecasts. It considers all five reserves over up to three rounds, workload, recovery, form and draw probabilities. AI plans against a neutral projection of the opponent's lineup; user recommendations use the displayed AI lineup. |
| Traits offered limited alternatives to rating | Specialists and counters now provide larger conditional effects, up to 80 effective Elo. Universal supplies a smaller constant 8. Existing penalties, counters and draw tradeoffs remain. Automatic drafting estimates the complete profile over eleven rounds rather than choosing randomly or evaluating only a fresh board. |

The complete-profile drafting estimate includes scheduled four-in-five appearances, the real fatigue/recovery equations, averaged trait/style effects, starting form decaying by 0.65 per round and the exact rounded-uniform consistency distribution. It retains existing picks, outstanding offer assignments and chosen profiles. This estimate is a heuristic; actual reserve schedules, opponents and form depend on the subsequent tournament.

Unknown future rounds use a neutral 2720 reference mix for planning. Playing form is held constant in the lookahead and resting form moves toward neutral. The planner does not inspect future contexts, results or any player's daily performance. Its current-fixture estimate uses zero daily swing; a human who inspects the visible forecast has additional information. Bounded caches reuse equivalent planning work and return independent lineup arrays.

The defender's rating-gap modifier now changes gradually, with half-Elo rounding, to avoid the former large threshold jump. Famous career assignments, citations and fixed style/stamina/consistency presets remain separate from these fictional balance values. Numerical changes apply equally to drafted players and all opponents.

## Reproduce validation

Application code audited: `965791e`. Rules fingerprint: `career-traits-3/squad-profiles-3/olympiad-4/competitive-draft-1`. Catalogue release remains `a0fdb700d517ce26894c43a6a85f6f8b4325621db06369b805f08387605b8db2`.

```bash
npm run check
npm test
npm run build
node scripts/audit-simulation.mjs --runs 100 --probe-seeds 10 --output /tmp/11-0-0-simulation-fixed-audit.json
```

The follow-up uses 100 paired seeds per policy (500 tournaments), 880 substitution comparisons across 20 complete baseline paths, and 24,050 probability-grid cases. The [raw measurements](simulation-fixed-audit.json) include 70,400 telemetry boards, colour histories and complete trait/profile reference tables. The original investigation used 200 seeds per policy and 40 per substitution policy; the sample sizes differ. Both omit nation rerolls. The profile policy now uses the new eleven-round drafting estimate, so its old/new figures compare different heuristics as well as different game rules.

## Follow-up measurements

| Policy | Original mean place | New mean place | New match points / 22 | New titles / 100 |
| --- | ---: | ---: | ---: | ---: |
| Random picks, automatic rotation | 28.69 | 22.41 | 9.15 | 0 |
| Highest-rated picks, automatic rotation | 21.35 | 12.64 | 12.01 | 2 |
| Highest-rated picks, no rotation | 25.28 | 18.50 | 10.26 | 1 |
| Profile-aware picks, automatic rotation | 21.83 | 13.19 | 11.89 | 3 |
| Unrestricted elite benchmark | 2.24 | 2.93 | 16.45 | 47 |

The new highest-rated policy starts with an average 2749.08 source Elo across its opening four, compared with 2687.22 originally. The opponent field is still the same 31 rosters averaging 2720.45 across their registered first four. Ordinary drafts are now competitive without reducing opposition ratings. Random eligible picks still perform worse than deliberate drafting; Quick Draft and Quick Sim now use the profile-aware rule.

Titles remain uncertain at these sample sizes: the highest-rated policy's 2% rate has an approximate 95% interval of **0.55–7.00%**, and the profile policy's 3% rate has an interval of **1.03–8.45%**. Neither used rerolls or human matchup management. No eleven-win run occurred in these 500 tournaments; this establishes that none occurred in the sample, not an exact probability or impossibility.

All **880 substitutions preserved opponents, standings order and abstract conditions**. Unchanged AI-versus-AI boards also retained their outcomes. Unit tests additionally compare the entire fixture, including colours, across all substitutions through full tournaments.

Among **13,919 player-tournament records with at least eight games**, none had a white/black imbalance of six or more; the original sample had 1,586 of 27,268 (5.82%). The new worst imbalance was five, and the longest same-colour run across all appearances was five, compared with eleven originally. Some imbalance remains possible under conflicting player needs, reserve moves and the two permitted alternating patterns.

Automatic rotation added **1.75 match points** over never rotating in the new paired highest-rated drafts; the approximate 95% interval is **+1.23 to +2.27**. In all **80 final-round alternatives**, none beat the recommendation under its allowed-information estimate; none improved the actual displayed expected match points by more than 0.01 in this sample either. Earlier-round recommendations can sacrifice immediate chances for recovery; the audit found 52 such immediate-score improvements among 880 alternatives. They are not evidence of a failure to optimise its three-round objective.

The profile policy chose a strictly lower-rated candidate on **34 of 500 picks (6.8%)**. An earlier calibration with the old trait coefficients and the new season-value policy chose lower ratings on 4 of 200 picks (2%); those calibration offers used leader-only weights, so the comparison does not isolate the trait changes. The fresh-board policy in the original report chose lower ratings more often (15.1%), partly because it valued starting form across a single fresh game. These are different heuristics.

The new profile policy's paired mean score difference versus highest-rated picks was **−0.12 match points**, with an approximate 95% interval of **−0.44 to +0.20**. There is still no statistically clear general advantage for this automated drafting heuristic. The concrete improvement is stronger contextual alternatives and a planner that uses them: regression tests demonstrate a lower-rated specialist overcoming a 50-Elo gap in favourable conditions, a counter halving a specialist bonus, and a lower-rated opening specialist being selected in its appropriate matchup. Large rating gaps remain meaningful. This result should guide further strategy evaluation rather than a claim that profile-aware automation is universally superior.

The raw measurements also contain complete-profile reference values at 2650 and 2750, including fixed style/stamina/consistency presets, scheduled fatigue and consistency swings. At 2750, these estimates range from approximately 0.525 to 0.546 expected board points against the reference mix; the defender's higher 2650 value reflects its underdog condition. Traits with no fixed famous-player preset in the catalogue use a clearly labelled neutral numerical preset in that table. These are model estimates, not tournament win rates or real-player measurements.

All **24,050 probability cases** remained valid and preserved Elo expected score to floating-point precision. Across 70,400 telemetry boards, predicted draws were **43.01%** and observed draws **43.14%**; all win/draw/loss deviations were within 1.7 approximate standard errors. The current automatic policies took roughly **0.64–0.69 seconds median** per complete tournament on the local Node runtime, with 95th percentiles around **0.75–0.80 seconds**. This includes the additional planning work and is not a mobile-browser timing guarantee. Source metadata's catalogue leader/gap averages remain unweighted catalogue summaries; the policy rows describe actual weighted drafts.

## Compatibility and checks

Simulation, draft, trait and profile markers are included in the version-4 rules fingerprint. Incompatible saves go through the existing browser backup flow before a fresh draft starts. Earlier version-1 through version-3 keys remain intact. The full browser checks cover malformed and incompatible saves, current-game reloads, Quick Sim, manual play, recommendations, roster/source dialogs and 320/390/1440-pixel layouts.

`npm run check`, the complete Node test suite, desktop/mobile Chromium QA and the hosted build passed. The build preserved maintained top-level browser source. The catalogue/schema did not change; no migration or import was needed. Nothing was uploaded or published.

Colour assignment minimises conflicting costs within the game's alternating four-board patterns; reserve changes can make perfect individual colour balance impossible. Future-round planning and automated drafting remain estimates, not globally optimal solutions to an eleven-round Swiss tournament. A lower-rated player now has stronger conditional opportunities, while a large source-rating gap still matters. Balance measurements describe these samples, not a guarantee for every seed or player strategy.

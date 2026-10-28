# Simulation and balance report · 29 October 2026

This audit refreshes the game's balance and simulation measurements at head commit `fd4e0d8` under the current rules: **50 teams**, **`olympiad-8`**, **`era-balanced-1`**, **`career-traits-5`**, **`squad-profiles-4`**, and **`competitive-draft-1`**. It supersedes the earlier [21 October 2026 balance report](simulation-balance-2026-10-21.md) (which evaluated 32 teams under `olympiad-5`) and the [20 October 2020 investigation](simulation-audit-2026-10-20.md).

No rules, code or ratings were modified in this audit. The measurements are taken from **2,750 complete tournaments** across two complementary benchmarks:
1. **Fixed rating cohorts (1,750 tournaments):** 1,000 fresh seeds for the primary 2800 benchmark (seeds 2000–2999) and 250 fresh seeds each for 2700, 2750 and 2850 benchmarks, testing distributions, calibration and poor runs.
2. **Draft and rotation policies (1,000 tournaments):** 200 paired seeds across five drafting and rotation strategies to measure Quick Sim strength, reserve management and heuristic drafting.

---

## 1. Headline findings

1. **Title odds in a 50-team field are significantly more competitive:**
   - In the expanded 50-team tournament, winning 1st place with a **2800-rated squad** occurred in **7.60%** of runs (76/1,000, 95% CI: 6.11%–9.41%), compared to 25.4% in the previous 32-team field. The field includes 49 all-time national lineups averaging 2703.59 Elo, with 26 opponents averaging ≥ 2700.
   - A maximum-strength **2850 legends squad** (capped at 2840) won titles in **32.0%** of runs (80/250, 95% CI: 26.53%–38.02%), down from 53.6% in the 32-team field.
   - Squads at 2700 and 2750 won **0 titles** across 500 combined runs (95% upper bound: 1.51%).
2. **Perfect runs (11–0–0) are an extreme rarity:**
   - Across all 2,750 simulated tournaments, exactly **one** team achieved 11–0–0 (in the 2850 cohort, seed 2212; 1/250, 0.40%, 95% CI: 0.07%–2.23%).
   - The primary 2800 benchmark had **0/1,000** perfect runs (95% CI: 0–0.38%).
   - All automated draft policies had **0/1,000** perfect runs.
3. **Poor runs remain strictly contained:**
   - For the 2800 benchmark, runs scoring at most 10 match points occurred in **1.00%** of tournaments (10/1,000, 95% CI: 0.54%–1.83%). All 10 scored exactly 10 MP; zero scored fewer.
   - The exact 2–6–3 record did not occur in 1,000 runs (0/1,000).
   - The 2850 cohort had 0/250 poor runs.
4. **Reserve rotation delivers a +1.115 MP benefit:**
   - Paired tests over 200 identical seeds show automated reserve rotation adds **+1.115 match points** over playing an unrotated lineup (95% CI: +0.807 to +1.423).
5. **Quick Sim with random drafting is competitive:**
   - Uniform random draft choices under the 2650 cutoff and era-balanced ratings score **11.725 / 22 MP** and average **20.94 / 50** in rank (upper-half finish), compared to 5.94 MP and 28.69 / 32 in the pre-fix 32-team game.
6. **Structural fixes remain 100% verified:**
   - Across 3,520 substitution probes, there were **0 opponent changes**, **0 context changes**, **0 standings changes before play**, and **0 unrelated match modifications**.

---

## 2. Fixed rating cohorts

The four benchmark rosters are drawn from the catalogue's best observed era-balanced editions:
- **2800 primary benchmark (2801.5 first-four source Elo, 2824.25 game Elo):** Jan H Timman 1982 (2805), Alexei Shirov 1994 (2803), Isidor Gunsberg 1890 (2803), Shakhriyar Mamedyarov 2018 (2795), Liren Ding 2022 (2795).
- **2850 legends benchmark (2840.0 first-four source and game Elo):** José Capablanca 1920 (2840), Emanuel Lasker 1900 (2840), Géza Maróczy 1906 (2840), Akiba Rubinstein 1914 (2840), Wilhelm Steinitz 1874 (2840).
- **2750 benchmark (2751.75 first-four source Elo, 2779.25 game Elo):** Richard Rapport 2022 (2753), Alexey Dreev 1996 (2752), Lajos Steiner 1938 (2751), Nodirbek Abdusattorov 2026 (2751), Etienne Bacrot 2006 (2747).
- **2700 benchmark (2700.0 first-four source Elo, 2695.50 game Elo):** Baadur Jobava 2010 (2700), M. Amin Tabatabaei 2026 (2700), Sergei Tiviakov 2006 (2700), Jeffery Xiong 2020 (2700), Andrey Esipenko 2026 (2698).

### Tournament distribution summary

| Cohort | Target | Registered first-four Elo | Tournaments | Mean MP / 22 (95% CI) | Percentiles (5th / med / 95th) | Mean Rank / 50 (Median) | Titles (1st) | Eleven wins (11–0–0) | ≤ 10 MP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **2700** | 2700 | 2700.00 | 250 | 11.368 [11.173, 11.563] | 9 / 11 / 14 | 22.90 (22nd) | 0/250 (0.0%) | 0/250 (0.0%) | 75/250 (30.0%) |
| **2750** | 2750 | 2751.75 | 250 | 12.952 [12.747, 13.157] | 10 / 13 / 15 | 13.61 (13th) | 0/250 (0.0%) | 0/250 (0.0%) | 21/250 (8.4%) |
| **2800** | 2800 | 2801.50 | 1,000 | 14.645 [14.526, 14.764] | 12 / 14 / 18 | 7.09 (7th) | 76/1,000 (7.6%) | 0/1,000 (0.0%) | 10/1,000 (1.0%) |
| **2850** | 2850 | 2840.00 | 250 | 16.692 [16.454, 16.930] | 14 / 17 / 20 | 3.00 (2nd) | 80/250 (32.0%) | 1/250 (0.4%) | 0/250 (0.0%) |

### Primary 2800 benchmark comparison: 32 teams vs 50 teams

| Metric | 32 teams (`olympiad-5`, Oct 2026) | 50 teams (`olympiad-8`, current) |
| --- | ---: | ---: |
| Mean wins | 6.575 | 6.183 |
| Mean draws | 2.266 | 2.279 |
| Mean losses | 2.159 | 2.538 |
| Mean match points / 22 | 15.416 | 14.645 |
| 5th / median / 95th percentile MP | 12 / 15 / 19 | 12 / 14 / 18 |
| Mean finishing rank | ~3.8 / 32 | 7.09 / 50 |
| Titles (1st place) | 254/1,000 (25.4%) | 76/1,000 (7.60%) |
| Eleven wins (11–0–0) | 1/1,000 (0.1%) | 0/1,000 (0.0%) |
| At most 10 match points | 6/1,000 (0.6%) | 10/1,000 (1.00%) |
| Exactly 2–6–3 | 0/1,000 | 0/1,000 |

The 50-team field has 18 additional historical national rosters. The top tables feature stronger competition in later Swiss rounds, naturally reducing the title conversion of a 2800 squad from ~1 in 4 to ~1 in 13.

### Forecast vs observed match outcomes

`scripts/audit-balance.mjs` convolves the four individual board probabilities into exact match probabilities (win, draw, loss) and compares them against actual outcomes:

| Benchmark | Outcome | Predicted | Observed | Residual Std Error |
| --- | --- | ---: | ---: | ---: |
| **2800 Primary** (11,000 matches) | Win | 57.32% | 56.21% | −2.57 |
| | Draw | 20.25% | 20.72% | +1.24 |
| | Loss | 22.43% | 23.07% | +1.72 |
| **2700 Field** (2,750 matches) | Win | 40.05% | 41.09% | +1.22 |
| | Draw | 22.84% | 21.16% | −2.11 |
| | Loss | 37.11% | 37.75% | +0.77 |
| **2750 Field** (2,750 matches) | Win | 48.78% | 47.45% | −1.52 |
| | Draw | 22.33% | 22.84% | +0.64 |
| | Loss | 28.89% | 29.71% | +1.03 |
| **2850 Field** (2,750 matches) | Win | 66.47% | 66.18% | −0.35 |
| | Draw | 18.85% | 19.38% | +0.73 |
| | Loss | 14.68% | 14.44% | −0.38 |

Across 1,925,000 total board simulations in the balance runs, the maximum probability normalisation error was `1.11e-16`, with zero invalid probabilities.

---

## 3. Draft and rotation policies

`scripts/audit-simulation.mjs` evaluated 200 paired seeds across five policies (1,000 tournaments total, 44,000 matches, 220,000 boards):

| Policy | Drafting rule | Reserve rotation | Mean game base Elo | Mean MP / 22 (95% CI) | Mean Rank / 50 | Podium (Top 3) | Titles (1st) | 11–0–0 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **`random-auto`** | Uniform random eligible | Auto planner | 2731.85 | 11.725 [11.418, 12.032] | 20.94 | 3.0% | 1/200 (0.5%) | 0/200 |
| **`rating-auto`** | Highest-rated eligible | Auto planner | 2791.41 | 14.085 [13.794, 14.376] | 9.42 | 22.5% | 8/200 (4.0%) | 0/200 |
| **`rating-manual`** | Highest-rated eligible | Never rotate | 2775.80 | 12.970 [12.694, 13.247] | 13.95 | 10.0% | 4/200 (2.0%) | 0/200 |
| **`profile-auto`** | Maximize `draftValue` | Auto planner | 2793.05 | 14.205 [13.932, 14.478] | 8.80 | 21.0% | 7/200 (3.5%) | 0/200 |
| **`elite-auto`** | Unrestricted 2840 legends | Auto planner | 2840.00 | 16.710 [16.415, 17.005] | 3.27 | 67.0% | 67/200 (33.5%) | 0/200 |

### Key policy observations

1. **Reserve rotation value:** Comparing `rating-auto` against `rating-manual` across identical seeds yields a paired mean gain of **+1.115 match points** (95% CI: +0.807 to +1.423). In an 11-round tournament, actively rotating the reserve prevents severe fatigue accumulation (round 11 mean penalty is 20.53 Elo on unrotated boards) and lifts median rank from 14th to 9th.
2. **Heuristic profile drafting:** `profile-auto` (which optimizes `draftValue` over 11 rounds factoring in style, traits, stamina and consistency) gained **+0.120 match points** over pure rating drafting (95% CI: −0.062 to +0.302). It chose a lower-rated player in 27 out of 1,000 draft choices. While the point gain is modest in this sample, it achieves a superior average finishing rank (8.80 vs 9.42).
3. **Quick Sim health:** The `random-auto` policy models a Quick Sim where the user accepts random eligible picks. Under current rules, it finishes in 21st place on average (positive score: 11.725 / 22 MP), proving that competitive draft cutoffs (≥2651 leader) and era balancing prevent automated drafts from collapsing.

---

## 4. Diagnostics and structural integrity

1. **Substitution invariance:** 3,520 substitutions across 80 seeds confirmed:
   - 0 opponent changes on reserve rotation.
   - 0 board context shifts.
   - 0 standings alterations prior to round execution.
   - 0 score perturbations on unrelated matches.
2. **Planner optimality:**
   - Out of 3,520 comparisons against visible match forecasts, the reserve planner selected a lineup with immediate expected match points within 0.01 of the best possible single-round lineup in 98.12% of cases (inferior in only 66 cases, all attributable to resting key players for future rounds).
   - In Round 11 (where future fatigue has no value), the planner differed by >0.01 in only 1 of 320 comparisons (gain +0.0154); under known matchup expectations, it was **0/320 inferior**.
3. **Colour alternation:**
   - Out of 41,519 player appearances with at least 8 games, only 51 (0.12%) experienced a colour imbalance of 6 or more (down from 5.82% before colour-tracking fixes).

---

## 5. Suggested retunes for the captain

These notes are suggestions for consideration by the captain; no rules were changed in this job:

1. **Achievability of the headline goal ("Chase eleven wins / 11–0–0"):**
   - In 2,750 simulated tournaments, only **1** resulted in 11–0–0 (a 0.036% overall rate, or ~0.4% even for a 2840 all-legend squad).
   - *Context:* Winning 11 straight rounds in a 50-team Swiss against the top 49 national teams in history is naturally formidable. However, if the captain wishes 11–0–0 to be an achievable pinnacle goal for skilled play (e.g. 1%–2% for an optimized 2800+ draft), possible tuning mechanisms include:
     - **Momentum / Form progression:** Awarding small form bonuses (+4 to +8 Elo) when a player or team is on a match-win streak.
     - **Decisive conversion in favorable matchups:** Slightly steepening win probability when holding an effective rating advantage >60 in sharp or theory contexts.
2. **Podium and Tier Recognition:**
   - With 50 teams, a strong 2800 team averages 14.6 MP (7th place) and wins gold in only 7.6% of runs. In the UI, highlighting "Medal" (top 3) or "Diplomas / Top 8" finishes would give players meaningful milestones short of 1st place.
3. **Draft Valuation Differentiation:**
   - `profile-auto` currently diverges from `rating-auto` on only 2.7% of draft choices. If desired, increasing the weight of elite stamina (5) or high-impact specialist traits in `draftValue` would make trait-focused drafting feel more distinct from pure rating picks.

---

## 6. Reproduction commands and raw data

- Audited commit: `fd4e0d85c7872fb9f1687912a73d8913ce6d2adf`
- Node version: `v26.7.0`
- Catalogue release: `d82510d802418964de094fd5db145e8a1afe4777000c887abb6718515c286f6a`
- Rules: `career-traits-5/squad-profiles-4/olympiad-8/competitive-draft-1/era-balanced-1`

```bash
# Primary 2800 benchmark (1,000 tournaments)
node scripts/audit-balance.mjs --runs 1000 --workers 10 --variants steeper --cohorts 2800 --offset 2000 --output reports/simulation-balance-2026-10-29-primary.json

# Field cohorts 2700, 2750, 2850 (750 tournaments)
node scripts/audit-balance.mjs --runs 250 --workers 10 --variants steeper --cohorts 2700,2750,2850 --offset 2000 --output reports/simulation-balance-2026-10-29-field.json

# Simulation policy and probe audit (1,000 tournaments, 3,520 probes)
node scripts/audit-simulation.mjs --runs 200 --output reports/simulation-audit-2026-10-29.json
```

Raw data files:
- [Primary 2800 benchmark](simulation-balance-2026-10-29-primary.json)
- [Field rating cohorts](simulation-balance-2026-10-29-field.json)
- [Simulation audit and telemetry](simulation-audit-2026-10-29.json)

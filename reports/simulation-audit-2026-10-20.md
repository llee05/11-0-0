# Simulation investigation · 20 October 2026

The simulation is internally consistent in the checks run, but normal drafts are substantially weaker than the all-time field. Two confirmed problems deserve attention: substitutions can change pairings and standings without a game being played, and individual players can receive the same colour for all eleven rounds. Reserve management helps; the current trait system and automated planner offer less tactical depth than their presentation suggests.

This investigation changes no gameplay, ratings, catalogue data, saves or deployment. The [audit script](../scripts/audit-simulation.mjs) and [measurements](simulation-audit.json) make the findings reproducible.

## Scope and method

- Audited application commit: `1bfda55` (`add: run a full Olympiad with Quick Sim`).
- Rules: `career-traits-2/squad-profiles-3`; catalogue release: `a0fdb700d517ce26894c43a6a85f6f8b4325621db06369b805f08387605b8db2`.
- Local runtime: Node.js `v26.7.0`; an in-memory SQLite database uses the checked-in catalogue. No persistent database or browser save is read or changed.
- **1,000 complete tournaments:** 200 paired seeds for each of five policies, keeping all 32 teams and eleven rounds. No policy uses the two available nation rerolls.
- **3,520 substitution comparisons:** two draft policies × 40 seeds × eleven rounds × four possible substitutions. Each alternative starts from the identical unmodified state; the baseline user does not rotate. These comparisons are related observations, not independent trials.
- **16,354 probability cases:** rating differences from −1200 to +1200, draw modifiers from −0.16 to +0.16 and both colours.
- **140,800 recorded boards:** all matches in the 200 highest-rated-pick tournaments, used for probability, context, fatigue and colour checks.

Reproduce from the repository root:

```bash
node scripts/audit-simulation.mjs --runs 200 --output /tmp/11-0-0-simulation-audit.json
```

The run count accepts integers from 10 to 2,000 and applies to each policy; the substitution probes always use their fixed 80 seeds. Results reproduce under the audited source and catalogue, except execution timings. Mean-score confidence intervals use a normal approximation across seeds; title-rate intervals use Wilson's method. These are internal game experiments, not a calibration against real chess results.

## How the current simulation works

1. The server selects the strongest 31 complete national A/B rosters from each person's best observed source edition. Source federation determines allocation; Russia and the Soviet Union are separate. A person cannot occur on two opposing teams, but the user's squad can contain a person also on an opponent.
2. Each round the AI plans its reserve over up to three rounds. Manual play retains the user's selection; Quick Sim and Auto-rotate & finish apply that same planner to the user. Active boards sort by source rating.
3. The first round pairs the top and bottom halves by current lineup rating. Later rounds use a simplified Swiss search, prioritising close match-point and board-point scores and preventing rematches. Standings order is match points, simplified Sonneborn–Berger, board points, current lineup rating, then ID.
4. Each board receives a seeded abstract context: theory, sharp, quiet or technical, each with probability 25%; technical contexts split equally into rook/minor endings. Time pressure occurs independently with probability 20%. There are no chess moves or positions.
5. Effective rating is source rating − fatigue penalty + form + daily performance + style + trait. Both sides use identical mechanics. White adds 28 Elo in the probability calculation.
6. For rating difference `d` including colour, expected score is `E = 1 / (1 + 10^(−d/400))`. Draw probability is `0.5 × exp(−abs(d)/600) + draw modifiers`, clamped to `[0, 2 × min(E, 1−E)]`. Win probability is `E − draw/2`; loss probability is `1 − E − draw/2`. Draw modifiers change variance while preserving expected board score.
7. Seeded board outcomes produce four-board match points: 2 for a match win, 1 for a draw, 0 for a loss. Playing adds `14 − stamina` fatigue load; resting removes 30. Load over 24 costs one effective Elo per point, halved for grinders. Form moves one step after a sufficiently surprising result; resting moves it toward neutral.

Source editions and historical estimates remain unadjusted. The 396 country-year snapshots and best observed editions are sampled coverage, not exhaustive career peaks or a common historical rating scale.

## Finding 1: substitutions can change the next opponent and standings

**Priority: high.** In 205 of 3,520 substitution comparisons, a reserve change changed the upcoming opponent and conditions. Of those changes, 63 occurred after the first round. The user's standings position changed in 215 comparisons, including 77 after round one, without any result being played.

The cause is shared mutable meaning for `team.rating`: [engine.js](../dist/engine.js), lines 148 and 214, recomputes it from the active four, while lines 89–106 use it in standings and pairing order. Previews recompute the pairing after every substitution. Contexts also come from a round-wide stream consumed in pairing order.

Concrete reproduction after configuring the catalogue:

```js
const s = completeDraft(initialState(), random(5));
const t = startTournament(s.squad, s.teamName, 5, s.traits, s.profiles);
const before = previewRound(t);
const after = previewRound(rotateReserve(t, 0));
```

Resting Helgi Ass Gretarsson and bringing in Peter Svidler changes the first opponent from Armenia to Hungary. The four contexts change from quiet/quiet/sharp/technical to quiet/theory/theory/quiet. Reversing the substitution restores the original preview; merely reopening an unchanged preview does not reroll anything.

This gives reserve selection an unintended tournament-management role: players can inspect different opponents as well as different lineups. Give seeding/tiebreak strength an immutable roster value, establish the round's pairing before substitutions, and retain that pairing and its conditions while the user chooses a lineup. Any stored-state change needs deliberate compatibility handling.

The broader probe found **zero** cases where an otherwise identical AI-versus-AI board, with the same players, colours, context and probabilities, changed outcome under a user substitution. The shared random streams are an architectural coupling; this investigation does not establish an unrelated-match outcome bug.

## Finding 2: individual colours are not balanced

**Priority: high.** Teams always get two white and two black boards, but individual histories are ignored. Among 27,268 player-tournament records with at least eight appearances, **1,586 (5.82%)** had an absolute white/black difference of at least six. The largest imbalance was **eleven white games and no black games**.

Reproduction: highest-rated-pick policy, tournament seed `469720421`, Soviet Union A, Mikhail Botvinnik (`URS-1946:chessmetrics:15154`). The measurements include all eleven appearances, each with White.

At [engine.js](../dist/engine.js), line 164, colour depends only on round parity, board index and whether the team is the first side of the pairing. Team order and board moves can defeat the apparent round-by-round alternation. Since White is worth 28 Elo, individual colour histories affect chances even though each match has a 2/2 team split.

Track colour history and choose a team colour pattern that reduces imbalances and long runs, preserving two whites and two blacks. Colour rules are also checked by save validation, so changing only the simulation expression would leave saves incompatible.

## Finding 3: ordinary drafts face a very strong field

**Priority: balance decision.** The initial opposing lineups average **2720.45 source Elo**, range **2657–2810**, and 21 of 31 average at least 2700. Across uniformly offered snapshots, the leading player averages **2677.29**, with a mean **63.78 Elo** gap to the second player. A 2600-qualified country can still offer several players far below 2600.

| Draft and rotation policy | Opening four mean source Elo | Mean match points / 22 | Mean finishing place / 32 | Titles / 200 | Eleven wins / 200 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Random eligible pick, automatic rotation | 2622.66 | 5.94 | 28.69 | 0 | 0 |
| Highest-rated eligible pick, automatic rotation | 2687.22 | 9.48 | 21.35 | 2 | 0 |
| Same highest-rated draft, never rotate | 2674.61 | 7.99 | 25.28 | 1 | 0 |
| Fresh-board profile heuristic, automatic rotation | 2684.83 | 9.31 | 21.83 | 1 | 0 |
| Unrestricted elite benchmark, automatic rotation | 2850.37 | 17.00 | 2.24 | 100 | 2 |

Opening Elo is the unrounded average of the four actually fielded in round one. Automatic rotation can change the initial reserve, explaining the difference between the two highest-rated-draft rows.

The highest-rated policy's observed title rate is 1%, with a 95% interval of approximately **0.27–3.57%**. Zero random-pick titles does not mean victory is impossible: its corresponding upper bound is approximately **1.88%**. With only 200 runs per policy, rare titles and perfect runs have substantial uncertainty. No reroll strategy, matchup-aware human management or optimal drafting policy was tested.

The elite benchmark selects Botvinnik 1946, Carlsen 2014, Kasparov 2002, Aronian 2014 and Caruana 2018 without needing to roll their offers. It includes Botvinnik's labelled Chessmetrics estimate of 2883. It is a strength benchmark, not a typical obtainable draft or a statement about real career peaks.

Empty-draft Quick Sim chooses uniformly among eligible candidates. The random policy models that selection rule, using its own documented seed allocation rather than calling Quick Sim's exact RNG sequence. This helps explain why an automated run can feel especially weak. The core difficulty comes from offer strength versus all-time rosters, not from a hidden AI rating boost.

If improving ordinary runs is the next goal, first define a target finishing-place/title distribution, then evaluate stronger offers or a stronger automated drafting policy against it. Keep source ratings and the agreed 32-team field unchanged unless a subsequent task changes those requirements.

## Finding 4: rotation works, but the planner overlooks matchup abilities

**Priority: medium.** Automatic reserve planning gained **1.49 match points** over never rotating in paired highest-rated drafts; the approximate 95% interval is **+1.01 to +1.97**. This is the whole policy's benefit, including its initial lineup selection, fatigue/form changes and later pairing paths; it does not isolate fatigue alone.

By round eleven, mean on-board fatigue penalties were **29.25 Elo for the user** and **21.86 for AI players** in these runs. All teams accumulate load, carry partial recovery and use the same equations. Different rosters, profiles and rotations explain different aggregate penalties; the AI does not have a separate fatigue exemption.

However, [engine.js](../dist/engine.js), lines 117–139, maximises the sum of source Elo minus fatigue plus form over a three-round horizon. It ignores playing styles, matchup trait bonuses, draw probabilities, board placement against particular opponents and match-win probability. It deliberately does not look ahead to outcomes or daily performance.

Of 3,333 comparable substitution alternatives with the same opponent, orientation and context vector, 210 improved the immediate expected match points by more than 0.01 over the recommended lineup. Some are reasonable short-term sacrifices for future recovery. In the final round, where there is no future recovery benefit, **6 of 320 alternatives** still beat the recommendation by more than 0.01 under the visible forecast.

Example: highest-rated draft, seed `4`, round eleven. The recommendation rests Jan Timman. Resting Viswanathan Anand instead increases the forecast expected match points from **0.6701 to 0.7177**. This compares the displayed chances, including fixed daily performance; it does not establish what an AI denied that information should predict.

Once pairing is stable, evaluate a planner that includes expected trait/style effects and match probabilities using the information it is allowed to know. Preserve its restriction on future results and daily swings.

## Finding 5: traits do not yet establish a strong drafting alternative to rating

**Priority: balance decision.** The profile heuristic integrates the true context distribution and both colours, using each candidate's trait, style and starting form against a neutral 2720 opponent. It does not optimise future stamina, fatigue, squad composition or actual opponents.

It selected a strictly lower-rated candidate on **151 of 1,000 picks (15.1%)**. Its paired score difference versus highest-rated picking was **−0.175 match points**, with a 95% interval of **−0.466 to +0.116**. This experiment finds no clear improvement; it does not prove that all trait-aware strategies are ineffective.

Isolated fresh-board trait scores also differ. At equal ratings and a controlled universal style, averaged over contexts, colours and a synthetic opponent-trait mix, `universal` scores **0.5105** expected board points and `sacrificer` **0.4901**. This is not a ranking of complete player profiles: it excludes stamina, the grinder fatigue reduction, famous-player presets, starting form and team-match objectives. A draw-changing trait can affect match-winning chances while preserving expected board score.

Fixed career traits also bring fixed style/stamina/consistency presets; unknown players roll these attributes separately. Thus comparing named traits alone misses part of the balance. For example, a famous grinder receives stamina 5 and consistency 5 as well as half fatigue penalties. Seventy-six of 155 opposing roster slots have fixed career profiles. These numerical presets are game choices, not measurements of real players.

Investigate complete trait/profile bundles across rating gaps, workload and match situations before increasing bonuses. The current mean first-to-second offer gap is larger than most individual trait effects, and automatic reserve selection does not currently exploit their matchups.

## Checks that passed and practical limits

- `npm run check` and the complete `npm test` suite passed, including 1,000 draft validations, 100 full tournaments, repeatability, scoring, no rematches, forecast consistency, symmetric fatigue and saved-history validation.
- All 16,354 probability-grid cases were finite and within `[0,1]`. Maximum normalisation and Elo expected-score errors were approximately `1.11 × 10⁻¹⁶`.
- Across the 140,800 telemetry boards, predicted draw frequency was **43.28%** and observed frequency **43.10%**. Win/draw/loss deviations were within 1.4 approximate standard errors of the model's predictions. This checks the sampler against its own formula; it does not validate real-world draw rates.
- Context frequencies were each approximately 25%, with time pressure at **20.05%**. Repeated unchanged forecasts and tournament seeds remain deterministic under the existing tests.
- The 1,000 policy runs completed without a pairing failure. Automatic eleven-round simulations had medians near **102–103 ms** and 95th percentiles near **118–123 ms** on this local Node runtime. This is not a mobile/browser benchmark or a bound on the backtracking matcher's worst case.
- `node --check scripts/audit-simulation.mjs` and `git diff --check` passed. No app or UI code changed; a hosted build and browser QA were not rerun for these documentation and audit-tool additions.

The recommended order is to stabilise pairings and colours, then improve matchup-aware planning, then choose and measure a draft-difficulty target. No fixes were applied as part of this investigation.

# Olympiad captaincy: evidence and game proposal

Research checked on 20 October 2026. This document proposes a future captaincy change; the current game still uses its fictional playing-captain bonus.

## What real captains do

Non-playing captains are an established Olympiad role. FIDE's account of India's 2024 winning team lists five players and Srinath Narayanan separately as captain. The 2026 main-competition regulations explicitly distinguish non-playing captains when setting sanctions. [FIDE's 2024 team report](https://www.fide.com/india-triumphs-at-45th-chess-olympiad-winning-both-open-and-womens-competitions/), [2026 regulations, article 4.11.3](https://handbook.fide.com/files/handbook/Olympiad2026MainCompetition.pdf).

FIDE's general captain rules assign fixed board order, round selection, technical meetings and player representation to the captain. Communication during play requires an arbiter; captains cannot discuss board positions or advise on offering or accepting draws. A captain's FIDE ID can belong to a different federation, and no particular FIDE licence is required by these general rules. [FIDE Handbook C.10, articles 3–4, effective July 2022](https://handbook.fide.com/chapter/CaptainsHeadsDelegation).

[Older Olympiad rules, article 6.3.9.4](https://www.fide.com/FIDE/handbook/chess_olympiad_regulations.pdf), allowed limited draw advice. Do not copy that permission into a modern captain mechanic without checking the applicable edition's rules. The game's abstract match conditions are not positions on which a captain can supply moves.

## Recommended game design

Use a separate non-playing staff role alongside the five drafted players. It should consume neither a board nor the reserve slot. Its influence should remain available when any player rests; the current half-influence-from-reserve rule would no longer apply.

The user already performs a captain's central management work: picking the squad, choosing four starters and managing recovery. The new reserve planner provides the equivalent selection process for opponents. An additional staff choice could emphasize one of three approaches:

| Approach | Possible fictional game effect | Tradeoff |
| --- | --- | --- |
| Preparation | A small bonus in theory-focused rounds, representing preparation before play. | No general bonus in other conditions. |
| Recovery | Improve recovery when a player sits out. | Does not remove fatigue merely by changing the lineup. |
| Morale | Reduce the penalty from poor form. | Does not increase positive form or provide board advice. |

These are design suggestions, not implemented rules or measured abilities of real captains. Tune them against each other before assigning numerical effects. Apply the same choices and effects to all 32 teams, with opponent staff assignments fixed from the tournament seed.

Remove the playing player's numerical captaincy attribute if adopting this model, instead of stacking two captain bonuses. Keep any future real-person staff catalogue separate from player editions: playing strength and career fame are not evidence of coaching or captaincy effectiveness. A real captain's appointment would need its own source.

Store staff assignments and any changes between rounds in game state. Update forecasts, history validation and the profile rules marker together, preserving incompatible saves before a fresh draft. Keep current form, fatigue and daily performance independent of opening the staff dialog or changing staff, so captain selection cannot reroll them.

The simulation currently sorts active boards by source rating after substitutions. Real fixed board-order rules are a separate format decision and would need an explicit rule change if the game is to reproduce them strictly.

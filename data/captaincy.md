# Olympiad captaincy: evidence and accepted design

Research checked on 20 October 2026. The accepted game design is that the user acts as captain by managing the team. Captain attributes and bonuses have been removed.

## What real captains do

Non-playing captains are an established Olympiad role. FIDE's account of India's 2024 winning team lists five players and Srinath Narayanan separately as captain. The 2026 main-competition regulations explicitly distinguish non-playing captains when setting sanctions. [FIDE's 2024 team report](https://www.fide.com/india-triumphs-at-45th-chess-olympiad-winning-both-open-and-womens-competitions/), [2026 regulations, article 4.11.3](https://handbook.fide.com/files/handbook/Olympiad2026MainCompetition.pdf).

FIDE's general captain rules assign fixed board order, round selection, technical meetings and player representation to the captain. Communication during play requires an arbiter; captains cannot discuss board positions or advise on offering or accepting draws. A captain's FIDE ID can belong to a different federation, and no particular FIDE licence is required by these general rules. [FIDE Handbook C.10, articles 3–4, effective July 2022](https://handbook.fide.com/chapter/CaptainsHeadsDelegation).

[Older Olympiad rules, article 6.3.9.4](https://www.fide.com/FIDE/handbook/chess_olympiad_regulations.pdf), allowed limited draw advice. Do not copy that permission into a modern captain mechanic without checking the applicable edition's rules. The game's abstract match conditions are not positions on which a captain can supply moves.

## Accepted game design

The user acts as captain: draft five players, choose four starters, rotate the reserve and manage fatigue and form. Opponents use the same reserve planner offered to the user through lineup recommendations and Auto-rotate & finish.

There is no captaincy attribute, chosen playing captain, separate staff slot or leadership bonus on either side. Team profiles is a read-only view of style, stamina, consistency, form and current fatigue. Match probabilities depend on source rating, color, individual traits, styles, form, daily performance and fatigue.

This replaces both the former playing-captain bonus and the proposed separate staff model. The user explicitly chose to remove captaincy rather than add staff. Do not reintroduce either system without a new request.

Profile rules advance to `squad-profiles-3`. Earlier saves contain captain attributes and historical captain bonuses; preserve them in the existing backup key before a fresh draft. Current save validation rejects obsolete captain assignments and bonus fields.

The simulation sorts active boards by source rating after substitutions. Real fixed board-order rules remain a separate format decision.

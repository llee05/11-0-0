# Two-year catalogue expansion · 21 October 2026

The playable catalogue now contains 774 country-year snapshots, 3,870 editions and 71 federation codes, up from 396 snapshots, 1,980 editions and 69 codes. The source-rating cutoff remains inclusive at 2600, and every qualifying offer retains its complete top five. No era adjustment was introduced.

| Coverage | Previous release | Expanded release |
| --- | --- | --- |
| Official FIDE years | 1974–2026, every four years | 1972–2026, every two years |
| Original source archives | 8 | 14, with URL, member and SHA256 pinned |
| Audited pre-FIDE country snapshots | 12 | 22 |
| Retained Chessmetrics observations | 1,200 | 2,300 |
| Playable / requested years | 26 / 26 | 50 / 51 |

The available official lists use July 1972, May 1974 and January thereafter. The historical CSV supplies 1972–2000; the FIDE downloads supply 2002–2026. A full comparison preserved the name, source ID, rank and raw rating of every original official country top five. The added years are extracted directly from the sources; no intervening ratings are interpolated.

The new early offers are URS 1928; USA 1932, 1936 and 1940; and URS 1948, 1952, 1956, 1960, 1964 and 1968. Together with the previous offers, they cover 1927 and every even year from 1928–1970 except 1944. The [affiliation audit](../data/historical-affiliations.json) retains 462 player/year decisions, evidence URLs and explicit continuity qualifications. Participation records support affiliation evidence only; source ratings determine selection, and non-participants such as Kevitz and Kupchik are included when their ratings qualify.

**January 1944 remains unpublished.** Its original top-100 estimate table is retained. A complete national five has not been established under the higher-rank audit; this does not establish that no country could qualify. The archive displays the gap. Wartime transfers and disputed affiliations must not be resolved from later representation or residence alone, and no fifth player is invented.

The importer now preserves the first row of headerless January 2004 data, reads long other-title fields without moving the rating column, and handles birth years of `0`. Regression fixtures are original source lines. All 14 archives were checksum-verified, and regenerating the checked-in observations succeeds from those pinned files.

The newly sampled 2750+ editions require four additional sourced career profiles: Li Chao, Wang Hao, Pavel Eljanov and Reuben Fine. The set now has 98 profiles under `career-traits-4`. Sax’s previous historical profile follows the canonical FIDE identity linked by the added source observations. Rounded zero trait modifiers now serialize consistently. Catalogue/rule changes use the existing save backup flow; independent Best-run reports remain readable.

Validation: 69 tests passed, including SQLite persistence, atomic replacement, full top fives, known new lists, canonical identities, historical audit rejection, source-format regressions, simulations and JSON save round trips. Chromium desktop/mobile flows passed at 320, 390 and 1440 pixels, including new years, the 1944 gap, drafting, match previews, board-order controls and report persistence. Syntax checks and static/hosted builds were also run.

Catalogue release: `66380bac9d53d549a8b96496c86770669858a1c4174a7f9672a72dc479ac1bde`.

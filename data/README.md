# Rating catalogue sources

`fide-snapshots.json` contains the top five listed eligible players per period federation for 1974, 1978, …, 2026. `rating-sources.json` pins the source ZIP URLs, members and SHA256 checksums. `federations.json` and `federations.source.json` preserve the official labels and documented historical aliases. Neutral FID records are retained as observations but excluded from country rolls.

Reproduce the official-list extraction with `npm run data:import` (Python 3 required), then update the local persistent SQLite catalogue with `npm run db:seed`. Normal startup imports checked-in observations without fetching third-party sites. `RATINGS_CACHE` selects the source archive cache; `DATABASE_PATH` selects the local SQL file.

Published ratings, source dates, URLs and checksums remain separate from game ratings. The normalization is `round(raw + 2664.5 - period world-top-100 median)`, where 2664.5 is January 2026's reference median. This is a game balancing convention, not an official FIDE conversion.

The January lists are used except May 1974, the earliest available 1974 archive. Explicitly inactive players are excluded. All sexes and titles are eligible, but the early archive omits much of the women's list and does not consistently supply activity flags. These limitations are preserved in each source's notes. No Olympiad roster or participation filter is used.

`historical-observations.json` preserves 1,200 Chessmetrics estimates for January 1927, 1930, …, 1970, with original URLs and hashes. The observation source has no affiliations. `historical-affiliations.json` separately audits all 31 players through the fifth Soviet member in January 1927. `npm run data:historical` generates the playable `historical-snapshots.json` only if all stronger possible members have sourced affiliations or exclusions. Some cutoff affiliations infer continuity from surrounding careers; those qualifications remain in the audit. USSR 1927 describes historical country affiliation, not FIDE membership. Other early countries and 1930–1970 remain unavailable pending the same audit. Never label these estimates as pre-1971 official FIDE ratings.

Original sources: [FIDE downloads](https://ratings.fide.com/download_lists.phtml), [historical FIDE archive](https://www.olimpbase.org/Elo/summary.html), [FIDE federation rankings](https://ratings.fide.com/top_federations.phtml), [Chessmetrics](http://www.chessmetrics.com/cm/).

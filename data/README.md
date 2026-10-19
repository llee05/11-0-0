# Rating catalogue sources

`fide-snapshots.json` contains the top five listed eligible players per period federation for 1974, 1978, …, 2026. `rating-sources.json` pins the source ZIP URLs, members and SHA256 checksums. `federations.json` and `federations.source.json` preserve the official labels and documented historical aliases. Neutral FID records are retained as observations but excluded from country rolls.

Reproduce the official-list extraction with `npm run data:import` (Python 3 required), then update the local persistent SQLite catalogue with `npm run db:seed`. Normal startup imports checked-in observations without fetching third-party sites. `RATINGS_CACHE` selects the source archive cache; `DATABASE_PATH` selects the local SQL file.

Gameplay uses published ratings unchanged, without any era adjustment. The playable SQL catalogue excludes country-year snapshots unless at least one player has a source rating strictly above 2500. All five players in qualifying snapshots are retained. The checked-in observations keep the excluded snapshots and top-100 statistics for provenance.

The January lists are used except May 1974, the earliest available 1974 archive. Explicitly inactive players are excluded. All sexes and titles are eligible, but the early archive omits much of the women's list and does not consistently supply activity flags. These limitations are preserved in each source's notes. No Olympiad roster or participation filter is used.

`historical-observations.json` preserves 1,200 Chessmetrics estimates for January 1927, 1930, …, 1970, with original URLs and hashes. The source has no affiliations. `historical-affiliations.json` separately contains 222 player/year affiliation decisions and identity crosswalks. Twelve targets now cover every scheduled early year: URS 1927; USA 1930/1934/1942; HUN 1938; URS 1946/1950/1954/1958/1962/1966/1970. `npm run data:historical` generates `historical-snapshots.json` only if every stronger possible country member has a sourced affiliation or exclusion.

Some cutoff assignments infer continuity from surrounding national careers; those qualifications remain in the audit. Country labels describe historical sporting affiliation, not invented FIDE registrations. The 1930 source contains duplicate Takács identities; both are excluded from USA membership and neither replaces an American top-five player. Additional early countries remain unavailable pending the same audit. Never label these estimates as pre-1971 official FIDE ratings.

Original sources: [FIDE downloads](https://ratings.fide.com/download_lists.phtml), [historical FIDE archive](https://www.olimpbase.org/Elo/summary.html), [FIDE federation rankings](https://ratings.fide.com/top_federations.phtml), [Chessmetrics](http://www.chessmetrics.com/cm/).

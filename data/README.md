# Rating catalogue sources

`fide-snapshots.json` contains the top five listed eligible players per period federation for 1972, 1974, …, 2026. `rating-sources.json` pins the source ZIP URLs, members and SHA256 checksums. `federations.json` and `federations.source.json` preserve the official labels and documented historical aliases. Neutral FID records are retained as observations but excluded from country rolls.

Reproduce the official-list extraction with `npm run data:import` (Python 3 required), then update the local persistent SQLite catalogue with `npm run db:seed`. Normal startup imports checked-in observations without fetching third-party sites. `RATINGS_CACHE` selects the source archive cache; `DATABASE_PATH` selects the local SQL file.

Gameplay uses published ratings unchanged, without any era adjustment. The playable SQL catalogue excludes country-year snapshots unless at least one player has a source rating at least 2600. All five players in qualifying snapshots are retained. The checked-in observations keep the excluded snapshots and top-100 statistics for provenance.

The January lists are used except July 1972 and May 1974, the available archive dates. Explicitly inactive players are excluded. All sexes and titles are eligible, but the early archive omits much of the women's list and does not consistently supply activity flags. These limitations are preserved in each source's notes. No Olympiad roster or participation filter is used.

`historical-observations.json` preserves 2,300 Chessmetrics estimates for January 1927 and each even year from 1928–1970, with original URLs and hashes. The source has no affiliations. `historical-affiliations.json` contains 462 sourced player/year decisions and identity crosswalks. Twenty-two targets are playable: URS 1927/1928; USA 1930/1932/1934/1936/1940/1942; HUN 1938; and URS every even year from 1946–1970. `npm run data:historical` generates `historical-snapshots.json` only if every stronger possible country member has a sourced affiliation or exclusion. January 1944 remains unpublished; its source table is retained and `unpublishedPeriods` records the audit gap. Missing evidence never produces a guessed fifth player.

The official importer reads the original layouts through `scripts/ratings/fide_formats.py`. Headerless January 2004 files retain their first player; long other-title fields cannot displace the rating; an unknown birth year of `0` cannot be mistaken for the rating. Parser regressions run with Python 3 as part of `npm test`.
Some cutoff assignments infer continuity from surrounding national careers; those qualifications remain in the audit. Country labels describe historical sporting affiliation, not invented FIDE registrations. The 1930 source contains duplicate Takács identities; both are excluded from USA membership and neither replaces an American top-five player. Additional early countries remain unavailable pending the same audit. Never label these estimates as pre-1971 official FIDE ratings.

Original sources: [FIDE downloads](https://ratings.fide.com/download_lists.phtml), [historical FIDE archive](https://www.olimpbase.org/Elo/summary.html), [FIDE federation rankings](https://ratings.fide.com/top_federations.phtml), [Chessmetrics](http://www.chessmetrics.com/cm/).

## All-time national lineups and identities

`server/all-time.mjs` derives national A/B opponents from the playable SQL editions. Each person contributes only their highest source rating, with the latest year breaking ties; their federation at that edition determines their one opposing nation. Russia and the Soviet Union remain separate. A teams use the first five ranked people, B teams the next five. Rank both divisions together by their four starters' total and select 31 opponents for a 32-team tournament including the user. The fifth player is a reserve and does not enter the strength calculation.

The field uses the best editions in these observations; two-year sampling, country top-five limits and selective early coverage make it incomplete as an all-time record. No unsourced career peaks or inferred nationalities are added.

`identity-links.json` records explicit source-name/ID crosswalks with archival player-history links. Its name guards keep unrelated reuses of IDs separate. Confirmed namesakes such as French GM Andrei Sokolov (627089) and Latvian IM Andrei Sokolov (11600306) remain distinct. Historical ID 4500024 under Lembit Oll is separated from modern Ottomar Ladva; Fernando Braga's old ID 800015 is linked to 811408 only under Braga's name, preserving Marco Codenotti's modern 800015. Raw source IDs remain in the observations. The crosswalk contents are part of the catalogue release fingerprint.

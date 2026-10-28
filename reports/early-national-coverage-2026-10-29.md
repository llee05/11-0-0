# Early national coverage, 1952–1970 (2026-10-29)

This extension adds **32 audited country-year top fives** for January 1952–1970: Yugoslavia, Argentina, Hungary, the United States and Czechoslovakia. Before it, only the Soviet Union, the United States (to 1942) and Hungary (1938) had audited pre-1972 fives. Argentina, Yugoslavia and Czechoslovakia gain their first playable snapshots.

The strict builder is unchanged. `npm run data:historical` still publishes a five only when every world top-100 player ranked at or above that country's fifth member has a sourced affiliation or a sourced exclusion. No speculative or partial fives were added.

## Catalogue effect

| | Before | After |
| --- | --- | --- |
| Audited historical targets | 22 | 54 |
| Playable historical country snapshots | 19 | 51 |
| Country-year snapshots (all eras) | 434 | 466 |
| Draft offers including Legends | 442 | 474 |
| Player editions | 2,210 | 2,370 |
| National federation codes | 49 | 52 |
| Affiliation decisions | 462 | 1,132 |
| Identity crosswalks | 7 | 13 |
| Catalogue release | `d82510d8…` | `60e586a8…` |

Playable years are unchanged (47 of 51). January 1927, 1928 and 1930 stay below the 2650 source cutoff, and January 1944 stays an explicit gap.

The all-time opponent rules are unchanged, but they now see the new editions. Argentina, Yugoslavia and Yugoslavia B enter the 49-team field; Spain B, Estonia and Vietnam drop out. Each person still contributes only their best era-balanced country edition, so Pal Benko's best edition (Hungary 1956) places him in Hungary B.

Existing Soviet fives are unchanged. Their `listedPlayerCount` rises because more Soviet players in each top 100 are now verified.

### Saves and backups

The catalogue release fingerprint changes. Miguel Najdorf's new 2750 editions also require a sourced career trait, so `TRAIT_RULESET` moves from `career-traits-5` to `career-traits-6` (116 profiles). Existing active or completed version-4 games are therefore incompatible. The existing flow copies them to `11-0-0:save:v4:backup` before a fresh draft. Independent Best-run reports stay readable, and portable report imports still merge through `keepBestRuns`. No save keys or validation code changed.

## New fives

| Country | Year | Source top five (raw Chessmetrics ratings) |
| --- | --- | --- |
| Argentina | 1952 | Miguel Najdorf (2750), Julio Bolbochán (2701), Erich Eliskases (2688), Herman Pilnik (2644), Carlos Guimard (2607) |
| Argentina | 1954 | Miguel Najdorf (2752), Julio Bolbochán (2674), Erich Eliskases (2649), Herman Pilnik (2634), Oscar Panno (2624) |
| Argentina | 1956 | Miguel Najdorf (2709), Julio Bolbochán (2681), Oscar Panno (2673), Herman Pilnik (2639), Erich Eliskases (2625) |
| Argentina | 1958 | Miguel Najdorf (2694), Oscar Panno (2677), Julio Bolbochán (2633), Raúl Sanguinetti (2633), Erich Eliskases (2599) |
| Argentina | 1960 | Miguel Najdorf (2679), Oscar Panno (2664), Raúl Sanguinetti (2605), Erich Eliskases (2587), Herman Pilnik (2577) |
| Argentina | 1964 | Miguel Najdorf (2696), Raúl Sanguinetti (2665), Herman Pilnik (2619), Oscar Panno (2613), Julio Bolbochán (2590) |
| Argentina | 1966 | Miguel Najdorf (2719), Raúl Sanguinetti (2642), Oscar Panno (2619), Julio Bolbochán (2618), Erich Eliskases (2571) |
| Czechoslovakia | 1968 | Vlastimil Hort (2692), Ludek Pachmann (2604), Miroslav Filip (2592), Lubomir Kavalek (2578), Ladislav Mišta (2574) |
| Hungary | 1956 | László Szabó (2695), Pal Benko (2648), Gedeon Barcza (2645), Miklos Bely (2610), István Bilek (2592) |
| Hungary | 1958 | László Szabó (2689), Gedeon Barcza (2652), István Bilek (2595), Lajos Portisch (2570), György Szilágyi (2563) |
| Hungary | 1960 | László Szabó (2685), Lajos Portisch (2670), Gedeon Barcza (2649), István Bilek (2599), Tibor Flórián (2546) |
| Hungary | 1964 | Lajos Portisch (2662), László Szabó (2621), István Bilek (2609), Gedeon Barcza (2601), Levente Lengyel (2594) |
| Hungary | 1966 | Lajos Portisch (2703), László Szabó (2629), Levente Lengyel (2605), István Bilek (2592), Gedeon Barcza (2583) |
| Hungary | 1968 | Lajos Portisch (2723), István Bilek (2618), László Szabó (2615), Gedeon Barcza (2598), Laszlo Barczay (2565) |
| Hungary | 1970 | Lajos Portisch (2732), Levente Lengyel (2591), Gedeon Barcza (2591), Gyözö Forintos (2581), Laszlo Barczay (2573) |
| United States | 1956 | Samuel Reshevsky (2752), Larry Evans (2640), Arthur Bisguier (2612), Donald Byrne (2589), Nicolas Rossolimo (2584) |
| United States | 1960 | Bobby Fischer (2701), Samuel Reshevsky (2677), William Lombardy (2627), Pal Benko (2625), Larry Evans (2615) |
| United States | 1962 | Bobby Fischer (2738), Samuel Reshevsky (2684), William Lombardy (2661), Robert Byrne (2653), Larry Evans (2633) |
| United States | 1964 | Bobby Fischer (2788), Samuel Reshevsky (2674), Pal Benko (2651), Larry Evans (2632), Robert Byrne (2608) |
| United States | 1966 | Bobby Fischer (2744), Samuel Reshevsky (2665), Pal Benko (2630), Robert Byrne (2627), Larry Evans (2594) |
| United States | 1968 | Bobby Fischer (2801), Samuel Reshevsky (2663), Larry Evans (2654), Pal Benko (2653), Robert Byrne (2578) |
| United States | 1970 | Bobby Fischer (2788), Samuel Reshevsky (2683), Pal Benko (2642), Larry Evans (2612), Robert Byrne (2602) |
| Yugoslavia | 1952 | Svetozar Gligoric (2704), Vasja Pirc (2663), Petar Trifunovic (2650), Braslav Rabar (2635), Aleksandar Matanovic (2625) |
| Yugoslavia | 1954 | Svetozar Gligoric (2706), Andrija Fuderer (2662), Petar Trifunovic (2647), Braslav Rabar (2632), Vasja Pirc (2625) |
| Yugoslavia | 1956 | Borislav Ivkov (2708), Svetozar Gligoric (2696), Aleksandar Matanovic (2694), Andrija Fuderer (2637), Petar Trifunovic (2622) |
| Yugoslavia | 1958 | Svetozar Gligoric (2729), Aleksandar Matanovic (2695), Borislav Ivkov (2669), Petar Trifunovic (2614), Nikola Karaklajic (2606) |
| Yugoslavia | 1960 | Svetozar Gligoric (2732), Borislav Ivkov (2665), Aleksandar Matanovic (2661), Andrija Fuderer (2654), Petar Trifunovic (2606) |
| Yugoslavia | 1962 | Svetozar Gligoric (2715), Aleksandar Matanovic (2661), Borislav Ivkov (2644), Bruno Parma (2624), Petar Trifunovic (2617) |
| Yugoslavia | 1964 | Svetozar Gligoric (2707), Borislav Ivkov (2672), Aleksandar Matanovic (2625), Milan Matulovic (2617), Bruno Parma (2616) |
| Yugoslavia | 1966 | Borislav Ivkov (2698), Svetozar Gligoric (2668), Bruno Parma (2631), Milan Matulovic (2624), Aleksandar Matanovic (2598) |
| Yugoslavia | 1968 | Milan Matulovic (2675), Svetozar Gligoric (2674), Borislav Ivkov (2661), Bruno Parma (2633), Aleksandar Matanovic (2633) |
| Yugoslavia | 1970 | Svetozar Gligoric (2690), Milan Matulovic (2674), Borislav Ivkov (2640), Bruno Parma (2627), Bojan Kurajica (2616) |

## Evidence and decision rules

The 670 new rows and 8 reviewed upgrades cite these records:

- OlimpBase team rosters from every official Olympiad from 1927 to 1972.
- OlimpBase team rosters from Soviet Team Championships (1948–1972), European Team Championships (1957–1970), World Student Team Championships (1954–1972) and Yugoslav Team Championships (1946–1972).
- OlimpBase crosstables of US Championships and of Soviet Championships and semifinals.
- OlimpBase copies of the June 1967, April 1968, 1969, July 1970 and January/July 1971 FIDE (Elo) lists, which give each player's federation.

Two kinds of event are not used as affiliation evidence. Soviet Championships before 1946 admitted foreign guests (Kmoch in 1934; Lilienthal before his citizenship). The 1937 Jurata "international" Polish Championship included foreign masters.

Each row cites the actual roster, crosstable or list page and names the record. Its note states which side of the January list date the record falls on and says that continuity is inferred, not an exact-month registration. Decisions follow these rules, in order:

1. **Earlier audits win.** Existing positive rows are kept. An existing exclusion-only row is upgraded to a positive code only after its old notes have been reviewed against the new evidence. All eight upgrades (Reshevsky and Najdorf 1952/1954; Fischer 1964–1970) already described the same country. Their wording "only Soviet-pool exclusion is asserted" was replaced, because it no longer applied.
2. **Bracketing records:** 617 rows. The same country appears before and after the list date, at most six years apart.
3. **Wider same-country gap:** 17 rows. The gap is up to 12 years, with no other affiliation recorded in between (for example, Herman Pilnik's 1958 Olympiad and 1967 FIDE list, both for Argentina).
4. **One-sided record:** 15 rows with a record within one year after the list date, and 8 within 2.5 years before. Used only when no other country appears nearby.
5. **Ambiguity goes to manual review.** Different countries appearing on the same side of the list date within 1.5 years means an emigration or a namesake. Those cases are decided by hand.
6. **Exclusion-only fallback:** 6 rows. Every record within five years names a different country. The row excludes only the needed target and says so.
7. **Manual decisions:** 7 rows, each with explicit sources:
   - **Pal Benko, 1958.** He played the 1957 student championship for Hungary, the World Chess Hall of Fame says he defected after it, and his first US Championship was 1958/59. The row excludes Yugoslavia, Argentina and Hungary and leaves the Hungary-to-USA transition unresolved.
   - **Lubomir Kavalek, 1970.** The spring 1969 and July 1970 FIDE lists still register him under CSR. January 1971 is the first list under USA, and his first US Championship and Olympiad records are from 1972. The row excludes Yugoslavia, Hungary and the United States without asserting Czechoslovakia.
   - **Erich Eliskases, 1952: Argentina.** The Argentine federation's centenary history names him among the European players who stayed after the 1939 Olympiad and records his 1951 South American Zonal win.
   - **Fine, Bogoljubow and Foltys, 1952: exclusions.** Federation biographies cover Fine's American and Bogoljubow's German careers. OlimpBase records Foltys for Czechoslovakia in 1948 and at the 1951 European zonal.
   - **Donald Byrne, 1956: United States.** The US Chess Hall of Fame records his 1953 U.S. Open win and the 1954/1955 team matches against the Soviet side; his 1958/59 US Championship follows.
   - **Andrey Batuev, 1956: exclusion.** OlimpBase records his Soviet Championship semifinal (1949) and Soviet Team Cup (1952–1954) results.

Name matching between Chessmetrics and OlimpBase was reviewed by hand. Wrong surname-only matches were rejected, for example eight Soviet "Alexander" players against Conel Alexander, and Emil versus Kurt Richter. Players with two OlimpBase IDs were merged, for example Suetin, Yudovich and Yukhtman.

### Identities and traits

Six sourced crosswalks link the new editions to later catalogue identities, so a person cannot be drafted twice or appear in two opposing teams:

- Portisch and Kurajica link to their FIDE profiles.
- Fischer, Evans, Robert Byrne and Kavalek link to their records in the May 1974 FIDE list, which includes birth dates. Donald Byrne stays separate from Robert Byrne.

Najdorf's 1952 and 1954 Argentine editions reach the 2750 coverage floor, so he receives the `attacker` career trait. The source is Chess.com's biography, which quotes the New York Times obituary on his "imaginative attacking games".

A pre-existing gap was observed and left unchanged: Mikhail Botvinnik's 1946–1964 Chessmetrics editions are not linked to his 1972 FIDE-era identity.

## Not verified, and why

These country-years have a qualifying top player but were not published:

| Candidate | Reason |
| --- | --- |
| January 1944 (all countries) | Still an explicit gap. There are no Olympiads from 1940 to 1949. The earlier audit deliberately leaves Keres's wartime Soviet-versus-Estonian affiliation unresolved, and a Soviet 1944 five would have to decide it. |
| 1940–1948 countries other than the USA and Soviet Union | Not attempted. The nearest national-team records straddle the war and several emigrations. |
| Argentina and Yugoslavia 1950 | 10–20 stronger players lack records near January 1950 across the 1939–1950 Olympiad gap. Among them: Fine, Bogoljubow, Foltys, Benko, Zemgalis, Sarapu and Kieninger. |
| Hungary, West Germany, Netherlands, Czechoslovakia and USA 1952 | 14–17 stronger players are unresolved each. Hungary and Czechoslovakia also have fewer than five evidenced members. |
| Hungary 1954 | Aleksandar Nedeljković (no record distinct from Srećko Nedeljković), Benko, Juan Carlos González and Stefan Szabo are unresolved. |
| United States 1958 | Benko (world rank 25) defected in October 1957, and his January 1958 affiliation is unresolved. Counting him as American would change the five. |
| Argentina 1962 | No affiliation evidence was found for Alfredo Espósito (rank 79), who would be within the five, or for Vladimir Titenko. |
| West Germany 1954–1968; East Germany 1966/1968; Argentina 1968/1970; Czechoslovakia 1956–1962 and 1970 | At most four verified members inside the world top 100. 1970 Czechoslovakia and Argentina also depend on Kavalek's unresolved status. |
| Denmark, Iceland, Sweden, Romania, Spain | Only one or two strong players in the top 100. |
| 1930s Austria, Czechoslovakia, Germany, Poland, England, Netherlands, France and Hungary | Not attempted. Each list's top ranks include players with no national-team record near the list date (for example Capablanca and Emanuel Lasker), and pre-war affiliations need the slower federation-source method of the earlier audits. |

These limits keep coverage selective: published fives are complete for their source top 100, but unpublished country-years are not evidence that a country lacked strong players.

// Career-inspired labels; the numerical effects are fictional game rules.
export const TRAIT_RULESET = 'career-traits-2';
export const TRAITS = [
  ['attacker', 'Initiative hunter', 'Sharp: +24. Quiet: −8. Draw chance −6 points.'],
  ['sacrificer', 'Sacrificial attacker', 'Sharp as the underdog: +32. Technical: −12. Draw chance −8 points.'],
  ['dynamic', 'Dynamic player', 'Sharp: +24. Technical: −8.'],
  ['tactician', 'Tactical creator', 'Sharp: +24. Technical: −8. Draw chance −6 points.'],
  ['positional', 'Positional technician', 'Quiet: +24. Sharp: −8.'],
  ['prophylaxis', 'Prophylactic defender', 'Halves the opponent’s positive trait bonus. Draw chance +4 points.'],
  ['counterattacker', 'Counterattacker', 'Against an attacking trait: +28.'],
  ['defender', 'Resourceful defender', 'At least 40 Elo behind: +26. At least 80 ahead: −8. Draw chance +4 points.'],
  ['endgame', 'Endgame technician', 'Technical: +26. Sharp: −8.'],
  ['simplifier', 'Simplifier', 'Technical: +22. Quiet or technical: draw chance +6 points.'],
  ['grinder', 'Relentless grinder', 'Halves fatigue loss. Technical: +12.'],
  ['rook', 'Rook-ending specialist', 'Technical rook ending: +36.'],
  ['exchange', 'Exchange-sacrifice specialist', 'Quiet: +28 and blocks a quarter of the opponent’s positive bonus. Sharp: −6.'],
  ['universal', 'Universal player', 'Every match condition: +10.'],
  ['coordinator', 'Piece coordinator', 'Quiet: +26. Theory: −6.'],
  ['practical', 'Practical competitor', 'At least 40 behind: draw chance +8 points. At least 40 ahead: −8 points.'],
  ['innovator', 'Opening innovator', 'Against a preparation or repertoire specialist: +28. Otherwise sharp: +8.'],
  ['preparation', 'Deep preparation', 'Theory: +26.'],
  ['specialist', 'Repertoire specialist', 'Theory: +32. Against an unorthodox player: −8.'],
  ['flexible', 'Opening chameleon', 'Against a theory-focused trait: +22.'],
  ['unorthodox', 'Unorthodox creator', 'Against a theory-focused trait: +24; otherwise sharp: +10. Technical: −12. Draw chance −4 points.'],
  ['calculator', 'Deep calculator', 'Sharp: +28. Time pressure: −12.'],
  ['intuitive', 'Intuitive player', 'Sharp or quiet: +18. Theory: −8.'],
  ['time-trouble', 'Time-trouble fighter', 'Sharp or theory: +20. Time pressure: −24.'],
  ['materialist', 'Material defender', 'Against an attacking trait: +22. Quiet: −8.'],
].map(([id, name, description]) => Object.freeze({id, name, description}));
const index = new Map(TRAITS.map(t => [t.id, t]));
export const traitById = id => index.get(id);
export const validTrait = id => id === null || index.has(id);
export const traitLabel = id => traitById(id)?.name || 'No trait';

const museum = name => `https://museum.fide.com/champions/${name}`;
// Match canonical person IDs, never display names (there are two Tigran Petrosians).
export const CAREER_PROFILES = [
  ['historical:tal mikhail n', 'Mikhail Tal', 'sacrificer', museum('mikhail-tal'), 'FIDE’s career profile describes his combinations, sacrifices and pursuit of the initiative.'],
  ['historical:petrosian tigran', 'Tigran Petrosian', 'prophylaxis', museum('tigran-petrosian'), 'FIDE’s career profile describes his preventive, defensive style.'],
  ['fide:4100026', 'Anatoly Karpov', 'positional', 'https://bigthink.com/videos/big-think-interview-with-anatoly-karpov/', 'Karpov discusses his lasting preference for positional play and endgames.'],
  ['fide:4101588', 'Vladimir Kramnik', 'positional', 'https://en.chessbase.com/post/kramnik-on-health-plans-and-computers', 'Kramnik describes his positional strengths in a general discussion of his playing style.'],
  ['fide:4100018', 'Garry Kasparov', 'innovator', museum('garry-kasparov'), 'FIDE’s career profile describes his opening innovations and extensive preparation.'],
  ['fide:1503014', 'Magnus Carlsen', 'grinder', museum('magnus-carlsen'), 'FIDE’s career profile highlights his persistence and ability to keep finding chances.'],
  ['fide:600024', 'Boris Spassky', 'universal', museum('boris-spassky'), 'FIDE’s profile quotes Kramnik on Spassky’s universal playing style.'],
  ['chessmetrics:15154', 'Mikhail Botvinnik', 'preparation', museum('michael-botvinnik'), 'FIDE’s career profile describes his systematic analytical preparation.'],
  ['chessmetrics:123392', 'Vassily Smyslov', 'coordinator', museum('vasily-smyslov'), 'FIDE’s career profile describes harmony and coordination of his pieces.'],
  ['fide:700070', 'Judit Polgar', 'attacker', 'https://magazine.032c.com/magazine/chess-grandmaster-judit-polgar', 'Polgar discusses her long-standing preference for aggressive play and the initiative.'],
  ['fide:2209390', 'Alexei Shirov', 'tactician', 'https://www.newinchess.com/fire-on-board-shirov-s-best-games-part-1', 'Shirov’s own selected games document his inventive attacking play across his career.'],
  ['fide:1300016', 'Viktor Korchnoi', 'materialist', 'https://www.fide.com/in-memory-of-viktor-korchnoi-on-the-95th-anniversary-of-his-birth/', 'GM Emil Sutovsky recalls his material-conscious play and resourcefulness when defending.'],
  ['fide:1400029', 'Bent Larsen', 'unorthodox', 'https://www.newinchess.com/media/wysiwyg/product_pdf/995.pdf', 'His selected games and their foreword describe his independent, unconventional approach.'],
  ['fide:4126025', 'Alexander Grischuk', 'time-trouble', 'https://www.fide.com/introducing-candidates-alexander-grischuk/', 'FIDE’s profile describes his recurrent time trouble and strength in faster play.'],
  ['fide:623539', 'Maxime Vachier-Lagrave', 'specialist', 'https://www.mvlchess.com/en/2018/02/13/maxime-vous-repond/', 'In his own Q&A he explains his deep Najdorf and Grünfeld repertoire.'],
  ['fide:14100010', 'Vasyl Ivanchuk', 'flexible', 'https://www.schachversand.de/ivanchuk-move-by-move.html', 'GM Mikhail Golubev’s foreword describes his exceptionally broad opening repertoire.'],
  ['fide:2805677', 'Boris Gelfand', 'positional', 'https://www.qualitychess.co.uk/ebooks/PositionalDecisionMakinginChess-excerpt.pdf', 'Gelfand’s own book explains his sustained approach to positional decision making.'],
  ['fide:4116992', 'Alexander Morozevich', 'unorthodox', 'https://www.qualitychess.co.uk/ebooks/PositionalDecisionMakinginChess-excerpt.pdf', 'Gelfand describes Morozevich’s individual, inventive approach across his play.'],
  ['fide:2020009', 'Fabiano Caruana', 'calculator', 'https://conversationswithtyler.com/episodes/vishy-anand/', 'Anand describes Caruana’s concrete calculation and search for exceptions as general strengths.'],
  ['fide:5000017', 'Viswanathan Anand', 'intuitive', 'https://conversationswithtyler.com/episodes/vishy-anand/', 'Anand discusses his own pattern recognition and intuitive assessment of positions.'],
  ['fide:13300474', 'Levon Aronian', 'dynamic', 'https://chessjournalism.org/wp-content/uploads/2024/06/ACM_38-Interview-D.-Krunic_Interview-with-Levon-Aronian.pdf', 'Aronian discusses experimentation and the creative positions he seeks.'],
  ['fide:24116068', 'Anish Giri', 'preparation', 'https://michelschessblog.com/2025/12/08/in-the-spotlight-anish-giri/', 'Giri discusses opening preparation in a general assessment of his strengths.'],
  ['fide:5202213', 'Wesley So', 'practical', 'https://en.chessbase.com/post/interview-with-the-man-of-the-moment-wesley-so', 'So describes a pragmatic approach to results and the role of solid play.'],
  ['historical:fischer robert james', 'Bobby Fischer', 'endgame', 'https://www.newinchess.com/media/wysiwyg/product_pdf/9286.pdf', 'GM analysis of multiple Fischer endgames, with his own annotations, illustrates his technical conversion.'],
  ['fide:2016192', 'Hikaru Nakamura', 'defender', 'https://www.edition-olms.com/buecher/fighting-chess-with-hikaru-nakamura/', 'Nakamura describes persistence and seeking defensive resources as strengths in his 2011 interview: Müller and Stolze, Fighting Chess with Hikaru Nakamura (Edition Olms, 2012), chapter 6, p. 138. The link is the publisher’s book record.'],
  ['fide:8603677', 'Ding Liren', 'positional', 'https://en.chessbase.com/post/cbm-210-special-ding-liren', 'GM Mihail Marin analyzes recurring aspects of Ding’s positional play in a collection spanning 2009–2021.'],
  ['fide:2900084', 'Veselin Topalov', 'attacker', 'https://www.newinchess.com/media/wysiwyg/product_pdf/9129.pdf', 'IM Emmanuel Neiman describes Topalov’s habitual optimism and attacking approach in The Magnus Method, introduction, p. 13.'],
  ['fide:46616543', 'Gukesh Dommaraju', 'calculator', 'https://en.chessbase.com/post/i-still-have-weaknesses-to-work-on-an-interview-with-vincent-keymer-i', 'GM Vincent Keymer describes Gukesh’s general reliance on concrete calculation when comparing their styles. This reflects his career so far, not a prediction of an unchanging style.'],
  ["fide:13401319", "Shakhriyar Mamedyarov", "attacker", "https://www.chess.com/article/view/the-talented-mamedyarov", "GM Gregory Serper’s analysis of multiple games describes recurring creative attacks grounded in classical ideas."],
  ["fide:12573981", "Alireza Firouzja", "intuitive", "https://chessbase.in/news/Sokolov-on-Iran-chess", "His former coach Ivan Sokolov describes quick understanding and immediate recognition of ideas, comparing his talent with the young Anand."],
  ["fide:4168119", "Ian Nepomniachtchi", "dynamic", "https://www.fide.com/ian-nepomniachtchi-the-strategy-was-not-to-lose/", "Nepomniachtchi contrasts one tournament’s restrained strategy with his usual preference for active, creative play."],
  ["fide:4102142", "Peter Svidler", "specialist", "https://www.crestbook.com/node/1390", "Svidler describes keeping the Grünfeld in his repertoire for roughly twenty years after choosing it as a teenager."],
  ["fide:738590", "Richard Rapport", "unorthodox", "https://www.fide.com/world-cup-round-3-tiebreaks-when-the-clock-decides-the-better-players-rise/", "FIDE’s general portrait describes originality, unusual openings and an artistic approach to the game."],
  ["fide:14109603", "Sergey Karjakin", "defender", "https://old.fide.com/component/content/article/1-fide-news/11723-vachier-lagrave-sole-winner-on-the-first-day-of-the-fide-grand-prix-in-riga.html", "FIDE’s player introduction describes his established reputation for resourceful defense in difficult positions."],
  ["fide:13400924", "Teimour Radjabov", "specialist", "https://en.chessbase.com/post/teimour-radjabov-launches-online-chess-academy", "Radjabov describes the King’s Indian as a longstanding specialty developed through many years of work with Nataf."],
  ["fide:13400630", "Vugar Gashimov", "specialist", "https://astrakhan2010.fide.com/11th-round-press-conferences-2.html", "Ponomariov’s first-hand assessment identifies Gashimov’s habitual Modern Benoni repertoire against 1.d4."],
  ["fide:1170546", "Jan-Krzysztof Duda", "flexible", "https://www.chess.com/article/view/dawid-czerw-duda-interview", "Duda explains his preference for variety, trying new openings and deliberately maintaining a broad repertoire."],
  ["fide:14204118", "Nodirbek Abdusattorov", "positional", "https://en.chessbase.com/post/sokolov-interview-2022", "Coach Ivan Sokolov describes active positional play, sound decisions and strong technique. This characterizes his career so far."],
  ["fide:12940690", "Vincent Keymer", "coordinator", "https://indianexpress.com/article/sports/chess/vincent-keymer-peter-leko-trainer-gukesh-pragg-success-motivates-10199523/", "His longtime coach Peter Leko describes strategic ambition guided by harmonious positions. This characterizes his career so far."],
  ["fide:35009192", "Arjun Erigaisi", "attacker", "https://indianexpress.com/article/sports/chess/grandmaster-arjun-erigaisi-interview-results-respect-9386316/", "Erigaisi explains adopting ambitious, uncompromising play around the pandemic. He describes a more technical childhood style; this trait highlights his later approach."],
  ["fide:25059530", "Praggnanandhaa", "universal", "https://www.fide.com/fide-candidates-2026-eight-contenders-one-dream/", "FIDE’s general profile credits calculation, tactical precision and positional understanding together. This describes his career so far."],
  ["fide:5029465", "Vidit Gujrathi", "preparation", "https://en.chessbase.com/post/blindfold-challenge-with-vidit-gujrathi", "IM Sagar Shah describes Vidit’s established thoroughness in opening preparation, alongside a direct interview and assessment."],
  ["fide:25092340", "Nihal Sarin", "endgame", "https://en.chessbase.com/post/sokolov-interview-2022", "GM Ivan Sokolov highlights technique when converting favorable endings, without claiming equally strong defense of inferior endings. This describes his career so far."],
  ["fide:12539929", "Parham Maghsoodloo", "defender", "https://chessbase.in/news/Sokolov-on-Iran-chess", "Former coach Ivan Sokolov describes repeated resourcefulness and continuing chances from inferior positions in games and analysis."],
  ["fide:24126055", "Daniil Dubov", "innovator", "https://www.fide.com/world-championship-match-venue-commentators-schedule/", "FIDE’s general commentator introduction highlights his creative approach; this trait represents that recurring search for new ideas."],
  ["fide:13601520", "Baadur Jobava", "unorthodox", "https://en.chessbase.com/post/living-life-the-jobi-way-1-2", "Jobava discusses a multi-year shift toward surprising systems, independent ideas and avoiding predictable theory."],
  ["fide:8603405", "Wei Yi", "attacker", "https://www.fide.com/fide-world-cup-a-quick-draw-sets-up-tiebreaks-for-title-as-esipenko-wins-third-place/", "FIDE’s career portrait describes naturally gifted attacking play, calculation and creativity across his development."],
  ["fide:14205483", "Javokhir Sindarov", "dynamic", "https://candidates2026.fide.com/tpost/8ns92kg9t1-candidates-clash-sindarov-breaks-away-ca", "Sindarov describes his general enjoyment of dynamic positions from either side. This characterizes his career so far, rather than an unchanging lifetime style."],
  ["fide:24651516", "Matthias Bluebaum", "positional", "https://candidates2026.fide.com/about", "FIDE’s general player profile highlights positional understanding and resilience across sustained competition."],
  ["fide:24175439", "Andrey Esipenko", "coordinator", "https://www.fide.com/fide-world-cup-a-quick-draw-sets-up-tiebreaks-for-title-as-esipenko-wins-third-place/", "FIDE describes his recurring harmonious, natural piece placement, often compared with Capablanca. This characterizes his career so far."],
  ["historical:sax gyula", "Gyula Sax", "tactician", "https://old.fide.com/component/content/article/1-fide-news/7716-in-memoriam-gm-gyula-sax.html", "FIDE’s career account describes a move toward positional play while retaining a taste for tactical complexity."],
  ["fide:900010", "Ljubomir Ljubojevic", "dynamic", "https://www.fide.com/ljubomir-ljubojevic-turns-75/", "GM Emil Sutovsky’s first-hand career portrait describes his expressive, explosive approach across decades of elite play."],
  ["historical:adorjan andras", "Andras Adorjan", "specialist", "https://www.fide.com/andras-adorjan-1950-2023/", "FIDE’s career account identifies his longstanding Grünfeld expertise, reflected in his own work and preparation with other leading players."],
  ["fide:14200244", "Rustam Kasimdzhanov", "endgame", "https://shop.chessbase.com/en/products/endgames_for_experts", "His selected-game course explains strategic planning and technical decisions across several practical endings from his own play."],
  ['fide:8603820', 'Yu Yangyi', 'attacker', 'https://www.chess.com/news/view/artemiev-wins-clear-first-at-gibraltar-chess-festival', 'Artemiev describes Yu’s usual aggressive style when explaining his advance preparation, rather than inferring it from their single game.'],
  ['fide:3503240', 'Leinier Dominguez', 'preparation', 'https://www.chess.com/news/view/2022-fide-grand-prix-berlin-group-tiebreaks', 'Wesley So describes Dominguez as a particularly dangerous opponent because of his established opening preparation.'],
  ['fide:703303', 'Peter Leko', 'positional', 'https://en.chessbase.com/post/it-s-a-matter-of-seconds', 'Leko describes his classical positional foundation while emphasizing that modern elite play also demands universal abilities.'],
  ['fide:2000024', 'Gata Kamsky', 'defender', 'https://uscf1-nyc1.aodhosting.com/CL-AND-CR-ALL/CL-ALL/2012/2012_09.pdf', 'Sam Shankland’s interview in Chess Life, September 2012, p. 20 describes Kamsky’s recurring solid, resourceful defense.'],
  ['fide:4122356', 'Dmitry Jakovenko', 'endgame', 'https://ruchess.ru/en/news/report/dmitry_jakovenko_treating_every_opponent_with_utter_respect/', 'Jakovenko identifies endings as his strongest phase and discusses a proposed collection of his best endgames.'],
  ['fide:14103320', 'Ruslan Ponomariov', 'defender', 'https://www.crestbook.com/en/node/1429', 'Ponomariov endorses GM Sergey Shipov’s general assessment of his resourcefulness, technical versatility and resistance.'],
  ['fide:2801990', 'Ilia Smirin', 'attacker', 'https://ruchess.ru/en/persons_of_day/ilia_smirin/', 'The federation’s career profile quotes Smirin on his enduring attachment to attacking combinations and the games of Tal and Stein.'],
  ['fide:1008013', 'Sergei Tiviakov', 'positional', 'https://en.chessbase.com/post/you-have-to-work-hard-on-chess-an-interview-with-sergey-tiviakov', 'Tiviakov describes his own positional style and good technique, while noting that he can also handle sharp positions.'],
  ['fide:5007003', 'Pentala Harikrishna', 'flexible', 'https://en.chessbase.com/post/isle-of-man-winner-harikrishna-in-interview', 'Harikrishna explains varying his first moves according to how he feels, rather than maintaining a narrow opening repertoire.'],
  ['fide:8601429', 'Wang Yue', 'endgame', 'https://www.ruchess.ru/en/persons_of_day/wang_yue/', 'The federation’s career profile describes measured positional play and strong endings, alongside his own identification with Kramnik.'],
  ['fide:8601445', 'Bu Xiangzhi', 'practical', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 5, describes his pragmatic, active positional approach and difficulty to beat.'],
  ['fide:1000268', 'Loek van Wely', 'dynamic', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 6, describes dynamic aggression supported by deep opening knowledge.'],
  ['fide:2004887', 'Sam Shankland', 'dynamic', 'https://new.uschess.org/news/sam-shankland-humble-belated-beginnings-us-champion', 'Shankland and his coaches discuss his longstanding preference for initiative and his development toward more universal play.'],
  ['fide:5016690', 'Parimarjan Negi', 'universal', 'https://sports.ndtv.com/chess/im-no-more-a-one-dimensional-chess-player-parimarjan-negi-1533766', 'Negi describes several years of development from predominantly attacking play toward a broader, more rounded style.'],
  ['fide:4158814', 'Dmitry Andreikin', 'counterattacker', 'https://www.vachess.org/news/2022/Va%20Chess%202022-2.pdf', 'Interviewer Aleksey Bashtavenko reports Andreikin’s own preference for provocative counterattacking play in Virginia Chess 2022/2, p. 13.'],
  ['fide:14101025', 'Alexander Onischuk', 'defender', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 7, characterizes his established toughness and resistance to defeat.'],
  ['fide:4121830', 'Alexander Motylev', 'attacker', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 8, highlights his recurring direct attacks against the king.'],
  ['fide:2803895', 'Boris Avrukh', 'dynamic', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 9, describes an aggressive approach centered on the initiative.'],
  ['fide:1301837', 'Yannick Pelletier', 'endgame', 'https://www.bielchessfestival.ch/dam/jcr:8b4c0277-6fa6-4993-820c-1435614cd8df/2007b_gmt_bio_en.pdf', 'The official Biel 2007 player booklet, p. 10, describes quiet play and clean technical conversion.'],
  ['fide:4152956', 'Nikita Vitiugov', 'universal', 'https://www.chessdom.com/interview-with-nikita-vitiugov-in-reggio-emilia/', 'Vitiugov describes a varied repertoire and comfort with both solid and sharp openings in his own interview.'],
  ['chessmetrics:63804', 'Paul Keres', 'universal', 'https://www.newinchess.com/media/wysiwyg/product_pdf/82115.pdf', 'GM Mihail Marin’s career survey describes classical foundations combined with fierce attacks and complications.'],
  ['chessmetrics:16711', 'David Bronstein', 'unorthodox', 'https://www.newinchess.com/media/wysiwyg/product_pdf/82115.pdf', 'GM Mihail Marin’s career survey emphasizes improvisation and inspiration rather than a rigid single style.'],
  ['chessmetrics:125989', 'Leonid Stein', 'attacker', 'https://www.newinchess.com/media/wysiwyg/product_pdf/82115.pdf', 'GM Mihail Marin describes characteristically attacking play supported by positional preparation across Stein’s career.'],
  ['fide:700037', 'Lajos Portisch', 'positional', 'https://www.newinchess.com/media/wysiwyg/product_pdf/82115.pdf', 'GM Mihail Marin’s career survey highlights classical strategic play with concrete tactical strength.'],
  ['historical:polugaevsky lev', 'Lev Polugaevsky', 'preparation', 'https://www.newinchess.com/media/wysiwyg/product_pdf/82115.pdf', 'GM Mihail Marin emphasizes deep analytical opening preparation; Polugaevsky himself rejects being characterized simply as a tactician.'],
  ['fide:2000032', 'Yasser Seirawan', 'positional', 'https://www.newinchess.com/media/wysiwyg/product_pdf/7598.pdf', 'Longtime collaborator IM Nikolay Minev describes positional thinking across twenty years; GMs Susan Polgar and Larry Christiansen corroborate it.'],
  ['fide:1700014', 'Ulf Andersson', 'simplifier', 'https://www.newinchess.com/media/wysiwyg/product_pdf/9243.pdf', 'Thomas Engqvist’s preface, including Bent Larsen’s assessment, describes exchanges into favorable endings and prolonged technical play.'],
  ['chessmetrics:43054', 'Efim Geller', 'innovator', 'https://chessgamesemporium.com/wp-content/uploads/2023/06/TheNemesis-excerpt.pdf', 'GM John Shaw identifies Geller’s lasting innovations in Sicilian and King’s Indian plans in the publisher’s excerpt of The Nemesis.'],
  ['fide:4618777', 'Artur Yusupov', 'universal', 'https://en.chessbase.com/post/we-are-at-a-dangerous-point-an-interwiew-with-artur-jussupow', 'Yusupov’s retrospective explains developing the ability to attack, sacrifice or enter endings according to the position’s needs.'],
  ['fide:1000012', 'Jan Timman', 'dynamic', 'https://www.newinchess.com/my-best-games', 'GM Daniel King describes strategic foundations plus initiative and sacrificial attacks across Timman’s own career collection.'],
  ['fide:400033', 'Jonathan Speelman', 'endgame', 'https://www.newinchess.com/media/wysiwyg/product_pdf/8369.pdf', 'GM Keith Arkell recalls repeatedly seeing Speelman outplay leading grandmasters through subtle endings in the preface, pp. 10–11.'],
  ['historical:reshevsky samuel h', 'Samuel Reshevsky', 'positional', 'https://www.uschess.org/index.php/October/Ask-GM-Larry-Evans.html', 'GM Larry Evans recommends Reshevsky’s collected games for his repeated extraction of small advantages from quiet positions.'],
  ['chessmetrics:14127', 'Isaak Boleslavsky', 'preparation', 'https://www.ruchess.ru/en/persons_of_day/isaac_boleslavsky/', 'The federation’s career profile describes broad, lasting opening research across the Sicilian, King’s Indian and several other defenses.'],
  ['chessmetrics:68293', 'Alexander Kotov', 'attacker', 'https://ruchess.ru/en/persons_of_day/alexander_kotov/', 'The federation’s career profile describes imaginative attacking play and repeated prizes for beautiful games.'],
  ['fide:13300016', 'Rafael Vaganian', 'unorthodox', 'https://ruchess.ru/en/persons_of_day/rafael_vaganian/', 'GM Genna Sosonko’s quoted career assessment emphasizes originality and unconventional judgments across Vaganian’s play.'],
  ['fide:410608', 'David Howell', 'grinder', 'https://www.newinchess.com/media/wysiwyg/product_pdf/8369.pdf', 'GM Keith Arkell describes Howell as inheriting his grinding approach, repeatedly converting very long endings against strong opponents.'],
  ['fide:400041', 'Michael Adams', 'positional', 'https://maxeuwe.nl/en/michael-mickey-adams-2/', 'The Max Euwe Centre quotes Boris Gelfand’s assessment of Adams’s highly developed positional understanding.'],
  ['fide:400025', 'Nigel Short', 'attacker', 'https://www.englishchess.org.uk/wp-content/uploads/2025/06/Yearbook-2025-complete-compressed.pdf', 'The English Chess Federation’s career profile describes universal strength with a preference for attacking positions.'],
  ['fide:400017', 'John Nunn', 'attacker', 'https://mitpressbookstore.mit.edu/book/9781904600343', 'The publisher description of Nunn’s own career collection Grandmaster Chess Move by Move identifies his direct, aggressive approach.'],
  ['fide:400173', 'Matthew Sadler', 'preparation', 'https://www.chessdom.com/matthew-sadler-explains-how-to-maintain-your-chess-strength/', 'In his own ChessMoves article, Sadler describes sustained enjoyment of preparation and developing fresh opening ideas through engine matches.'],
].map(([personId, name, trait, source, reason]) => Object.freeze({personId, name, trait, source, reason}));
const profiles = new Map(CAREER_PROFILES.map(p => [p.personId, p]));
export const careerProfile = player => profiles.get(player?.personId);
export function rollTrait(player, rng = Math.random) {
  const career = careerProfile(player);
  if (career) return career.trait;
  const roll = rng();
  return roll < 0.25 ? null : TRAITS[Math.min(TRAITS.length - 1, Math.floor((roll - 0.25) / 0.75 * TRAITS.length))].id;
}
export const rollTraits = (players, rng = Math.random) => Object.fromEntries(players.map(p => [p.id, rollTrait(p, rng)]));
export function validTraits(ids, traits, lookup) {
  return !!traits && typeof traits === 'object' && !Array.isArray(traits) && Object.keys(traits).length === ids.length &&
    ids.every(id => Object.hasOwn(traits, id) && validTrait(traits[id]) && (!careerProfile(lookup(id)) || traits[id] === careerProfile(lookup(id)).trait));
}
export const fatiguePenalty = (trait, streak) => Math.min(40, Math.max(0, streak - 3) * 8) * (trait === 'grinder' ? 0.5 : 1);
const attacking = new Set(['attacker', 'sacrificer', 'dynamic', 'tactician']);
const theory = new Set(['preparation', 'specialist', 'innovator']);
export const CONTEXTS = ['theory', 'sharp', 'quiet', 'technical'];
export function matchContext(rng) {
  const kind = CONTEXTS[Math.floor(rng() * CONTEXTS.length)];
  return {kind, ending: kind === 'technical' ? (rng() < 0.5 ? 'rook' : 'minor') : null, timePressure: rng() < 0.2};
}
export function validContext(c) {
  return !!c && CONTEXTS.includes(c.kind) && typeof c.timePressure === 'boolean' &&
    (c.kind === 'technical' ? ['rook', 'minor'].includes(c.ending) : c.ending === null);
}
export function contextLabel(c) {
  return `${({theory:'Opening theory', sharp:'Sharp play', quiet:'Quiet maneuvering', technical:c.ending === 'rook' ? 'Rook ending' : 'Technical ending'})[c.kind]}${c.timePressure ? ' · time pressure' : ''}`;
}
function effect(id, other, c, difference) {
  const sharp = c.kind === 'sharp', quiet = c.kind === 'quiet', technical = c.kind === 'technical', opening = c.kind === 'theory';
  let bonus = 0, draw = 0, block = 0;
  switch (id) {
    case 'attacker': bonus = sharp ? 24 : quiet ? -8 : 0; draw = -0.06; break;
    case 'sacrificer': bonus = sharp && difference < 0 ? 32 : technical ? -12 : 0; draw = -0.08; break;
    case 'dynamic': bonus = sharp ? 24 : technical ? -8 : 0; break;
    case 'tactician': bonus = sharp ? 24 : technical ? -8 : 0; draw = -0.06; break;
    case 'positional': bonus = quiet ? 24 : sharp ? -8 : 0; break;
    case 'prophylaxis': block = 0.5; draw = 0.04; break;
    case 'counterattacker': bonus = attacking.has(other) ? 28 : 0; break;
    case 'defender': bonus = difference <= -40 ? 26 : difference >= 80 ? -8 : 0; draw = 0.04; break;
    case 'endgame': bonus = technical ? 26 : sharp ? -8 : 0; break;
    case 'simplifier': bonus = technical ? 22 : 0; draw = quiet || technical ? 0.06 : 0; break;
    case 'grinder': bonus = technical ? 12 : 0; break;
    case 'rook': bonus = technical && c.ending === 'rook' ? 36 : 0; break;
    case 'exchange': bonus = quiet ? 28 : sharp ? -6 : 0; block = quiet ? 0.25 : 0; break;
    case 'universal': bonus = 10; break;
    case 'coordinator': bonus = quiet ? 26 : opening ? -6 : 0; break;
    case 'practical': draw = difference <= -40 ? 0.08 : difference >= 40 ? -0.08 : 0; break;
    case 'innovator': bonus = ['preparation','specialist'].includes(other) ? 28 : sharp ? 8 : 0; break;
    case 'preparation': bonus = opening ? 26 : 0; break;
    case 'specialist': bonus = (opening ? 32 : 0) - (other === 'unorthodox' ? 8 : 0); break;
    case 'flexible': bonus = theory.has(other) ? 22 : 0; break;
    case 'unorthodox': bonus = (theory.has(other) ? 24 : sharp ? 10 : 0) - (technical ? 12 : 0); draw = -0.04; break;
    case 'calculator': bonus = (sharp ? 28 : 0) - (c.timePressure ? 12 : 0); break;
    case 'intuitive': bonus = sharp || quiet ? 18 : opening ? -8 : 0; break;
    case 'time-trouble': bonus = (sharp || opening ? 20 : 0) - (c.timePressure ? 24 : 0); break;
    case 'materialist': bonus = (attacking.has(other) ? 22 : 0) - (quiet ? 8 : 0); break;
  }
  return {bonus, draw, block};
}
// Resolve simultaneously, so counters do not depend on which side is evaluated first.
export function matchupEffects(a, b, context, ratingA, ratingB) {
  const ae = effect(a, b, context, ratingA - ratingB), be = effect(b, a, context, ratingB - ratingA);
  const clamp = n => Math.max(-40, Math.min(40, n));
  return {
    a: {bonus: clamp(ae.bonus > 0 ? ae.bonus * (1 - be.block) : ae.bonus), draw: ae.draw},
    b: {bonus: clamp(be.bonus > 0 ? be.bonus * (1 - ae.block) : be.bonus), draw: be.draw},
  };
}

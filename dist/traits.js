// Career-inspired labels; the numerical effects are fictional game rules.
export const TRAIT_RULESET = 'career-traits-1';
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
export const SIGNATURE_PROFILES = [
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
].map(([personId, name, trait, source, reason]) => Object.freeze({personId, name, trait, source, reason}));
const profiles = new Map(SIGNATURE_PROFILES.map(p => [p.personId, p]));
export const signatureProfile = player => profiles.get(player?.personId);
export function rollTrait(player, rng = Math.random) {
  const signature = signatureProfile(player);
  if (signature) return signature.trait;
  const roll = rng();
  return roll < 0.25 ? null : TRAITS[Math.min(TRAITS.length - 1, Math.floor((roll - 0.25) / 0.75 * TRAITS.length))].id;
}
export const rollTraits = (players, rng = Math.random) => Object.fromEntries(players.map(p => [p.id, rollTrait(p, rng)]));
export function validTraits(ids, traits, lookup) {
  return !!traits && typeof traits === 'object' && !Array.isArray(traits) && Object.keys(traits).length === ids.length &&
    ids.every(id => Object.hasOwn(traits, id) && validTrait(traits[id]) && (!signatureProfile(lookup(id)) || traits[id] === signatureProfile(lookup(id)).trait));
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

// Curated fantasy game ratings, inspired by the 2024 player pool; not live FIDE ratings.
const rosters = [
  ['IND','India','🇮🇳', [['Gukesh D',2770],['Arjun Erigaisi',2780],['R. Praggnanandhaa',2750],['Vidit Gujrathi',2720],['Pentala Harikrishna',2690]]],
  ['USA','United States','🇺🇸', [['Fabiano Caruana',2800],['Hikaru Nakamura',2800],['Wesley So',2750],['Levon Aronian',2730],['Ray Robson',2700]]],
  ['NOR','Norway','🇳🇴', [['Magnus Carlsen',2840],['Aryan Tari',2630],['Johan-S. Christiansen',2650],['Jon Ludvig Hammer',2600],['Frode Urkedal',2560]]],
  ['CHN','China','🇨🇳', [['Ding Liren',2740],['Wei Yi',2760],['Yu Yangyi',2710],['Bu Xiangzhi',2690],['Wang Yue',2630]]],
  ['UZB','Uzbekistan','🇺🇿', [['Nodirbek Abdusattorov',2770],['Javokhir Sindarov',2670],['Nodirbek Yakubboev',2670],['Jakhongir Vakhidov',2570],['Shamsiddin Vokhidov',2640]]],
  ['FRA','France','🇫🇷', [['Alireza Firouzja',2760],['Maxime Vachier-Lagrave',2730],['Etienne Bacrot',2670],['Jules Moussard',2640],['Laurent Fressinet',2620]]],
  ['NED','Netherlands','🇳🇱', [['Anish Giri',2730],['Jorden van Foreest',2700],['Max Warmerdam',2670],['Benjamin Bok',2620],['Loek van Wely',2610]]],
  ['GER','Germany','🇩🇪', [['Vincent Keymer',2730],['Matthias Bluebaum',2650],['Alexander Donchenko',2640],['Rasmus Svane',2640],['Dmitrij Kollars',2630]]],
  ['AZE','Azerbaijan','🇦🇿', [['Shakhriyar Mamedyarov',2730],['Teimour Radjabov',2700],['Rauf Mamedov',2640],['Nijat Abasov',2640],['Aydin Suleymanli',2590]]],
  ['UKR','Ukraine','🇺🇦', [['Vasyl Ivanchuk',2640],['Andrei Volokitin',2660],['Anton Korobov',2660],['Pavel Eljanov',2650],['Ruslan Ponomariov',2630]]],
  ['ENG','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿', [['David Howell',2670],['Michael Adams',2670],['Luke McShane',2630],['Gawain Jones',2640],['Shreyas Royal',2500]]],
  ['HUN','Hungary','🇭🇺', [['Richard Rapport',2720],['Peter Leko',2670],['Benjamin Gledura',2620],['Sanan Sjugirov',2660],['Peter Prohaszka',2590]]],
];
export const NATIONS = rosters.map(([id,name,flag]) => ({id,name,flag}));
export const PLAYERS = rosters.flatMap(([nation,,flag,players]) => players.map(([name,rating],i) => ({id:`${nation}-${i}`,name,nation,flag,rating,cost:Math.max(8,Math.round((rating-2320)/20))})));
export const BUDGET = 100;
export const ROUND_COUNT = 11;
export const SAVE_VERSION = 1;
export const nationById = id => NATIONS.find(n => n.id === id);
export const playerById = id => PLAYERS.find(p => p.id === id);
export const spent = squad => squad.filter(Boolean).reduce((sum,id) => sum + playerById(id).cost,0);
export const average = squad => { const p=squad.filter(Boolean).map(playerById); return p.length ? Math.round(p.reduce((n,p)=>n+p.rating,0)/p.length) : 0; };
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed ^ seed >>> 15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export function shuffle(items,rng=Math.random) { const a=[...items]; for(let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function canAfford(player,squad) {
  if(squad.includes(player.id) || squad.filter(Boolean).length >= 5) return false;
  const remaining=4-squad.filter(Boolean).length;
  const cheapest=PLAYERS.filter(p=>!squad.includes(p.id)&&p.id!==player.id).sort((a,b)=>a.cost-b.cost).slice(0,remaining);
  return spent(squad)+player.cost+cheapest.reduce((s,p)=>s+p.cost,0)<=BUDGET;
}
export function createOffer(squad,rng=Math.random) {
  const eligible=PLAYERS.filter(p=>canAfford(p,squad));
  const nations=NATIONS.filter(n=>eligible.some(p=>p.nation===n.id));
  if(!nations.length) return null;
  const nation=nations[Math.floor(rng()*nations.length)];
  return {nation:nation.id,players:shuffle(eligible.filter(p=>p.nation===nation.id),rng).slice(0,3).sort((a,b)=>b.rating-a.rating).map(p=>p.id)};
}
export function initialState() { return {version:SAVE_VERSION,phase:'draft',mode:'classic',squad:[null,null,null,null,null],offer:null,rerolls:2,tournament:null,teamName:'The Dream Team'}; }
export function selectPlayer(state,id,slot) {
  const player=playerById(id);
  if(state.phase!=='draft'||!state.offer?.players.includes(id)||!player||!canAfford(player,state.squad)||slot<0||slot>4||state.squad[slot]) return state;
  return {...state,squad:state.squad.map((p,i)=>i===slot?id:p),offer:null};
}
export function sortBoards(squad) { return [...squad.slice(0,4).filter(Boolean).sort((a,b)=>playerById(b).rating-playerById(a).rating),...Array(4-squad.slice(0,4).filter(Boolean).length).fill(null),squad[4]]; }

const opponents = [
  ['IND','India','🇮🇳',2750],['USA','United States','🇺🇸',2755],['CHN','China','🇨🇳',2720],['UZB','Uzbekistan','🇺🇿',2690],['NED','Netherlands','🇳🇱',2680],['NOR','Norway','🇳🇴',2670],['GER','Germany','🇩🇪',2665],['ENG','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿',2660],['HUN','Hungary','🇭🇺',2660],['IRI','Iran','🇮🇷',2655],['POL','Poland','🇵🇱',2655],['AZE','Azerbaijan','🇦🇿',2650],['ESP','Spain','🇪🇸',2650],['FRA','France','🇫🇷',2650],['UKR','Ukraine','🇺🇦',2645],['SRB','Serbia','🇷🇸',2640],['ARM','Armenia','🇦🇲',2640],['ROU','Romania','🇷🇴',2630],['CZE','Czechia','🇨🇿',2610],['ISR','Israel','🇮🇱',2590],['VIE','Vietnam','🇻🇳',2590],['TUR','Türkiye','🇹🇷',2585],['GRE','Greece','🇬🇷',2575],['CRO','Croatia','🇭🇷',2560],['ITA','Italy','🇮🇹',2550],['SLO','Slovenia','🇸🇮',2540],['CAN','Canada','🇨🇦',2520],['AUS','Australia','🇦🇺',2510],['ARG','Argentina','🇦🇷',2490],['BRA','Brazil','🇧🇷',2470],['RSA','South Africa','🇿🇦',2380],
];
export function startTournament(squad,teamName,seed=Date.now()>>>0) {
  if(squad.length!==5||squad.some(id=>!playerById(id))||new Set(squad).size!==5||spent(squad)>BUDGET) throw new Error('Complete a valid five-player squad first.');
  const make=(id,name,flag,rating)=>({id,name,flag,rating,mp:0,bp:0,w:0,d:0,l:0,history:[]});
  return {seed,round:0,squad:sortBoards(squad),streaks:Object.fromEntries(squad.map(id=>[id,0])),teams:[make('YOU',teamName,'✦',average(squad.slice(0,4))),...opponents.map(o=>make(...o))],rounds:[]};
}
export function standings(t) {
  const sb=team=>team.history.reduce((s,h)=>s+(t.teams.find(o=>o.id===h.opponent)?.mp||0)*h.points,0);
  return t.teams.map(team=>({...team,sb:sb(team)})).sort((a,b)=>b.mp-a.mp||b.sb-a.sb||b.bp-a.bp||b.rating-a.rating||a.id.localeCompare(b.id));
}
// A small score-group Swiss matcher. Backtracking guarantees no repeated opponents.
export function pairTeams(t) {
  const ordered=standings(t);
  if(!t.round) { const ranked=[...ordered].sort((a,b)=>b.rating-a.rating); return ranked.slice(0,16).map((team,i)=>[team.id,ranked[i+16].id]); }
  function match(remaining) {
    if(!remaining.length) return [];
    const [a,...rest]=remaining;
    const candidates=rest.filter(b=>!a.history.some(h=>h.opponent===b.id)).sort((b,c)=>Math.abs(a.mp-b.mp)-Math.abs(a.mp-c.mp)||Math.abs(a.bp-b.bp)-Math.abs(a.bp-c.bp));
    for(const b of candidates) { const result=match(rest.filter(c=>c.id!==b.id)); if(result) return [[a.id,b.id],...result]; }
    return null;
  }
  const pairs=match(ordered);
  if(!pairs) throw new Error('No valid pairing found.');
  return pairs;
}
export function boardProbabilities(a,b,white=true) {
  const difference=a-b+(white?28:-28);
  const expected=1/(1+10**(-difference/400));
  const draw=Math.min(0.5*Math.exp(-Math.abs(difference)/600),2*Math.min(expected,1-expected));
  return {win:expected-draw/2,draw,loss:1-expected-draw/2};
}
export function simulateRound(tournament) {
  if(tournament.round>=ROUND_COUNT) return tournament;
  const t=structuredClone(tournament),rng=random(t.seed+t.round*1009);
  const pairs=pairTeams(t),matches=[];
  for(const [aid,bid] of pairs) {
    const a=t.teams.find(x=>x.id===aid),b=t.teams.find(x=>x.id===bid),boards=[];
    const lineup=team=>team.id==='YOU'?t.squad.slice(0,4).map(id=>{const p=playerById(id);return {...p,rating:p.rating-Math.min(40,Math.max(0,t.streaks[id]-3)*8)};}):[65,20,-20,-65].map((offset,i)=>({id:`${team.id}-${i}`,name:`${team.name} · board ${i+1}`,rating:team.rating+offset}));
    const ap=lineup(a),bp=lineup(b);
    for(let i=0;i<4;i++) { const white=(t.round+i)%2===0;const p=boardProbabilities(ap[i].rating,bp[i].rating,white),roll=rng();const score=roll<p.win?1:roll<p.win+p.draw?0.5:0;boards.push({a:ap[i],b:bp[i],score,white}); }
    const points=boards.reduce((n,board)=>n+board.score,0);
    const apply=(team,other,pts)=>{team.bp+=pts;team.mp+=pts>2?2:pts===2?1:0;team[pts>2?'w':pts===2?'d':'l']++;team.history.push({opponent:other.id,points:pts});};
    apply(a,b,points);apply(b,a,4-points);matches.push({a:aid,b:bid,points,boards});
  }
  for(const id of t.squad) t.streaks[id]=t.squad.slice(0,4).includes(id)?t.streaks[id]+1:0;
  t.round++; t.rounds.push(matches);return t;
}
export function rotateReserve(tournament,boardIndex) {
  if(boardIndex<0||boardIndex>3||tournament.round>=11) return tournament;
  const t=structuredClone(tournament);
  [t.squad[boardIndex],t.squad[4]]=[t.squad[4],t.squad[boardIndex]];
  t.squad=sortBoards(t.squad);t.teams.find(x=>x.id==='YOU').rating=average(t.squad.slice(0,4));return t;
}
export function validSave(s) {
  if(!s||s.version!==SAVE_VERSION||!['draft','tournament','results'].includes(s.phase)||!['classic','expert'].includes(s.mode)||!Array.isArray(s.squad)||s.squad.length!==5||s.squad.some(id=>id!==null&&!playerById(id))||new Set(s.squad.filter(Boolean)).size!==s.squad.filter(Boolean).length||spent(s.squad)>100||!Number.isInteger(s.rerolls)||s.rerolls<0||s.rerolls>2||typeof s.teamName!=='string'||s.teamName.length>30) return false;
  if(s.phase==='draft') return !s.tournament && (!s.offer || NATIONS.some(n=>n.id===s.offer.nation)&&Array.isArray(s.offer.players)&&s.offer.players.length>0&&s.offer.players.every(id=>playerById(id)?.nation===s.offer.nation&&canAfford(playerById(id),s.squad)));
  const t=s.tournament;
  return !!t&&Number.isInteger(t.seed)&&Number.isInteger(t.round)&&t.round>=0&&t.round<=11&&(s.phase==='results'?t.round===11:t.round<11)&&Array.isArray(t.teams)&&t.teams.length===32&&t.teams.some(x=>x.id==='YOU')&&t.teams.every(x=>typeof x.id==='string'&&typeof x.name==='string'&&typeof x.flag==='string'&&Number.isFinite(x.rating)&&Number.isFinite(x.mp)&&Number.isFinite(x.bp)&&Number.isFinite(x.w)&&Number.isFinite(x.d)&&Number.isFinite(x.l)&&Array.isArray(x.history)&&x.history.length===t.round&&x.history.every(h=>t.teams.some(o=>o.id===h.opponent)&&Number.isFinite(h.points)))&&Array.isArray(t.squad)&&t.squad.length===5&&new Set(t.squad).size===5&&t.squad.every(id=>s.squad.includes(id)&&Number.isFinite(t.streaks?.[id]))&&Array.isArray(t.rounds)&&t.rounds.length===t.round&&t.rounds.every(matches=>Array.isArray(matches)&&matches.length===16&&matches.every(m=>t.teams.some(x=>x.id===m.a)&&t.teams.some(x=>x.id===m.b)&&Number.isFinite(m.points)&&Array.isArray(m.boards)&&m.boards.length===4&&m.boards.every(b=>typeof b.a?.name==='string'&&typeof b.b?.name==='string'&&Number.isFinite(b.a.rating)&&Number.isFinite(b.b.rating)&&[0,0.5,1].includes(b.score))));
}

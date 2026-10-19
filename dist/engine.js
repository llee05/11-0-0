// The server supplies a validated, versioned country-year catalogue from SQL.
export let NATIONS=[],PLAYERS=[],CATALOGUE={release:null};
let playerIndex=new Map(),nationIndex=new Map(),cheapestPlayers=[];
export function configureCatalogue(catalogue){
  if(!catalogue?.metadata?.release||!Array.isArray(catalogue.nations)||!Array.isArray(catalogue.players)||catalogue.nations.length<1)throw new Error('Invalid rating catalogue.');
  const players=new Map(catalogue.players.map(p=>[p.id,p]));
  if(players.size!==catalogue.players.length||catalogue.nations.some(n=>n.players.length!==5||new Set(n.players).size!==5||n.players.some(id=>players.get(id)?.nation!==n.id)))throw new Error('Incomplete country-year roster.');
  NATIONS=catalogue.nations;PLAYERS=catalogue.players;CATALOGUE=catalogue.metadata;
  playerIndex=players;nationIndex=new Map(NATIONS.map(n=>[n.id,n]));
  cheapestPlayers=[...PLAYERS].sort((a,b)=>a.cost-b.cost);
}
export const BUDGET = 100;
export const ROUND_COUNT = 11;
export const SAVE_VERSION = 2;
export const nationById = id => nationIndex.get(id);
export const playerById = id => playerIndex.get(id);
export const spent = squad => squad.filter(Boolean).reduce((sum,id) => sum + playerById(id).cost,0);
export const average = squad => { const p=squad.filter(Boolean).map(playerById); return p.length ? Math.round(p.reduce((n,p)=>n+p.rating,0)/p.length) : 0; };
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed ^ seed >>> 15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export function shuffle(items,rng=Math.random) { const a=[...items]; for(let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function canAfford(player,squad) {
  if(!player||squad.filter(Boolean).length>=5)return false;
  const used=new Set(squad.filter(Boolean).map(id=>playerById(id)?.personId));
  if(used.has(player.personId))return false;
  used.add(player.personId);
  let total=spent(squad)+player.cost,remaining=4-squad.filter(Boolean).length;
  for(const candidate of cheapestPlayers){
    if(!remaining)break;
    if(used.has(candidate.personId))continue;
    total+=candidate.cost;used.add(candidate.personId);remaining--;
  }
  return remaining===0&&total<=BUDGET;
}
export function createOffer(squad,rng=Math.random) {
  const nations=NATIONS.filter(n=>n.players.some(id=>canAfford(playerById(id),squad)));
  if(!nations.length)return null;
  const nation=nations[Math.floor(rng()*nations.length)];
  // Always reveal the source list's full top five. Ineligible picks are shown
  // disabled by the UI; no lower-ranked player replaces an unaffordable star.
  return {nation:nation.id,players:[...nation.players]};
}
export function initialState() { return {version:SAVE_VERSION,catalogueRelease:CATALOGUE.release,phase:'draft',mode:'classic',squad:[null,null,null,null,null],offer:null,rerolls:2,tournament:null,teamName:'The Dream Team'}; }
export function selectPlayer(state,id,slot) {
  const player=playerById(id);
  if(state.phase!=='draft'||!nationById(state.offer?.nation)?.players.includes(id)||!state.offer?.players.includes(id)||!player||!canAfford(player,state.squad)||slot<0||slot>4||state.squad[slot]) return state;
  return {...state,squad:state.squad.map((p,i)=>i===slot?id:p),offer:null};
}
export function sortBoards(squad) { return [...squad.slice(0,4).filter(Boolean).sort((a,b)=>playerById(b).rating-playerById(a).rating),...Array(4-squad.slice(0,4).filter(Boolean).length).fill(null),squad[4]]; }

export function startTournament(squad,teamName,seed=Date.now()>>>0) {
  if(squad.length!==5||squad.some(id=>!playerById(id))||new Set(squad.map(id=>playerById(id).personId)).size!==5||spent(squad)>BUDGET) throw new Error('Complete a valid five-player squad first.');
  const make=(id,name,flag,rating,players=[])=>({id,name,flag,rating,players,mp:0,bp:0,w:0,d:0,l:0,history:[]});
  const opponents=NATIONS.filter(n=>n.year===2026).sort((a,b)=>average(b.players.slice(0,4))-average(a.players.slice(0,4))||a.id.localeCompare(b.id)).slice(0,31);
  if(opponents.length!==31)throw new Error('The catalogue needs at least 31 national teams.');
  return {seed,round:0,squad:sortBoards(squad),streaks:Object.fromEntries(squad.map(id=>[id,0])),teams:[make('YOU',teamName,'✦',average(squad.slice(0,4))),...opponents.map(o=>make(o.id,o.name,o.flag,average(o.players.slice(0,4)),[...o.players]))],rounds:[]};
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
    const lineup=team=>team.id==='YOU'?t.squad.slice(0,4).map(id=>{const p=playerById(id);return {...p,rating:p.rating-Math.min(40,Math.max(0,t.streaks[id]-3)*8)};}):team.players.slice(0,4).map(id=>({...playerById(id)}));
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
  if(!s||s.version!==SAVE_VERSION||s.catalogueRelease!==CATALOGUE.release||!['draft','tournament','results'].includes(s.phase)||!['classic','expert'].includes(s.mode)||!Array.isArray(s.squad)||s.squad.length!==5||s.squad.some(id=>id!==null&&!playerById(id))||new Set(s.squad.filter(Boolean).map(id=>playerById(id).personId)).size!==s.squad.filter(Boolean).length||spent(s.squad)>100||!Number.isInteger(s.rerolls)||s.rerolls<0||s.rerolls>2||typeof s.teamName!=='string'||s.teamName.length>30) return false;
  if(s.phase==='draft') { const nation=nationById(s.offer?.nation);return !s.tournament&&(!s.offer||!!nation&&Array.isArray(s.offer.players)&&s.offer.players.length===5&&s.offer.players.every((id,i)=>id===nation.players[i])&&s.offer.players.some(id=>canAfford(playerById(id),s.squad))); }
  const t=s.tournament;
  return !!t&&Number.isInteger(t.seed)&&Number.isInteger(t.round)&&t.round>=0&&t.round<=11&&(s.phase==='results'?t.round===11:t.round<11)&&Array.isArray(t.teams)&&t.teams.length===32&&t.teams.some(x=>x?.id==='YOU')&&t.teams.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.flag==='string'&&Number.isFinite(x.rating)&&Number.isFinite(x.mp)&&Number.isFinite(x.bp)&&Number.isFinite(x.w)&&Number.isFinite(x.d)&&Number.isFinite(x.l)&&(x.id==='YOU'||Array.isArray(x.players)&&x.players.length===5&&x.players.every((id,i)=>id===nationById(x.id)?.players[i]))&&Array.isArray(x.history)&&x.history.length===t.round&&x.history.every(h=>h&&t.teams.some(o=>o?.id===h.opponent)&&Number.isFinite(h.points)))&&Array.isArray(t.squad)&&t.squad.length===5&&new Set(t.squad).size===5&&t.squad.every(id=>s.squad.includes(id)&&Number.isFinite(t.streaks?.[id]))&&Array.isArray(t.rounds)&&t.rounds.length===t.round&&t.rounds.every(matches=>Array.isArray(matches)&&matches.length===16&&matches.every(m=>m&&t.teams.some(x=>x?.id===m.a)&&t.teams.some(x=>x?.id===m.b)&&Number.isFinite(m.points)&&Array.isArray(m.boards)&&m.boards.length===4&&m.boards.every(b=>typeof b?.a?.name==='string'&&typeof b.b?.name==='string'&&Number.isFinite(b.a.rating)&&Number.isFinite(b.b.rating)&&[0,0.5,1].includes(b.score))));
}

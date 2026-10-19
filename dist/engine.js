import {TRAIT_RULESET, rollTraits, validTraits, fatiguePenalty, matchContext, validContext, matchupEffects} from './traits.js';
// The server supplies a validated, versioned country-year catalogue from SQL.
export let NATIONS=[],PLAYERS=[],OPPONENTS=[],CATALOGUE={release:null};
let playerIndex=new Map(),nationIndex=new Map(),opponentIndex=new Map(),cheapestPlayers=[];
export function configureCatalogue(catalogue){
  if(!catalogue?.metadata?.release||!Array.isArray(catalogue.nations)||!Array.isArray(catalogue.players)||catalogue.nations.length<1)throw new Error('Invalid rating catalogue.');
  const players=new Map(catalogue.players.map(p=>[p.id,p]));
  if(players.size!==catalogue.players.length||catalogue.nations.some(n=>n.players.length!==5||new Set(n.players).size!==5||n.players.some(id=>players.get(id)?.nation!==n.id)))throw new Error('Incomplete country-year roster.');
  const opponents=catalogue.opponents;
  const usedPeople=new Set();
  if(!Array.isArray(opponents)||opponents.length!==31||new Set(opponents.map(o=>o.id)).size!==31||opponents.some(o=>!o.id.startsWith('alltime:')||o.players.length!==5||o.players.some(id=>{
    const p=players.get(id);
    if(!p||p.federation!==o.code||usedPeople.has(p.personId))return true;
    usedPeople.add(p.personId);return false;
  })||o.rating!==Math.round(o.players.slice(0,4).reduce((sum,id)=>sum+players.get(id).rating,0)/4)))throw new Error('Invalid all-time tournament field.');
  NATIONS=catalogue.nations;PLAYERS=catalogue.players;OPPONENTS=opponents;CATALOGUE=catalogue.metadata;
  playerIndex=players;nationIndex=new Map(NATIONS.map(n=>[n.id,n]));
  opponentIndex=new Map(OPPONENTS.map(o=>[o.id,o]));
  cheapestPlayers=[...PLAYERS].sort((a,b)=>a.cost-b.cost);
}
export const BUDGET = 100;
export const ROUND_COUNT = 11;
export const SAVE_VERSION = 3;
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
  return {nation:nation.id,players:[...nation.players],traits:rollTraits(nation.players.map(playerById),rng)};
}
export function initialState() { return {version:SAVE_VERSION,rulesVersion:TRAIT_RULESET,catalogueRelease:CATALOGUE.release,phase:'draft',mode:'classic',squad:[null,null,null,null,null],traits:{},offer:null,rerolls:2,tournament:null,teamName:'The Dream Team'}; }
export function selectPlayer(state,id,slot) {
  const player=playerById(id);
  if(state.phase!=='draft'||!nationById(state.offer?.nation)?.players.includes(id)||!state.offer?.players.includes(id)||!validTraits(state.offer.players,state.offer.traits,playerById)||!player||!canAfford(player,state.squad)||!Number.isInteger(slot)||slot<0||slot>4||state.squad[slot]) return state;
  return {...state,squad:state.squad.map((p,i)=>i===slot?id:p),traits:{...state.traits,[id]:state.offer.traits[id]},offer:null};
}
export function sortBoards(squad) { return [...squad.slice(0,4).filter(Boolean).sort((a,b)=>playerById(b).rating-playerById(a).rating),...Array(4-squad.slice(0,4).filter(Boolean).length).fill(null),squad[4]]; }

export function startTournament(squad,teamName,seed=Date.now()>>>0,traits=null) {
  if(squad.length!==5||squad.some(id=>!playerById(id))||new Set(squad.map(id=>playerById(id).personId)).size!==5||spent(squad)>BUDGET) throw new Error('Complete a valid five-player squad first.');
  const rng=random(seed^0x54524149),lineup=sortBoards(squad);
  const ownTraits=traits===null?rollTraits(lineup.map(playerById),rng):traits;
  if(!validTraits(lineup,ownTraits,playerById))throw new Error('Invalid player traits.');
  const make=(id,name,flag,players,assigned)=>({id,name,flag,rating:average(players.slice(0,4)),players:[...players],lineup:[...players],traits:{...assigned},streaks:Object.fromEntries(players.map(id=>[id,0])),mp:0,bp:0,w:0,d:0,l:0,history:[]});
  // Use a separate stream for opponents so their rolls never depend on how the
  // caller supplied the user's traits or on later reserve decisions.
  const opponentRng=random(seed^0x41495452);
  return {seed,round:0,squad:lineup,streaks:Object.fromEntries(squad.map(id=>[id,0])),teams:[make('YOU',teamName,'✦',lineup,ownTraits),...OPPONENTS.map(o=>make(o.id,o.name,o.flag,o.players,rollTraits(o.players.map(playerById),opponentRng)))],rounds:[]};
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
export function boardProbabilities(a,b,white=true,drawShift=0) {
  const difference=a-b+(white?28:-28);
  const expected=1/(1+10**(-difference/400));
  const draw=Math.max(0,Math.min(0.5*Math.exp(-Math.abs(difference)/600)+drawShift,2*Math.min(expected,1-expected)));
  return {win:expected-draw/2,draw,loss:1-expected-draw/2};
}
function prepareRound(tournament) {
  const t=structuredClone(tournament);
  for(const team of t.teams){
    if(team.id==='YOU'){team.lineup=[...t.squad];team.streaks={...t.streaks};}
    else {
      // Opponents may rest a tired starter when their reserve is stronger after
      // fatigue. Resolve ties by source strength and ID, then order the boards.
      const effective=id=>playerById(id).rating-fatiguePenalty(team.traits[id],team.streaks[id]);
      team.lineup=sortBoards([...team.players].sort((a,b)=>effective(b)-effective(a)||playerById(b).rating-playerById(a).rating||a.localeCompare(b)));
    }
    team.rating=average(team.lineup.slice(0,4));
  }
  return t;
}
function upcomingMatches(t) {
  const contextRng=random(t.seed^Math.imul(t.round+1,0x9E3779B1));
  return pairTeams(t).map(([aid,bid])=>{
    const a=t.teams.find(x=>x.id===aid),b=t.teams.find(x=>x.id===bid);
    const boards=Array.from({length:4},(_,i)=>{
      const context=matchContext(contextRng),white=(t.round+i)%2===0;
      const player=(team)=>{const p=playerById(team.lineup[i]),trait=team.traits[p.id],fatigue=fatiguePenalty(trait,team.streaks[p.id]);return {...p,baseRating:p.rating,trait,fatigue,rating:p.rating-fatigue};};
      const ap=player(a),bp=player(b),effects=matchupEffects(ap.trait,bp.trait,context,ap.rating,bp.rating);
      for(const [p,e] of [[ap,effects.a],[bp,effects.b]]){p.traitBonus=e.bonus;p.drawShift=e.draw;p.rating+=e.bonus;}
      return {a:ap,b:bp,context,white,probabilities:boardProbabilities(ap.rating,bp.rating,white,effects.a.draw+effects.b.draw)};
    });
    return {a:aid,b:bid,boards};
  });
}
// Pure forecast: repeated previews and reloads cannot reroll abilities or games.
export function previewRound(tournament) {
  if(tournament.round>=ROUND_COUNT)return null;
  return upcomingMatches(prepareRound(tournament)).find(m=>m.a==='YOU'||m.b==='YOU');
}
export function simulateRound(tournament) {
  if(tournament.round>=ROUND_COUNT) return tournament;
  const t=prepareRound(tournament),rng=random(t.seed+t.round*1009),matches=[];
  for(const match of upcomingMatches(t)) {
    const {a:aid,b:bid,boards}=match,a=t.teams.find(x=>x.id===aid),b=t.teams.find(x=>x.id===bid);
    for(const board of boards){const p=board.probabilities,roll=rng();board.score=roll<p.win?1:roll<p.win+p.draw?0.5:0;}
    const points=boards.reduce((n,board)=>n+board.score,0);
    const apply=(team,other,pts)=>{team.bp+=pts;team.mp+=pts>2?2:pts===2?1:0;team[pts>2?'w':pts===2?'d':'l']++;team.history.push({opponent:other.id,points:pts});};
    apply(a,b,points);apply(b,a,4-points);matches.push({a:aid,b:bid,points,boards});
  }
  for(const team of t.teams)for(const id of team.players)team.streaks[id]=team.lineup.slice(0,4).includes(id)?team.streaks[id]+1:0;
  t.streaks={...t.teams.find(team=>team.id==='YOU').streaks};
  t.round++; t.rounds.push(matches);return t;
}
export function rotateReserve(tournament,boardIndex) {
  if(boardIndex<0||boardIndex>3||tournament.round>=11) return tournament;
  const t=structuredClone(tournament);
  [t.squad[boardIndex],t.squad[4]]=[t.squad[4],t.squad[boardIndex]];
  t.squad=sortBoards(t.squad);const own=t.teams.find(x=>x.id==='YOU');own.lineup=[...t.squad];own.rating=average(t.squad.slice(0,4));return t;
}
export function validSave(s) {
  try { return validateSave(s); } catch { return false; }
}
function validateSave(s) {
  if(!s||s.version!==SAVE_VERSION||s.rulesVersion!==TRAIT_RULESET||s.catalogueRelease!==CATALOGUE.release||!['draft','tournament','results'].includes(s.phase)||!['classic','expert'].includes(s.mode)||!Array.isArray(s.squad)||s.squad.length!==5||s.squad.some(id=>id!==null&&!playerById(id))||new Set(s.squad.filter(Boolean).map(id=>playerById(id).personId)).size!==s.squad.filter(Boolean).length||spent(s.squad)>BUDGET||!validTraits(s.squad.filter(Boolean),s.traits,playerById)||!Number.isInteger(s.rerolls)||s.rerolls<0||s.rerolls>2||typeof s.teamName!=='string'||s.teamName.length>30)return false;
  if(s.phase==='draft') {
    const nation=nationById(s.offer?.nation);
    return !s.tournament&&(!s.offer||!!nation&&Array.isArray(s.offer.players)&&s.offer.players.length===5&&s.offer.players.every((id,i)=>id===nation.players[i])&&validTraits(s.offer.players,s.offer.traits,playerById)&&s.offer.players.some(id=>canAfford(playerById(id),s.squad)));
  }
  const t=s.tournament;
  if(s.offer||s.squad.some(id=>!id)||!t||!Number.isInteger(t.seed)||!Number.isInteger(t.round)||t.round<0||t.round>ROUND_COUNT||(s.phase==='results'?t.round!==ROUND_COUNT:t.round>=ROUND_COUNT)||!Array.isArray(t.teams)||t.teams.length!==32||new Set(t.teams.map(x=>x?.id)).size!==32||!t.teams.some(x=>x.id==='YOU')||OPPONENTS.some(o=>!t.teams.some(x=>x.id===o.id)))return false;
  const same=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
  const streaks=(ids,values)=>values&&Object.keys(values).length===5&&ids.every(id=>Number.isInteger(values[id])&&values[id]>=0&&values[id]<=t.round);
  if(!Array.isArray(t.squad)||!same([...t.squad].sort(),[...s.squad].sort())||!same(t.squad,sortBoards(t.squad))||!streaks(t.squad,t.streaks))return false;
  for(const team of t.teams){
    const source=opponentIndex.get(team.id),own=team.id==='YOU';
    const canonical=own?sortBoards(s.squad):source?.players;
    if(!canonical||typeof team.name!=='string'||typeof team.flag!=='string'||(own?team.name!==s.teamName||team.flag!=='✦':team.name!==source.name||team.flag!==source.flag)||!Array.isArray(team.players)||!same(team.players,canonical)||!Array.isArray(team.lineup)||!same([...team.lineup].sort(),[...canonical].sort())||!same(team.lineup,sortBoards(team.lineup))||team.rating!==average(team.lineup.slice(0,4))||!validTraits(team.players,team.traits,playerById)||!streaks(team.players,team.streaks)||!Array.isArray(team.history)||team.history.length!==t.round)return false;
    if(own&&(!same(team.lineup,t.squad)||team.players.some(id=>team.traits[id]!==s.traits[id]||team.streaks[id]!==t.streaks[id])))return false;
    const opponents=new Set();let mp=0,bp=0,w=0,d=0,l=0;
    for(const h of team.history){
      if(!h||h.opponent===team.id||opponents.has(h.opponent)||!t.teams.some(o=>o.id===h.opponent)||![0,0.5,1,1.5,2,2.5,3,3.5,4].includes(h.points))return false;
      opponents.add(h.opponent);bp+=h.points;mp+=h.points>2?2:h.points===2?1:0;
      if(h.points>2)w++;else if(h.points===2)d++;else l++;
    }
    if(team.mp!==mp||team.bp!==bp||team.w!==w||team.d!==d||team.l!==l)return false;
  }
  if(!Array.isArray(t.rounds)||t.rounds.length!==t.round)return false;
  return t.rounds.every((matches,round)=>Array.isArray(matches)&&matches.length===16&&new Set(matches.flatMap(m=>[m?.a,m?.b])).size===32&&matches.every(m=>{
    const a=t.teams.find(x=>x.id===m?.a),b=t.teams.find(x=>x.id===m?.b);
    if(!a||!b||a===b||!Array.isArray(m.boards)||m.boards.length!==4||m.points!==m.boards.reduce((sum,board)=>sum+board.score,0)||a.history[round].opponent!==b.id||b.history[round].opponent!==a.id||a.history[round].points!==m.points||b.history[round].points!==4-m.points)return false;
    if(new Set(m.boards.map(board=>board.a?.id)).size!==4||new Set(m.boards.map(board=>board.b?.id)).size!==4)return false;
    return m.boards.every((board,i)=>{
      if(!validContext(board.context)||board.white!==((round+i)%2===0)||![0,0.5,1].includes(board.score))return false;
      for(const [p,team] of [[board.a,a],[board.b,b]]){
        const source=playerById(p?.id);
        if(!source||!team.players.includes(p.id)||p.name!==source.name||p.year!==source.year||p.baseRating!==source.rating||p.trait!==team.traits[p.id]||!Number.isFinite(p.fatigue)||p.fatigue<0||p.fatigue>fatiguePenalty(p.trait,100)||p.fatigue%(p.trait==='grinder'?4:8)!==0)return false;
      }
      const effects=matchupEffects(board.a.trait,board.b.trait,board.context,board.a.baseRating-board.a.fatigue,board.b.baseRating-board.b.fatigue);
      for(const [p,e] of [[board.a,effects.a],[board.b,effects.b]])if(p.traitBonus!==e.bonus||p.drawShift!==e.draw||p.rating!==p.baseRating-p.fatigue+e.bonus)return false;
      const probabilities=boardProbabilities(board.a.rating,board.b.rating,board.white,effects.a.draw+effects.b.draw);
      return ['win','draw','loss'].every(k=>board.probabilities?.[k]===probabilities[k]);
    });
  }));
}

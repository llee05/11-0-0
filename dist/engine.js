import {TRAIT_RULESET, rollTraits, validTraits, matchContext, validContext, matchupEffects} from './traits.js';
import {PROFILE_RULESET,rollProfiles,validProfiles,validForm,profileFatigue,nextFatigue,validFatigue,styleEffect,performanceSwing,performanceSeed,nextForm,restedForm,FORM_ELO} from './player-profile.js';
// The server supplies a validated, versioned country-year catalogue from SQL.
export let NATIONS=[],PLAYERS=[],OPPONENTS=[],CATALOGUE={release:null};
let playerIndex=new Map(),nationIndex=new Map(),opponentIndex=new Map();
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
}
export const ROUND_COUNT = 11;
export const SAVE_VERSION = 4;
export const RULES_VERSION = `${TRAIT_RULESET}/${PROFILE_RULESET}`;
export const nationById = id => nationIndex.get(id);
export const playerById = id => playerIndex.get(id);
export const average = squad => { const p=squad.filter(Boolean).map(playerById); return p.length ? Math.round(p.reduce((n,p)=>n+p.rating,0)/p.length) : 0; };
export function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed ^ seed >>> 15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export function shuffle(items,rng=Math.random) { const a=[...items]; for(let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export function canDraft(player,squad) {
  if(!player||squad.filter(Boolean).length>=5)return false;
  const used=new Set(squad.filter(Boolean).map(id=>playerById(id)?.personId));
  return !used.has(player.personId);
}
export function createOffer(squad,rng=Math.random) {
  const nations=NATIONS.filter(n=>n.players.some(id=>canDraft(playerById(id),squad)));
  if(!nations.length)return null;
  const nation=nations[Math.floor(rng()*nations.length)];
  // Always reveal the source list's full top five. Ineligible picks are shown
  // disabled by the UI; no lower-ranked player replaces an already drafted person.
  return {nation:nation.id,players:[...nation.players],traits:rollTraits(nation.players.map(playerById),rng),profiles:rollProfiles(nation.players.map(playerById),rng)};
}
export function initialState() { return {version:SAVE_VERSION,rulesVersion:RULES_VERSION,catalogueRelease:CATALOGUE.release,phase:'draft',mode:'classic',squad:[null,null,null,null,null],traits:{},profiles:{},offer:null,rerolls:2,tournament:null,teamName:'The Dream Team'}; }
export function selectPlayer(state,id,slot) {
  const player=playerById(id);
  if(state.phase!=='draft'||!nationById(state.offer?.nation)?.players.includes(id)||!state.offer?.players.includes(id)||!validTraits(state.offer.players,state.offer.traits,playerById)||!validProfiles(state.offer.players,state.offer.profiles,playerById)||!player||!canDraft(player,state.squad)||!Number.isInteger(slot)||slot<0||slot>4||state.squad[slot]) return state;
  return {...state,squad:state.squad.map((p,i)=>i===slot?id:p),traits:{...state.traits,[id]:state.offer.traits[id]},profiles:{...state.profiles,[id]:{...state.offer.profiles[id]}},offer:null};
}
export function sortBoards(squad) { return [...squad.slice(0,4).filter(Boolean).sort((a,b)=>playerById(b).rating-playerById(a).rating),...Array(4-squad.slice(0,4).filter(Boolean).length).fill(null),squad[4]]; }

export function completeDraft(state,rng=Math.random) {
  if(state.phase!=='draft')return state;
  let s=state;
  for(let slot=0;slot<5;slot++){
    if(s.squad[slot])continue;
    const offer=s.offer||createOffer(s.squad,rng);
    if(!offer)throw new Error('No eligible country-year offer.');
    const candidates=offer.players.filter(id=>canDraft(playerById(id),s.squad));
    if(!candidates.length)throw new Error('No eligible player in this offer.');
    const current={...s,offer},id=candidates[Math.floor(rng()*candidates.length)];
    s=selectPlayer(current,id,slot);
    if(s===current)throw new Error('Invalid draft offer.');
  }
  return {...s,squad:sortBoards(s.squad)};
}

// Quick Sim is the same full Olympiad, with drafting and rotations automated.
// Keep the caller's draft untouched until every round has completed.
export function quickSim(state,seed=Date.now()>>>0) {
  if(state.phase!=='draft')return state;
  const s=completeDraft(state,random(seed^0x5153494D));
  let tournament=startTournament(s.squad,s.teamName,seed,s.traits,s.profiles);
  while(tournament.round<ROUND_COUNT)tournament=simulateRound(applyRecommendedLineup(tournament));
  return {...s,phase:'results',tournament};
}

export function startTournament(squad,teamName,seed=Date.now()>>>0,traits=null,profiles=null) {
  if(squad.length!==5||squad.some(id=>!playerById(id))||new Set(squad.map(id=>playerById(id).personId)).size!==5) throw new Error('Complete a valid five-player squad first.');
  const rng=random(seed^0x54524149),lineup=sortBoards(squad);
  const ownTraits=traits===null?rollTraits(lineup.map(playerById),rng):traits;
  if(!validTraits(lineup,ownTraits,playerById))throw new Error('Invalid player traits.');
  const ownProfiles=profiles===null?rollProfiles(lineup.map(playerById),random(seed^0x50524F46)):profiles;
  if(!validProfiles(lineup,ownProfiles,playerById))throw new Error('Invalid player profiles.');
  const make=(id,name,flag,players,assigned,attributes)=>({id,name,flag,rating:average(players.slice(0,4)),players:[...players],lineup:[...players],traits:{...assigned},profiles:structuredClone(attributes),forms:Object.fromEntries(players.map(id=>[id,attributes[id].form])),streaks:Object.fromEntries(players.map(id=>[id,0])),loads:Object.fromEntries(players.map(id=>[id,0])),mp:0,bp:0,w:0,d:0,l:0,history:[]});
  // Use a separate stream for opponents so their rolls never depend on how the
  // caller supplied the user's traits or on later reserve decisions.
  const opponentRng=random(seed^0x41495452),profileRng=random(seed^0x41495052);
  return {seed,round:0,squad:lineup,streaks:Object.fromEntries(squad.map(id=>[id,0])),loads:Object.fromEntries(squad.map(id=>[id,0])),teams:[make('YOU',teamName,'✦',lineup,ownTraits,ownProfiles),...OPPONENTS.map(o=>make(o.id,o.name,o.flag,o.players,rollTraits(o.players.map(playerById),opponentRng),rollProfiles(o.players.map(playerById),profileRng)))],rounds:[]};
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
// Compare every possible reserve over up to three rounds. Future form remains
// unchanged when playing and moves toward neutral when resting; outcomes and
// daily performance are deliberately unknown to the planner.
export function planLineup(team,roundsRemaining=3) {
  const ids=team.players,players=ids.map(playerById),profiles=ids.map(id=>team.profiles[id]);
  const choices=ids.map((reserve,index)=>{
    const lineup=sortBoards([...ids.filter(id=>id!==reserve),reserve]);
    return {reserve,index,lineup};
  }).sort((a,b)=>players[a.index].rating-players[b.index].rating||a.reserve.localeCompare(b.reserve));
  function search(loads,forms,depth) {
    let best=null;
    for(const choice of choices){
      let current=0;
      const futureLoads=[],futureForms=[];
      for(let i=0;i<5;i++){
        const playing=i!==choice.index;
        if(playing)current+=players[i].rating-profileFatigue(team.traits[ids[i]],loads[i])+forms[i]*FORM_ELO;
        futureLoads.push(nextFatigue(loads[i],playing,profiles[i]));
        futureForms.push(playing?forms[i]:restedForm(forms[i]));
      }
      const score=current+(depth>1?search(futureLoads,futureForms,depth-1).score:0);
      if(!best||score>best.score||score===best.score&&current>best.current)best={score,current,lineup:choice.lineup};
    }
    return best;
  }
  return search(ids.map(id=>team.loads[id]),ids.map(id=>team.forms[id]),Math.max(1,Math.min(3,roundsRemaining))).lineup;
}
function prepareRound(tournament) {
  const t=structuredClone(tournament);
  for(const team of t.teams){
    if(team.id==='YOU'){team.lineup=[...t.squad];team.streaks={...t.streaks};team.loads={...t.loads};}
    else {
      team.lineup=planLineup(team,ROUND_COUNT-t.round);
    }
    team.rating=average(team.lineup.slice(0,4));
  }
  return t;
}
export const previewTeams = tournament=>tournament.round>=ROUND_COUNT?structuredClone(tournament.teams):prepareRound(tournament).teams;
export function applyRecommendedLineup(tournament) {
  if(tournament.round>=ROUND_COUNT)return tournament;
  const t=structuredClone(tournament),own=t.teams.find(team=>team.id==='YOU');
  t.squad=planLineup(own,ROUND_COUNT-t.round);own.lineup=[...t.squad];own.rating=average(t.squad.slice(0,4));
  return t;
}
function upcomingMatches(t) {
  const contextRng=random(t.seed^Math.imul(t.round+1,0x9E3779B1));
  return pairTeams(t).map(([aid,bid])=>{
    const a=t.teams.find(x=>x.id===aid),b=t.teams.find(x=>x.id===bid);
    const boards=Array.from({length:4},(_,i)=>{
      const context=matchContext(contextRng),white=(t.round+i)%2===0;
      const player=(team)=>{
        const p=playerById(team.lineup[i]),trait=team.traits[p.id],profile=team.profiles[p.id],form=team.forms[p.id],streak=team.streaks[p.id],fatigueLoad=team.loads[p.id];
        const fatigue=profileFatigue(trait,fatigueLoad),performance=performanceSwing(profile.consistency,random(performanceSeed(t.seed,t.round,team.id,p.id)));
        return {...p,...profile,form,streak,fatigueLoad,baseRating:p.rating,trait,fatigue,performance,formBonus:form*FORM_ELO,rating:p.rating-fatigue+form*FORM_ELO+performance};
      };
      const ap=player(a),bp=player(b),styles={a:styleEffect(ap.style,bp.style,context),b:styleEffect(bp.style,ap.style,context)};
      for(const [p,e] of [[ap,styles.a],[bp,styles.b]]){p.styleBonus=e.bonus;p.rating+=e.bonus;}
      const effects=matchupEffects(ap.trait,bp.trait,context,ap.rating,bp.rating);
      for(const [p,e,se] of [[ap,effects.a,styles.a],[bp,effects.b,styles.b]]){p.traitBonus=e.bonus;p.drawShift=e.draw+se.draw;p.rating+=e.bonus;}
      return {a:ap,b:bp,context,white,probabilities:boardProbabilities(ap.rating,bp.rating,white,ap.drawShift+bp.drawShift)};
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
    for(const board of boards){
      const p=board.probabilities,roll=rng();board.score=roll<p.win?1:roll<p.win+p.draw?0.5:0;
      board.a.afterForm=nextForm(board.a.form,board.score,p.win+p.draw/2);
      board.b.afterForm=nextForm(board.b.form,1-board.score,p.loss+p.draw/2);
      for(const player of [board.a,board.b])player.afterFatigue=nextFatigue(player.fatigueLoad,true,player);
      a.forms[board.a.id]=board.a.afterForm;b.forms[board.b.id]=board.b.afterForm;
    }
    const points=boards.reduce((n,board)=>n+board.score,0);
    const apply=(team,other,pts)=>{team.bp+=pts;team.mp+=pts>2?2:pts===2?1:0;team[pts>2?'w':pts===2?'d':'l']++;team.history.push({opponent:other.id,points:pts});};
    apply(a,b,points);apply(b,a,4-points);matches.push({a:aid,b:bid,points,boards});
  }
  for(const team of t.teams)for(const id of team.players){
    const playing=team.lineup.slice(0,4).includes(id);
    team.streaks[id]=playing?team.streaks[id]+1:0;
    team.loads[id]=nextFatigue(team.loads[id],playing,team.profiles[id]);
    if(!playing)team.forms[id]=restedForm(team.forms[id]);
  }
  t.streaks={...t.teams.find(team=>team.id==='YOU').streaks};
  t.loads={...t.teams.find(team=>team.id==='YOU').loads};
  t.round++; t.rounds.push(matches);return t;
}
export function rotateReserve(tournament,boardIndex) {
  if(!Number.isInteger(boardIndex)||boardIndex<0||boardIndex>3||tournament.round>=11) return tournament;
  const t=structuredClone(tournament);
  [t.squad[boardIndex],t.squad[4]]=[t.squad[4],t.squad[boardIndex]];
  t.squad=sortBoards(t.squad);const own=t.teams.find(x=>x.id==='YOU');own.lineup=[...t.squad];own.rating=average(t.squad.slice(0,4));return t;
}
export function validSave(s) {
  try { return validateSave(s); } catch { return false; }
}
function validateSave(s) {
  if(!s||Object.hasOwn(s,'captain')||s.version!==SAVE_VERSION||s.rulesVersion!==RULES_VERSION||s.catalogueRelease!==CATALOGUE.release||!['draft','tournament','results'].includes(s.phase)||!['classic','expert'].includes(s.mode)||!Array.isArray(s.squad)||s.squad.length!==5||s.squad.some(id=>id!==null&&!playerById(id))||new Set(s.squad.filter(Boolean).map(id=>playerById(id).personId)).size!==s.squad.filter(Boolean).length||!validTraits(s.squad.filter(Boolean),s.traits,playerById)||!validProfiles(s.squad.filter(Boolean),s.profiles,playerById)||!Number.isInteger(s.rerolls)||s.rerolls<0||s.rerolls>2||typeof s.teamName!=='string'||s.teamName.length>30)return false;
  if(s.phase==='draft') {
    const nation=nationById(s.offer?.nation);
    return !s.tournament&&(!s.offer||!!nation&&Array.isArray(s.offer.players)&&s.offer.players.length===5&&s.offer.players.every((id,i)=>id===nation.players[i])&&validTraits(s.offer.players,s.offer.traits,playerById)&&validProfiles(s.offer.players,s.offer.profiles,playerById)&&s.offer.players.some(id=>canDraft(playerById(id),s.squad)));
  }
  const t=s.tournament;
  if(s.offer||s.squad.some(id=>!id)||!t||!Number.isInteger(t.seed)||!Number.isInteger(t.round)||t.round<0||t.round>ROUND_COUNT||(s.phase==='results'?t.round!==ROUND_COUNT:t.round>=ROUND_COUNT)||!Array.isArray(t.teams)||t.teams.length!==32||new Set(t.teams.map(x=>x?.id)).size!==32||!t.teams.some(x=>x.id==='YOU')||OPPONENTS.some(o=>!t.teams.some(x=>x.id===o.id)))return false;
  const same=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
  const streaks=(ids,values)=>values&&Object.keys(values).length===5&&ids.every(id=>Number.isInteger(values[id])&&values[id]>=0&&values[id]<=t.round);
  const loads=(ids,values)=>values&&Object.keys(values).length===5&&ids.every(id=>validFatigue(values[id]));
  if(!Array.isArray(t.squad)||!same([...t.squad].sort(),[...s.squad].sort())||!same(t.squad,sortBoards(t.squad))||!streaks(t.squad,t.streaks)||!loads(t.squad,t.loads))return false;
  for(const team of t.teams){
    const source=opponentIndex.get(team.id),own=team.id==='YOU';
    const canonical=own?sortBoards(s.squad):source?.players;
    if(!canonical||typeof team.name!=='string'||typeof team.flag!=='string'||(own?team.name!==s.teamName||team.flag!=='✦':team.name!==source.name||team.flag!==source.flag)||!Array.isArray(team.players)||!same(team.players,canonical)||!Array.isArray(team.lineup)||!same([...team.lineup].sort(),[...canonical].sort())||!same(team.lineup,sortBoards(team.lineup))||team.rating!==average(team.lineup.slice(0,4))||!validTraits(team.players,team.traits,playerById)||!validProfiles(team.players,team.profiles,playerById)||Object.hasOwn(team,'captain')||!team.forms||Object.keys(team.forms).length!==5||team.players.some(id=>!validForm(team.forms[id]))||!streaks(team.players,team.streaks)||!loads(team.players,team.loads)||!Array.isArray(team.history)||team.history.length!==t.round)return false;
    if(own&&(!same(team.lineup,t.squad)||team.players.some(id=>team.traits[id]!==s.traits[id]||team.streaks[id]!==t.streaks[id]||team.loads[id]!==t.loads[id]||Object.keys(s.profiles[id]).some(k=>s.profiles[id][k]!==team.profiles[id][k]))))return false;
    const opponents=new Set();let mp=0,bp=0,w=0,d=0,l=0;
    for(const h of team.history){
      if(!h||h.opponent===team.id||opponents.has(h.opponent)||!t.teams.some(o=>o.id===h.opponent)||![0,0.5,1,1.5,2,2.5,3,3.5,4].includes(h.points))return false;
      opponents.add(h.opponent);bp+=h.points;mp+=h.points>2?2:h.points===2?1:0;
      if(h.points>2)w++;else if(h.points===2)d++;else l++;
    }
    if(team.mp!==mp||team.bp!==bp||team.w!==w||team.d!==d||team.l!==l)return false;
  }
  if(!Array.isArray(t.rounds)||t.rounds.length!==t.round)return false;
  const tracked=new Map(t.teams.map(team=>[team.id,{forms:Object.fromEntries(team.players.map(id=>[id,team.profiles[id].form])),streaks:Object.fromEntries(team.players.map(id=>[id,0])),loads:Object.fromEntries(team.players.map(id=>[id,0]))}]));
  const roundsValid=t.rounds.every((matches,round)=>Array.isArray(matches)&&matches.length===16&&new Set(matches.flatMap(m=>[m?.a,m?.b])).size===32&&matches.every(m=>{
    const a=t.teams.find(x=>x.id===m?.a),b=t.teams.find(x=>x.id===m?.b);
    if(!a||!b||a===b||!Array.isArray(m.boards)||m.boards.length!==4||m.points!==m.boards.reduce((sum,board)=>sum+board.score,0)||a.history[round].opponent!==b.id||b.history[round].opponent!==a.id||a.history[round].points!==m.points||b.history[round].points!==4-m.points)return false;
    if(new Set(m.boards.map(board=>board.a?.id)).size!==4||new Set(m.boards.map(board=>board.b?.id)).size!==4)return false;
    const lineup=side=>{const ids=m.boards.map(board=>board[side].id),team=side==='a'?a:b;return [...ids,...team.players.filter(id=>!ids.includes(id))];};
    const lineups={a:lineup('a'),b:lineup('b')};
    for(const side of ['a','b'])if(!same(lineups[side],sortBoards(lineups[side])))return false;
    const valid=m.boards.every((board,i)=>{
      if(!validContext(board.context)||board.white!==((round+i)%2===0)||![0,0.5,1].includes(board.score))return false;
      const before={};
      for(const [p,team,side,other] of [[board.a,a,'a',board.b],[board.b,b,'b',board.a]]){
        const source=playerById(p?.id),profile=team.profiles[p?.id],track=tracked.get(team.id);
        if(!source||!team.players.includes(p.id)||p.name!==source.name||p.year!==source.year||p.baseRating!==source.rating||p.trait!==team.traits[p.id]||['captainId','captainBonus','captaincy'].some(key=>Object.hasOwn(p,key))||!['style','stamina','consistency'].every(k=>p[k]===profile[k])||p.form!==track.forms[p.id]||p.streak!==track.streaks[p.id]||p.fatigueLoad!==track.loads[p.id]||p.fatigue!==profileFatigue(p.trait,p.fatigueLoad))return false;
        const style=styleEffect(p.style,other.style,board.context),performance=performanceSwing(p.consistency,random(performanceSeed(t.seed,round,team.id,p.id)));
        if(p.styleBonus!==style.bonus||p.performance!==performance||p.formBonus!==p.form*FORM_ELO)return false;
        before[side]=p.baseRating-p.fatigue+p.formBonus+p.performance+p.styleBonus;
      }
      const effects=matchupEffects(board.a.trait,board.b.trait,board.context,before.a,before.b);
      for(const [p,e,side,other] of [[board.a,effects.a,'a',board.b],[board.b,effects.b,'b',board.a]])if(p.traitBonus!==e.bonus||p.drawShift!==e.draw+styleEffect(p.style,other.style,board.context).draw||p.rating!==before[side]+e.bonus)return false;
      const probabilities=boardProbabilities(board.a.rating,board.b.rating,board.white,board.a.drawShift+board.b.drawShift);
      if(!['win','draw','loss'].every(k=>board.probabilities?.[k]===probabilities[k]))return false;
      for(const [p,team,score,expected] of [[board.a,a,board.score,probabilities.win+probabilities.draw/2],[board.b,b,1-board.score,probabilities.loss+probabilities.draw/2]]){
        if(p.afterForm!==nextForm(p.form,score,expected)||p.afterFatigue!==nextFatigue(p.fatigueLoad,true,team.profiles[p.id]))return false;
        const track=tracked.get(team.id);track.forms[p.id]=p.afterForm;track.streaks[p.id]++;track.loads[p.id]=p.afterFatigue;
      }
      return true;
    });
    for(const [team,side] of [[a,'a'],[b,'b']]){
      const reserve=lineups[side][4],track=tracked.get(team.id);
      track.forms[reserve]=restedForm(track.forms[reserve]);track.streaks[reserve]=0;track.loads[reserve]=nextFatigue(track.loads[reserve],false,team.profiles[reserve]);
    }
    return valid;
  }));
  return roundsValid&&t.teams.every(team=>team.players.every(id=>team.forms[id]===tracked.get(team.id).forms[id]&&team.streaks[id]===tracked.get(team.id).streaks[id]&&team.loads[id]===tracked.get(team.id).loads[id]));
}

// Rank teams from observed country-year editions, rather than inventing peaks.
// A transferred player belongs to the federation of their strongest recorded
// edition; ties prefer the latest year, then stable federation and edition IDs.
const compareEditions=(a,b)=>b.rating-a.rating||b.year-a.year||a.federation.localeCompare(b.federation)||a.id.localeCompare(b.id);

export function buildAllTimeTeams(nations,players){
  const snapshots=new Map(nations.map(n=>[n.id,n]));
  const best=new Map();
  for(const player of players.filter(p=>snapshots.get(p.nation)?.kind!=='legends').sort(compareEditions)){
    if(!best.has(player.personId))best.set(player.personId,player);
  }
  const federations=new Map();
  for(const player of best.values()){
    if(!federations.has(player.federation))federations.set(player.federation,[]);
    federations.get(player.federation).push(player);
  }
  const teams=[];
  for(const [code,pool] of federations){
    pool.sort(compareEditions);
    for(const [index,letter] of ['A','B'].entries()){
      const roster=pool.slice(index*5,index*5+5);
      if(roster.length!==5||roster[0].rating<=2500)continue;
      const nation=snapshots.get(roster[0].nation);
      const boardTotal=roster.slice(0,4).reduce((sum,p)=>sum+p.rating,0);
      teams.push({id:`alltime:${code}:${letter}`,code,division:letter,name:`${nation.name}${letter==='B'?' B':''}`,flag:nation.flag,rating:Math.round(boardTotal/4),boardTotal,players:roster.map(p=>p.id)});
    }
  }
  // Compare the unrounded four-board totals, so display rounding cannot change
  // the cutoff. A and B teams compete for the same places without quotas.
  return teams.sort((a,b)=>b.boardTotal-a.boardTotal||a.id.localeCompare(b.id)).map(({boardTotal,...team})=>team);
}

// Historical estimates become rollable only after every higher-rated possible
// member has a sourced affiliation or an explicit sourced exclusion.
export function buildHistoricalSnapshots(observations, audit){
  const snapshots=[];
  const targets=new Set();
  for(const target of audit.targets){
    const key=`${target.countryCode}-${target.year}`;
    if(targets.has(key))throw new Error('Duplicate historical country target.');
    targets.add(key);
    const list=observations.find(list=>list.players[0]?.sourceMonth===`${target.year}-01`);
    if(!list||list.players.length!==100||new Set(list.players.map(p=>p.sourcePlayerId)).size!==100||list.players.some((p,i)=>p.worldRank!==i+1||!Number.isInteger(p.sourceRating)||i&&p.sourceRating>list.players[i-1].sourceRating))throw new Error(`Missing or invalid top-100 estimate list for ${target.year}`);
    const rows=audit.affiliations.filter(row=>row.year===target.year);
    const evidence=new Map(rows.map(row=>[row.sourcePlayerId,row]));
    if(evidence.size!==rows.length||rows.some(row=>row.countryCode&&row.excludedCountryCodes?.includes(row.countryCode)))throw new Error('Contradictory affiliation evidence.');
    const positive=list.players.filter(player=>evidence.get(player.sourcePlayerId)?.countryCode===target.countryCode);
    if(positive.length<5)throw new Error(`Fewer than five verified players: ${target.countryCode} ${target.year}`);
    const selected=positive.slice(0,5),cutoff=selected.at(-1).worldRank;
    if(new Set(selected.map(p=>p.name.normalize('NFKD').toLowerCase())).size!==5)throw new Error('Ambiguous duplicate historical player names.');
    for(const p of selected){
      const identity=audit.identities?.[p.sourcePlayerId];
      if(identity&&(!identity.personId||!identity.sources?.length||!identity.sources.every(source=>/^https?:\/\//.test(source.url)&&source.note)))throw new Error('Unsourced historical identity link.');
    }
    for(const player of list.players.filter(player=>player.worldRank<=cutoff)){
      const row=evidence.get(player.sourcePlayerId);
      if(!row||!row.sources?.length||!row.sources.every(source=>/^https?:\/\//.test(source.url)&&source.note)||!(row.countryCode||row.excludedCountryCodes?.includes(target.countryCode)))throw new Error(`Unaudited higher-ranked player: ${player.name} (${target.year})`);
    }
    const ratings=list.players.map(p=>p.sourceRating).sort((a,b)=>a-b);
    const country={federation:target.countryCode,year:target.year,listDate:`${target.year}-01-01`,listedPlayerCount:positive.length,players:selected.map((p,i)=>({name:p.name,fideId:null,sourcePlayerId:p.sourcePlayerId,personId:audit.identities?.[p.sourcePlayerId]?.personId||p.sourcePlayerId,rawRating:p.sourceRating,title:null,rank:i+1}))};
    let period=snapshots.find(s=>s.year===target.year);
    if(!period){
      period={year:target.year,source:{type:'historical-estimate',url:list.sourceUrl,archiveUrl:list.sourceUrl,listDate:country.listDate,archiveSha256:list.sourceSha256,notes:['Chessmetrics retrospective estimates, not official FIDE ratings.','Historical country affiliations are reconstructed independently of Olympiad participation. Every player ranked above the fifth country member has an affiliation or explicit exclusion audit.','Some cutoff affiliations infer continuity from surrounding national careers; exact-month registration documents are not claimed. The detailed evidence and qualifications are retained in data/historical-affiliations.json.','Country labels describe documented historical sporting affiliations, rather than invented past FIDE registrations.','The source covers the world top 100. Country top-five completeness is established before that cutoff; lower-rated country players are not counted.']},reference:{top100Ratings:[...ratings].reverse(),top100Median:(ratings[49]+ratings[50])/2},countries:[]};
      snapshots.push(period);
      period.source.notes.push(...(audit.periodNotes?.[target.year]||[]));
    }
    period.countries.push(country);
  }
  return {schemaVersion:1,snapshots};
}

// Mixed-country draft collections. Never infer a federation from a rating list.
export const LEGENDS_POLICY='pre-1927-best-observed-40-v1';
export function selectLegends(observations){
  const best=new Map();
  for(const list of observations){
    if(!/^https?:\/\//.test(list.sourceUrl)||!/^[a-f0-9]{64}$/.test(list.sourceSha256)||!list.players.length||list.players.some((p,i)=>!/^\d{4}-\d{2}$/.test(p.sourceMonth)||Number(p.sourceMonth.slice(0,4))>=1927||p.worldRank!==i+1||!Number.isInteger(p.sourceRating)||i&&p.sourceRating>list.players[i-1].sourceRating)||new Set(list.players.map(p=>p.sourcePlayerId)).size!==list.players.length)throw new Error('Invalid pre-1927 source list.');
    for(const p of list.players){
      const previous=best.get(p.sourcePlayerId);
      if(!previous||p.sourceRating>previous.rawRating||p.sourceRating===previous.rawRating&&p.sourceMonth>previous.sourceMonth)best.set(p.sourcePlayerId,{...p,rawRating:p.sourceRating,source:list.sourceUrl,sha256:list.sourceSha256});
    }
  }
  const selected=[...best.values()].filter(p=>p.rawRating>=2600).sort((a,b)=>b.rawRating-a.rawRating||b.sourceMonth.localeCompare(a.sourceMonth)||a.sourcePlayerId.localeCompare(b.sourcePlayerId)).slice(0,40);
  if(selected.length!==40||new Set(selected.map(p=>p.name.normalize('NFKD').toLowerCase())).size!==40)throw new Error('Legends require forty distinct supported players.');
  return Array.from({length:8},(_,i)=>({id:`LEGENDS-${i+1}`,code:`LEG${i+1}`,name:`Legends ${['I','II','III','IV','V','VI','VII','VIII'][i]}`,players:selected.slice(i*5,i*5+5)}));
}

// Fictional game balance, never a replacement for the published source rating.
export const RATING_RULESET='era-balanced-1';
export const ERA_ADJUSTMENT_CAP=150;
export const ERA_DISCLAIMER='Game ratings are era-balanced for fantasy competition, not estimates of how historical players would perform today. Original source ratings remain visible.';

export function rankEquivalent(rating,source,reference,cap=ERA_ADJUSTMENT_CAP){
  if(!Number.isFinite(rating)||!Number.isFinite(cap)||cap<0||!Array.isArray(source)||!source.length||!Array.isArray(reference)||reference.length<source.length||[...source,...reference].some(n=>!Number.isFinite(n)))throw new Error('Invalid era-rating inputs.');
  const from=[...source].sort((a,b)=>b-a),to=[...reference].sort((a,b)=>b-a),anchors=[];
  for(let i=0;i<from.length;){
    let end=i+1;while(end<from.length&&from[end]===from[i])end++;
    anchors.push({source:from[i],target:to.slice(i,end).reduce((a,b)=>a+b,0)/(end-i)});i=end;
  }
  let target;
  if(rating>=anchors[0].source)target=rating+anchors[0].target-anchors[0].source;
  else if(rating<=anchors.at(-1).source)target=rating+anchors.at(-1).target-anchors.at(-1).source;
  else for(let i=1;i<anchors.length;i++){
    const high=anchors[i-1],low=anchors[i];
    if(rating>=low.source){target=low.target+(high.target-low.target)*(rating-low.source)/(high.source-low.source);break;}
  }
  return Math.round(rating+Math.max(-cap,Math.min(cap,target-rating)));
}

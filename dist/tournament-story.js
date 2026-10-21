// Derive a report from archived scores, independently of the current catalogue.
// Forecast totals describe only the boards actually encountered on this Swiss path.
export function tournamentStory(run){
  const teams=new Map(run.standings.map(t=>[t.id,{id:t.id,name:t.name,flag:t.flag,seedingRating:t.seedingRating,mp:0,bp:0,history:[]}]));
  const players=run.squad.map(p=>({id:p.id,name:p.name,games:0,w:0,d:0,l:0,points:0,expected:0}));
  const byId=new Map(players.map(p=>[p.id,p]));
  const ranks=[];let upset=null,closest=null;
  run.rounds.forEach((round,index)=>{
    for(const m of round.matches)for(const [id,other,points] of [[m.a,m.b,m.points],[m.b,m.a,4-m.points]]){
      const t=teams.get(id);t.mp+=points>2?2:points===2?1:0;t.bp+=points;t.history.push({other,points});
    }
    const rows=[...teams.values()].map(t=>({...t,sb:t.history.reduce((sum,h)=>sum+teams.get(h.other).mp*h.points,0)}))
      .sort((a,b)=>b.mp-a.mp||b.sb-a.sb||b.bp-a.bp||b.seedingRating-a.seedingRating||a.id.localeCompare(b.id));
    ranks.push({round:index+1,rank:rows.findIndex(t=>t.id==='YOU')+1,mp:teams.get('YOU').mp});
    const m=round.match,us=m.a==='YOU',points=us?m.points:4-m.points,opponent=teams.get(us?m.b:m.a);
    if(!closest||Math.abs(points-2)<Math.abs(closest.points-2))closest={round:index+1,points,opponent:opponent.name};
    for(const [boardIndex,b] of m.boards.entries()){
      const own=us?b.a:b.b,other=us?b.b:b.a,score=us?b.score:1-b.score,p=byId.get(own.id);
      const win=us?b.probabilities?.win:b.probabilities?.loss,loss=us?b.probabilities?.loss:b.probabilities?.win,draw=b.probabilities?.draw;
      p.games++;p.points+=score;p[score===1?'w':score===0.5?'d':'l']++;
      // Old reports may omit probabilities. Do not invent historical forecasts.
      if(p.expected!==null&&Number.isFinite(win)&&Number.isFinite(draw))p.expected+=win+draw/2;else p.expected=null;
      if(score===1&&win<loss&&(!upset||win<upset.win))upset={round:index+1,board:boardIndex+1,player:own.name,opponent:other.name,win};
    }
  });
  players.sort((a,b)=>b.points-a.points||b.w-a.w||a.games-b.games||a.name.localeCompare(b.name));
  return {players,ranks,upset,closest};
}

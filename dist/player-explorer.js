// Search canonical people, keeping namesakes separate and all sampled editions.
export const searchText=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function indexPeople(players,nations){
  const snapshots=new Map(nations.map(n=>[n.id,n])),people=new Map();
  for(const p of players){
    if(!people.has(p.personId))people.set(p.personId,{id:p.personId,name:p.name,editions:[],names:new Set()});
    const person=people.get(p.personId);person.editions.push(p);person.names.add(p.name);
  }
  return [...people.values()].map(person=>{
    const editions=[...person.editions].sort((a,b)=>b.year-a.year||b.rating-a.rating||a.id.localeCompare(b.id));
    const terms=[...person.names,...editions.flatMap(p=>[p.year,p.federation||'Legends',snapshots.get(p.nation)?.name||''])];
    return {...person,name:editions[0].name,names:[...person.names],editions,search:searchText(terms.join(' '))};
  }).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function searchPeople(people,{query='',country='',era=''}={}){
  const words=searchText(query).split(' ').filter(Boolean);
  return people.filter(p=>words.every(word=>p.search.includes(word))&&p.editions.some(e=>(!country||e.federation===country)&&(!era||era==='legends'&&e.offerKind==='legends'||era==='historical'&&e.offerKind!=='legends'&&e.year<1971||era==='fide'&&e.year>=1971)));
}

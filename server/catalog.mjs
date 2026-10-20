// Shared SQLite/D1 catalogue logic. No Node or browser APIs in this module.
import {buildAllTimeTeams} from './all-time.mjs';
import identities from '../data/identity-links.json' with {type:'json'};
import legendObservations from '../data/legends-observations.json' with {type:'json'};
import {selectLegends,LEGENDS_POLICY} from './legends.mjs';
export const LEGENDS_DATA=legendObservations;
export const NORMALIZATION = 'source-ratings-v1';
export const CATALOGUE_FORMAT = `country-year-v7-${LEGENDS_POLICY}-raw-alltime-1-identities-${JSON.stringify(identities)}-legends-${JSON.stringify(legendObservations)}`;
export const EXCLUDED_FEDERATIONS = new Set(['FID']);
const historicNames = {CSR:['Czechoslovakia',null],GDR:['East Germany',null],SCG:['Serbia and Montenegro',null],URS:['Soviet Union',null],YUG:['Yugoslavia',null]};
const aliases = {LIB:'LBN',ROM:'ROU',SIN:'SGP',TRI:'TTO'};
const canonicalName = name => name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const displayName = name => name.includes(',') ? name.split(',').slice(1).join(',').trim()+' '+name.split(',')[0].trim() : name;
const flagFor = iso => iso && /^[A-Z]{2}$/.test(iso) ? [...iso].map(c=>String.fromCodePoint(c.charCodeAt(0)+127397)).join('') : '⚑';
const identityByName=new Map(identities.links.flatMap(link=>link.names.map(name=>[canonicalName(name),link])));
function explicitIdentity(player){
  const link=identityByName.get(canonicalName(displayName(player.name)));
  if(!link||player.fideId&&!link.sourceIds.includes(String(player.fideId)))return null;
  return {personId:link.personId,fideId:link.personId.startsWith('fide:')?link.personId.slice(5):null};
}

export function buildSeed(dataset, federations, historic = null, legends = null) {
  const reference = dataset.snapshots.find(s=>s.year===2026);
  if (!reference) throw new Error('The 2026 reference rating list is required.');
  const baseline = reference.reference.top100Median;
  const allPeriods = [...dataset.snapshots, ...(historic?.snapshots || [])];
  const sourceRows=[],periodRows=[],snapshotRows=[],editionRows=[],persons=new Map();
  // Link older records without FIDE IDs to uniquely named later identities.
  const nameIds=new Map();
  for(const s of allPeriods.filter(s=>s.year>=1994))for(const c of s.countries)for(const p of c.players){
    const explicit=explicitIdentity(p),fideId=explicit?explicit.fideId:p.fideId;
    if(!fideId)continue;
    const key=canonicalName(p.name),ids=nameIds.get(key)||new Set();ids.add(String(fideId));nameIds.set(key,ids);
  }
  for(const period of allPeriods){
    const sourceId=`${period.source.type}-${period.year}`;
    sourceRows.push({id:sourceId,kind:period.source.type,url:period.source.archiveUrl||period.source.url,list_date:period.source.listDate,sha256:period.source.archiveSha256,notes:JSON.stringify(period.source.notes||[])});
    const adjustment=0;
    periodRows.push({year:period.year,source_id:sourceId,reference_median:period.reference.top100Median,adjustment});
    for(const country of period.countries){
      if(EXCLUDED_FEDERATIONS.has(country.federation))continue;
      if(country.players.length!==5)throw new Error(`Incomplete top five: ${country.federation} ${period.year}`);
      if(!country.players.some(player=>player.rawRating>=2600))continue;
      const fed=country.federation,info=federations[fed]||federations[aliases[fed]];
      const [countryName,iso]=historicNames[fed]||[info?.name||fed,info?.iso2?.toUpperCase()];
      const snapshotId=`${fed}-${period.year}`;
      snapshotRows.push({id:snapshotId,federation:fed,country_name:countryName,flag:flagFor(iso),year:period.year,listed_count:country.listedPlayerCount,kind:'country',period_label:null});
      let previous=Infinity;
      for(const [index,player] of country.players.entries()){
        if(!Number.isInteger(player.rawRating)||player.rawRating>previous||player.rank!==index+1)throw new Error(`Unordered ratings: ${snapshotId}`);
        previous=player.rawRating;
        const ids=nameIds.get(canonicalName(player.name));
        const explicit=explicitIdentity(player);
        const fideId=explicit?explicit.fideId:period.year>=1994?player.fideId:(ids?.size===1?[...ids][0]:null);
        const personId=explicit?.personId||player.personId||(fideId?`fide:${fideId}`:`historical:${canonicalName(player.name)}`);
        const linked=player.personId?persons.get(personId):null;
        persons.set(personId,{id:personId,fide_id:linked?.fide_id||(fideId?String(fideId):null),name:linked?.name||displayName(player.name)});
        editionRows.push({id:`${snapshotId}:${personId}`,snapshot_id:snapshotId,person_id:personId,rank:player.rank,raw_rating:player.rawRating,rating:player.rawRating,title:player.title||null,edition_year:null,source_id:null});
      }
    }
  }
  const years=[...new Set(snapshotRows.map(s=>s.year))].sort((a,b)=>b-a);
  if(legends){
    const groups=selectLegends(legends),sourcePeople=new Map(allPeriods.flatMap(s=>s.countries.flatMap(c=>c.players.filter(p=>p.sourcePlayerId).map(p=>[p.sourcePlayerId,p.personId||p.sourcePlayerId]))));
    const collectionId='legends-collection';
    sourceRows.push({id:collectionId,kind:'legends-collection',url:'http://www.chessmetrics.com/cm/CM2/HistoricalRatings.asp',list_date:'Before 1927',sha256:'783583e18915c5a357646cd9b12f68eb0eff5bb03046eb84f20715b9b2bd1f97',notes:JSON.stringify(['Fictional mixed-country collections, not historical national teams.','The forty strongest distinct observed Chessmetrics editions from January every two years, 1844–1926, plus June 1859. Sampling can miss stronger career editions.','Each player retains their actual source month. No period federation is inferred.'])});
    periodRows.push({year:1926,source_id:collectionId,reference_median:0,adjustment:0});
    const sources=new Set();
    for(const group of groups){
      snapshotRows.push({id:group.id,federation:group.code,country_name:group.name,flag:'✦',year:1926,listed_count:5,kind:'legends',period_label:'Before 1927'});
      group.players.forEach((p,i)=>{
        const personId=sourcePeople.get(p.sourcePlayerId)||p.sourcePlayerId,sourceId=`legends-${p.sourceMonth}`;
        if(!sources.has(sourceId)){
          sourceRows.push({id:sourceId,kind:'historical-estimate',url:p.source,list_date:p.sourceMonth+'-01',sha256:p.sha256,notes:JSON.stringify(['Chessmetrics retrospective estimate, not an official FIDE rating.','Selected for a mixed-country Legends collection; no national top-five or period federation is asserted.','Source coverage is selective; this is a best observed edition, not a proven career peak.'])});sources.add(sourceId);
        }
        if(!persons.has(personId))persons.set(personId,{id:personId,fide_id:null,name:p.name});
        editionRows.push({id:`${group.id}:${personId}`,snapshot_id:group.id,person_id:personId,rank:i+1,raw_rating:p.rawRating,rating:p.rawRating,title:null,edition_year:Number(p.sourceMonth.slice(0,4)),source_id:sourceId});
      });
    }
  }
  const requestedYears=[...Array.from({length:50},(_,i)=>2026-i*2),1927];
  return {sources:sourceRows,periods:periodRows,snapshots:snapshotRows,people:[...persons.values()],editions:editionRows,metadata:{schemaVersion:2,normalization:NORMALIZATION,minimumTopRating:2600,minimumTopRatingInclusive:true,referenceDate:reference.source.listDate,referenceMedian:baseline,selection:dataset.selection+' Only country-year snapshots with at least one source rating at least 2600 are playable. Pre-FIDE snapshots use labelled Chessmetrics estimates and separately audited historical country affiliations.',years,requestedYears,missingYears:requestedYears.filter(y=>!years.includes(y)),coverageNotes:['Ratings are used exactly as published, without an era adjustment.','Country-year snapshots require at least one player rated at least 2600; their complete top fives are retained.','Before 1971 there were no official FIDE ratings. Historical estimates are labelled separately.','Missing or incomplete country-year records are excluded; no Olympiad roster substitutions are made.','1972 uses the July list and 1974 uses May; other imported FIDE snapshots use January.','Early FIDE archives have incomplete activity flags and women’s coverage. See each source note.','FID represents unaffiliated players, so it is excluded from country rolls.']}};
}

const tableNames={sources:'rating_sources',periods:'rating_periods',snapshots:'country_snapshots',people:'players',editions:'snapshot_players'};
export function seedStatements(seed, release){
  // A catalogue release is replaced atomically by the SQLite transaction/D1
  // batch. Upgrades must not retain stale top-five members or old ratings.
  const statements=['snapshot_players','country_snapshots','players','rating_periods','rating_sources'].map(table=>({sql:`DELETE FROM ${table}`,params:[]}));
  for(const [name,table] of Object.entries(tableNames)){
    const rows=seed[name];
    for(let i=0;i<rows.length;i+=500){
      const chunk=rows.slice(i,i+500),columns=Object.keys(chunk[0]);
      statements.push({sql:`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) SELECT ${columns.map(c=>`json_extract(value, '$.${c}')`).join(',')} FROM json_each(?)`,params:[JSON.stringify(chunk)]});
    }
  }
  statements.push({sql:'INSERT INTO catalogue_metadata (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',params:['catalogue',JSON.stringify({...seed.metadata,release})]});
  return statements;
}

export async function readCatalogue(db){
  const meta=await db.first('SELECT value FROM catalogue_metadata WHERE key=?',['catalogue']);
  if(!meta)throw new Error('The rating catalogue has not been seeded.');
  const metadata=JSON.parse(meta.value);
  const sources=await db.all('SELECT * FROM rating_sources');
  const periods=await db.all('SELECT * FROM rating_periods');
  const snapshots=await db.all('SELECT * FROM country_snapshots ORDER BY year DESC, federation');
  const editions=await db.all('SELECT e.*,p.name,p.fide_id FROM snapshot_players e JOIN players p ON e.person_id=p.id ORDER BY e.snapshot_id,e.rank');
  const sourceMap=new Map(sources.map(s=>[s.id,{id:s.id,kind:s.kind,url:s.url,date:s.list_date,sha256:s.sha256,notes:JSON.parse(s.notes)}]));
  const periodMap=new Map(periods.map(p=>[p.year,p]));
  const nations=snapshots.map(s=>({id:s.id,code:s.federation,name:s.country_name,flag:s.flag,year:s.year,kind:s.kind,periodLabel:s.period_label||String(s.year),listedCount:s.listed_count,adjustment:periodMap.get(s.year).adjustment,source:sourceMap.get(periodMap.get(s.year).source_id),players:[]}));
  const nationMap=new Map(nations.map(n=>[n.id,n]));
  const players=editions.map(e=>{
    const nation=nationMap.get(e.snapshot_id);nation.players.push(e.id);
    const source=sourceMap.get(e.source_id)||nation.source;
    return {id:e.id,personId:e.person_id,fideId:e.fide_id,name:e.name,nation:nation.id,offerKind:nation.kind,federation:nation.kind==='legends'?null:nation.code,flag:nation.flag,year:e.edition_year??nation.year,source,rank:e.rank,rawRating:e.raw_rating,rating:e.rating,estimated:source.kind==='historical-estimate',title:e.title};
  });
  if(nations.some(n=>n.players.length!==5))throw new Error('The database contains an incomplete country snapshot.');
  const opponents=buildAllTimeTeams(nations,players).slice(0,31);
  return {metadata:{...metadata,snapshotCount:nations.length,playerCount:players.length,countryCount:new Set(nations.filter(n=>n.kind==='country').map(n=>n.code)).size,countrySnapshotCount:nations.filter(n=>n.kind==='country').length,legendCount:nations.filter(n=>n.kind==='legends').length,legendPolicy:LEGENDS_POLICY,earliestEditionYear:Math.min(...players.map(p=>p.year)),opponentPolicy:'Best observed source edition per person; federation at that edition; latest year breaks ties. A team = first five, B = next five. Strongest 31 teams by four-board mean; Russia and Soviet Union separate.'},nations,players,opponents};
}

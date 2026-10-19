import {readFileSync,writeFileSync} from 'node:fs';
import {buildHistoricalSnapshots} from '../server/historical.mjs';
const observations=JSON.parse(readFileSync(new URL('../data/historical-observations.json',import.meta.url),'utf8'));
const audit=JSON.parse(readFileSync(new URL('../data/historical-affiliations.json',import.meta.url),'utf8'));
const result=buildHistoricalSnapshots(observations,audit);
writeFileSync(new URL('../data/historical-snapshots.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`Imported ${result.snapshots.reduce((n,s)=>n+s.countries.length,0)} audited historical country snapshots.`);

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const fixtures=[[2004, " 1701991  Aaberg, Anton                         SWE  2383    0  17.01.72       "], [2020, "7500254        Martis, Valentino                                            ARU M             FI,FA,IA,FT,IO,SIAGM 1891  0   20 1986  i   "], [2026, "10500308       Hj, Abd Hamid Ilham                                          BRU M                                2148  6   20 0         "]];
function parse(rows){
  const code=`import json,sys
sys.path.insert(0,sys.argv[1])
from fide_formats import standard_fields
result=[]
for year,line in json.load(sys.stdin):
 try:
  parts=standard_fields(line,year)
  result.append([p.strip() for p in parts] if parts else None)
 except ValueError:
  result.append('invalid')
print(json.dumps(result))`;
  const result=spawnSync('python3',['-B','-c',code,fileURLToPath(new URL('../scripts/ratings/',import.meta.url))],{input:JSON.stringify(rows),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
test('FIDE layouts retain headerless data, overflowing titles and ratings beside unknown birth years',()=>{
  assert.deepEqual(parse(fixtures),[
    ['Aaberg, Anton','SWE','2383','1701991','',''],
    ['Martis, Valentino','ARU','1891','7500254','','i'],
    ['Hj, Abd Hamid Ilham','BRU','2148','10500308','',''],
  ]);
});
test('FIDE layout parsing skips both header styles and rejects malformed source rows',()=>{
  assert.deepEqual(parse([[2002,'  ID_NUMBER NAME TITLE COUNTRY JAN02'],[2008,'ID number Name TitlFed Jan08'],[2026,''],[2026,'invalid row']]),[null,null,null,'invalid']);
});

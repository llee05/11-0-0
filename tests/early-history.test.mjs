import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

function python(code) {
  const result = spawnSync('python3', ['-B', '-c', code, fileURLToPath(new URL('../', import.meta.url))], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
}

test('sparse Chessmetrics research never relaxes the default catalogue parser', () => {
  python(`import importlib.util,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('cm',Path(sys.argv[1])/'scripts/ratings/parse-chessmetrics.py')
cm=importlib.util.module_from_spec(spec);spec.loader.exec_module(cm)
def row(rank,person,rating):
 return f'<TR><TD>#{rank}</TD><TD><A HREF="javascript:LinkPlayer({person});">Player {person}</A></TD><TD>{rating}</TD></TR>'
def data(*rows): return ''.join(rows).encode()
sparse=data(row(1,1,2700),row(2,2,2500))
try: cm.parse(sparse,'1858-01')
except AssertionError: pass
else: raise AssertionError('Sparse table accepted as a published top 100')
result=cm.parse(sparse,'1858-01',expected_count=None)
assert result['researchOnly'] and len(result['players'])==2
assert all(p['federation'] is None for p in result['players'])
assert cm.parse(b'', '1840-01',expected_count=None)['players']==[]
for bad in (data(row(1,1,2700),row(2,1,2500)),data(row(1,1,2500),row(2,2,2700)),data(row(1,1,2700),row(3,2,2500))):
 try: cm.parse(bad,'1858-01',expected_count=None)
 except AssertionError: pass
 else: raise AssertionError('Invalid sparse research table accepted')
full=cm.parse(data(*(row(i,i,2800-i) for i in range(1,101))),'1926-01')
assert 'researchOnly' not in full and full['coverage']=='world-top-100-only'
`);
});

test('Edo research preserves source deviations, zero-game years and alternate entries without assigning countries', () => {
  python(`import importlib.util,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('early',Path(sys.argv[1])/'scripts/research-early-history.py')
early=importlib.util.module_from_spec(spec);spec.loader.exec_module(early)
def row(rank,person,name,rating,deviation,games):
 return f'<tr><td>{rank}</td><td><a href="../players/p{person}.html">{name}</a></td><td>{rating}</td><td>({deviation})</td><td>{games}&nbsp;</td></tr>'
first=row(1,13,'Anderssen, Adolf',2630,44,19)
second=row(2,478,'Anderssen, Adolf (offhand)',2540,46,0)
rows=early.parse_edo((first+second).encode())
assert len(rows)==2 and rows[0]['sourcePlayerId']!=rows[1]['sourcePlayerId']
assert rows[1]['sourceDeviation']==46 and rows[1]['sourceGames']==0
assert all(r['federation'] is None for r in rows)
for bad in (first+row(2,13,'Duplicate',2500,40,1),first+row(3,99,'Gap',2500,40,1),first.replace('(44)','unknown')):
 try: early.parse_edo(bad.encode())
 except AssertionError: pass
 else: raise AssertionError('Invalid Edo research table accepted')
`);
});

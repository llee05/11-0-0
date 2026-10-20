#!/usr/bin/env python3
"""Extract verifiable two-year standard-rating snapshots from original archives.

Use only period-specific federation (historical CSV column 7). Exclude explicit
inactive `i` flags; never infer inactivity from zero games. Retain all sexes and
titles. Resolve rating ties by displayed name then FIDE ID. Federation eligibility
requires five unique listed players. Historic missing flags are reported rather
than reconstructed. No Olympiad participation filter is applied.
"""
import argparse,csv,io,json,zipfile,collections,pathlib,hashlib,re,statistics,urllib.request
from fide_formats import standard_fields
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache-dir',type=pathlib.Path,default=pathlib.Path('.cache/ratings'),help='Directory containing pinned source ZIP files')
parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('data/fide-country-snapshots.json'),help='Output JSON file')
parser.add_argument('--source-manifest',type=pathlib.Path,default=pathlib.Path(__file__).with_name('rating-source-manifest.json'),help='Manifest with exact source URLs, checksums and ZIP members')
parser.add_argument('--download',action='store_true',help='Download source ZIPs missing from cache; every archive is checksum-verified')
args=parser.parse_args()
ROOT=args.cache_dir
SOURCES=json.loads(args.source_manifest.read_text())
YEARS=list(range(1972,2027,2))
PERIODS={year:('197207' if year==1972 else '197405' if year==1974 else f'{year}01') for year in YEARS if year<2002}
HISTORIC='https://www.olimpbase.org/Elo/data/elo1967-2001.zip'

def read_zip(filename):
 expected=SOURCES[filename];target=ROOT/filename
 if not target.exists():
  if not args.download:raise FileNotFoundError(f'{target} is missing; pass --download to fetch the pinned public source')
  ROOT.mkdir(parents=True,exist_ok=True)
  with urllib.request.urlopen(expected['url'],timeout=90) as response:data=response.read()
  if hashlib.sha256(data).hexdigest()!=expected['sha256']:raise ValueError(f'{filename}: downloaded archive checksum differs from pinned manifest')
  target.write_bytes(data)
 data=target.read_bytes();sha=hashlib.sha256(data).hexdigest()
 if sha!=expected['sha256']:raise ValueError(f'{filename}: cached archive checksum differs from pinned manifest')
 z=zipfile.ZipFile(io.BytesIO(data));member=expected['member']
 return z.read(member).decode('cp1252',errors='replace'),sha,member

def entry(name,fed,rating,fide_id,title,flags,original_name=None):
 return {'name':name.strip(),'originalName':(original_name or name).strip(),'federation':fed.strip(),'rawRating':int(rating),'fideId':fide_id.strip() or None,'title':title.strip().upper() or None,'sourceFlags':flags.strip(),'activity':'inactive' if 'i' in flags.lower() else 'listed'}

historic_text,historic_sha,historic_member=read_zip('elo1967-2001.zip')
historic=collections.defaultdict(list)
for row in csv.reader(io.StringIO(historic_text),delimiter=';'):
 if len(row)!=15:raise ValueError(f'Unexpected historical row length {len(row)}')
 period=row[3]
 if period not in PERIODS.values():continue
 if not row[8].isdigit():continue
 historic[period].append(entry(row[1],row[7],row[8],row[4],row[6],row[11],row[2]))

snapshots=[];diagnostics=[]
for year in YEARS:
 if year<2002:
  period=PERIODS[year];entries=historic[period]
  if len(entries)<100:raise ValueError(f'Missing or incomplete historical source period: {period}')
  source={'url':HISTORIC,'archiveUrl':f'https://www.olimpbase.org/Elo/Elo{period}n.html','type':'archived-fide','listDate':f'{period[:4]}-{period[4:]}-01','archiveSha256':historic_sha,'member':historic_member,'period':period,'activityFlagsAvailable':year>=1994,'notes':[]}
  if year==1972:source['notes'].append('The available 1972 archive list is July. Women’s ratings were first computed from 1969–1972 results in this list.')
  if year==1974:source['notes'].append('Earliest 1974 archive list is May. Source archive omits almost all women (one recorded female player).')
  if year<1994:source['notes'].append('This archive does not consistently report activity status; unflagged listed players are retained, and inactivity is not inferred.')
  source['notes'].append('Historic names, FIDE IDs and federations are transcribed source records and may contain omissions or spelling errors.')
 else:
  short=str(year)[2:];filename=f'standard_jan{short}frl.zip' if year>=2014 else f'jan{short}frl.zip';txt,sha,member=read_zip(filename);entries=[]
  for line in txt.splitlines():
   try:parts=standard_fields(line,year)
   except ValueError as error:raise ValueError(f'{filename}: {error}: {line!r}') from error
   if parts is None:continue
   entries.append(entry(*parts))
  source={'url':f'https://ratings.fide.com/download/{filename}','archiveUrl':'https://ratings.fide.com/download_lists.phtml','type':'official-fide','listDate':f'{year}-01-01','archiveSha256':sha,'member':member,'period':f'{year}01','activityFlagsAvailable':True,'notes':[]}
 # Deduplicate ID, or full archived name where IDs do not exist. Retain higher
 # rating if duplicate rows differ. Historical source sometimes has duplicate IDs.
 original_count=len(entries);inactive_count=sum(e['activity']=='inactive' for e in entries)
 entries=[e for e in entries if e['rawRating']>0 and e['activity']!='inactive']
 entries.sort(key=lambda p:(-p['rawRating'],p['name'].casefold(),p['fideId'] or ''))
 unique=[];seen=set();duplicates=[]
 for e in entries:
  identity=('id',e['fideId']) if e['fideId'] else ('name',e['name'].casefold())
  if identity in seen:duplicates.append(e);continue
  seen.add(identity);unique.append(e)
 entries=unique
 countries=collections.defaultdict(list)
 for e in entries:
  if re.fullmatch(r'[A-Z]{3}',e['federation']):countries[e['federation']].append(e)
 eligible=[]
 for fed,players in sorted(countries.items()):
  if len(players)<5:continue
  selected=[dict(p,rank=rank) for rank,p in enumerate(players[:5],1)]
  eligible.append({'federation':fed,'year':year,'listDate':source['listDate'],'players':selected,'listedPlayerCount':len(players)})
 top100=entries[:100]
 snapshots.append({'year':year,'source':source,'reference':{'top100Ratings':[p['rawRating'] for p in top100],'top100Median':statistics.median(p['rawRating'] for p in top100),'top100Mean':statistics.mean(p['rawRating'] for p in top100)},'countries':eligible})
 diagnostics.append({'year':year,'sourcePlayers':original_count,'inactiveRemoved':inactive_count,'duplicatesRemoved':len(duplicates),'duplicateExamples':duplicates[:5],'eligibleFederations':len(eligible),'eligiblePlayers':len(eligible)*5,'unavailableFederations':[{'federation':fed,'listedPlayers':len(ps)} for fed,ps in countries.items() if len(ps)<5]})
result={'schemaVersion':1,'selection':'Five highest standard-rated listed active players by period federation; all sexes/titles; inactive excluded only when source explicitly marks i; rating ties alphabetical then FIDE ID; no Olympiad participation filter.','years':YEARS,'snapshots':snapshots,'diagnostics':diagnostics}
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for s,d in zip(snapshots,diagnostics):
 usa=next((c for c in s['countries'] if c['federation']=='USA'),None)
 print(s['year'],d['eligibleFederations'],s['reference']['top100Median'],[(p['name'],p['rawRating']) for p in usa['players']] if usa else '')
print('Output bytes:',args.output.stat().st_size)

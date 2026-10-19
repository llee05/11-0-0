import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const cache=process.env.RATINGS_CACHE||resolve('.data/rating-archives');
const result=spawnSync('python3',['scripts/ratings/extract-fide.py','--cache-dir',cache,'--output','data/fide-snapshots.json','--source-manifest','data/rating-sources.json','--download'],{stdio:'inherit'});
process.exitCode=result.status??1;

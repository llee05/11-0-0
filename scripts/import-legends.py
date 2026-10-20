#!/usr/bin/env python3
"""Reproduce the pinned pre-1927 observations; changes require explicit checksum review."""
import calendar
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import urllib.request

root = Path(__file__).resolve().parents[1]
path = root / 'data/legends-observations.json'
spec = importlib.util.spec_from_file_location('cm', root / 'scripts/ratings/parse-chessmetrics.py')
cm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cm)
cache = root / '.data/chessmetrics'
cache.mkdir(parents=True, exist_ok=True)
result = []
for source in json.loads(path.read_text()):
    month = source['players'][0]['sourceMonth']
    local = cache / (month + '.html')
    if not local.exists():
        local.write_bytes(urllib.request.urlopen(source['sourceUrl'], timeout=30).read())
    data = local.read_bytes()
    assert hashlib.sha256(data).hexdigest() == source['sourceSha256'], f'Changed source: {month}'
    title = re.search(rb'(?is)<TITLE>(.*?)</TITLE>', data)
    expected = f'Monthly List: {calendar.month_name[int(month[5:])]} {month[:4]} rating list'
    assert title and title[1].decode('cp1252') == expected
    parsed = cm.parse(data, month, expected_count=None)
    parsed.pop('researchOnly')
    parsed['coverage'] = f'published-world-list-{len(parsed["players"])}-rows'
    result.append(parsed)
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Checked {len(result)} pinned pre-1927 rating tables.')

#!/usr/bin/env python3
"""Read pinned local source pages for research; never import players into the game."""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'reports/pre-1927-sources-2026-10-21.json'
spec = importlib.util.spec_from_file_location('chessmetrics', ROOT / 'scripts/ratings/parse-chessmetrics.py')
chessmetrics = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chessmetrics)


def plain(markup):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', markup))).strip()


def parse_edo(data):
    records = []
    for row in re.findall(r'(?is)<tr\b[^>]*>(.*?)</tr>', data.decode('utf-8')):
        cells = re.findall(r'(?is)<td\b[^>]*>(.*?)</td>', row)
        if len(cells) != 5 or not plain(cells[0]).isdigit():
            continue
        player = re.search(r'players/(p\d+)\.html', cells[1])
        if not player:
            continue
        deviation = re.fullmatch(r'\((\d+)\)', plain(cells[3]))
        assert deviation, 'Missing Edo source deviation'
        records.append({
            'sourcePlayerId': 'edo:' + player[1], 'name': plain(cells[1]),
            'worldRank': int(plain(cells[0])), 'sourceRating': int(plain(cells[2])),
            'sourceDeviation': int(deviation[1]), 'sourceGames': int(plain(cells[4])),
            'federation': None,
        })
    assert records, 'Missing Edo ratings table'
    assert [row['worldRank'] for row in records] == list(range(1, len(records) + 1))
    assert len({row['sourcePlayerId'] for row in records}) == len(records)
    assert all(a['sourceRating'] >= b['sourceRating'] for a, b in zip(records, records[1:]))
    return records


def study(source_dir, manifest):
    samples = []
    for source in manifest['sources']:
        data = (source_dir / source['file']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == source['sha256'], f"Changed source: {source['file']}"
        title = re.search(r'(?is)<title>(.*?)</title>', data.decode(source['encoding']))
        assert title and plain(title[1]) == source['title'], f"Wrong source period: {source['file']}"
        if source['kind'] == 'reference':
            continue
        if source['kind'] == 'chessmetrics':
            table = chessmetrics.parse(data, source['period'], expected_count=None)
            assert table['sourceUrl'] == source['url']
            rows = table['players']
        else:
            assert source['kind'] == 'edo'
            rows = parse_edo(data)
        assert len(rows) == source['expectedRows'], f"Changed row count: {source['file']}"
        examples = [row for row in rows if row['sourcePlayerId'] in source.get('exampleIds', [])]
        assert len(examples) == len(source.get('exampleIds', []))
        samples.append({
            'kind': source['kind'], 'period': source['period'], 'sourceUrl': source['url'],
            'sourceSha256': source['sha256'], 'observedSourceRecords': len(rows),
            'recordsAtLeast2600': sum(row['sourceRating'] >= 2600 for row in rows),
            'zeroGameRecords': sum(row.get('sourceGames') == 0 for row in rows) if source['kind'] == 'edo' else None,
            'offhandEntries': [row for row in rows if '(offhand)' in row['name']],
            'leader': rows[0] if rows else None, 'topFive': rows[:5], 'examples': examples,
            'affiliationAuditComplete': False, 'verifiedCountryOfferCount': None,
        })
    return {
        'researchOnly': True, 'gameRulesApplied': False, 'catalogueImported': False,
        'manifestSha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
        'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'chessmetricsParserSha256': hashlib.sha256(Path(spec.origin).read_bytes()).hexdigest(),
        'samples': samples,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = study(args.source_dir, json.loads(MANIFEST.read_text()))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"Checked {len(result['samples'])} pinned research tables; wrote {args.output}")

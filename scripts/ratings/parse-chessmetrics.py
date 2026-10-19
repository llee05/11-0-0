#!/usr/bin/env python3
"""Read original Sonas Chessmetrics monthly rating tables, without inventing federations.

Usage: python parse_chessmetrics.py path/to/source.html 1927-01 > rows.json
Input must be downloaded from the exact sourceUrl emitted below. These are
Chessmetrics estimates, not FIDE ratings. The source lists only world top 100.
"""
import hashlib
import html
import json
import re
import sys
from pathlib import Path


def source_url(month):
    return 'http://www.chessmetrics.com/cm/CM2/SingleMonth.asp?Params=199510SSSSS3S000000' + month.replace('-', '') + '111000000000000010100'


def parse(data, month):
    markup = data.decode('cp1252')
    def plain(value):
        return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', value))).strip()
    records = []
    for row in re.split(r'(?is)<TR\b[^>]*>', markup):
        cells = re.findall(r'(?is)<TD\b[^>]*>(.*?)</TD>', row)
        if len(cells) < 3 or not re.fullmatch(r'#\d+', plain(cells[0])):
            continue
        player = re.search(r'LinkPlayer\((\d+)\);?\W*">(.*?)</A>', cells[1], re.I | re.S)
        if not player:
            continue
        rank = int(plain(cells[0])[1:])
        records.append({'sourcePlayerId': 'chessmetrics:' + player[1], 'name': plain(player[2]), 'sourceRating': int(plain(cells[2])), 'worldRank': rank, 'sourceMonth': month, 'ratingSystem': 'chessmetrics-2005', 'federation': None})
    assert len(records) == 100, f'Expected source top 100, got {len(records)}'
    assert [row['worldRank'] for row in records] == list(range(1, 101))
    assert all(a['sourceRating'] >= b['sourceRating'] for a, b in zip(records, records[1:]))
    return {'sourceUrl': source_url(month), 'sourceSha256': hashlib.sha256(data).hexdigest(), 'coverage': 'world-top-100-only', 'affiliationCoverage': 'none; time-specific federation must be independently verified before creating any roll', 'players': records}


if __name__ == '__main__':
    print(json.dumps(parse(Path(sys.argv[1]).read_bytes(), sys.argv[2]), ensure_ascii=False, indent=2))

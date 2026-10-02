"""Validate curated French words against the official Morphalou 3.1 CSV archive.
Usage: python3 tools/prepare_french.py /path/to/Morphalou3.1_formatCSV.zip /path/to/territories.json /path/to/places.json
The final JSON decks remain independently editable. See data/fr/SOURCES.md.
"""
import csv, hashlib, io, json, pathlib, sys, unicodedata, zipfile
from french_candidates import CANDIDATES, PLACES
root = pathlib.Path(__file__).resolve().parents[1]
NOTICE = 'Morphalou 3.1, ATILF CNRS (2016), LGPL-LR. Modified for Pyramid on 2026-10-02: selection, classification and deduplication; no warranty. Place names: Unicode CLDR, copyright Unicode, Inc., Unicode License V3; Wikidata, CC0. See SOURCES.md and included licenses.'
index = {}
with zipfile.ZipFile(sys.argv[1]) as archive:
    for filename in archive.namelist():
        if not filename.endswith('.csv'):
            continue
        with io.TextIOWrapper(archive.open(filename), encoding='utf-8-sig') as stream:
            for row in csv.reader(stream, delimiter=';'):
                if len(row) > 8 and row[1].isdigit() and row[0]:
                    index.setdefault(unicodedata.normalize('NFC', row[0]), []).append({'id': row[1], 'partOfSpeech': row[2]})
territories = json.loads(pathlib.Path(sys.argv[2]).read_text())['main']['fr']['localeDisplayNames']['territories']
place_evidence = {name: {'source':'Unicode CLDR', 'code':code} for code,name in territories.items() if code not in ['ZZ'] and '-alt-' not in code}
entities = json.loads(pathlib.Path(sys.argv[3]).read_text())['entities']
cities = {}
for qid, entity in entities.items():
    label = entity.get('labels',{}).get('fr',{}).get('value','')
    if label in {'Paris','Copenhague','Nîmes','Lyon','Nantes','Macao','Strasbourg','Malaga','Cambridge','Bucarest'}: cities[label] = {'source':'Wikidata', 'id':qid}
evidence = {}; decks = {}; missing = {}
for category, candidates in CANDIDATES.items():
    words = set(); missing[category] = []
    for candidate in candidates.split():
        word = unicodedata.normalize('NFC', candidate)
        if word in index:
            words.add(word); evidence[word] = {'source':'Morphalou 3.1', 'entries':index[word]}
        else: missing[category].append(word)
    decks[category] = sorted(words)
for word in PLACES:
    if word in place_evidence:
        decks['geography'].append(word); evidence[word] = place_evidence[word]
    else: missing['geography'].append(word)
for word, entry in cities.items():
    decks['geography'].append(word); evidence[word] = entry
# Global covers all ordinary vocabulary while proper place names stay in Geography.
decks['global'] = sorted({w for words in decks.values() for w in words if w == w.lower()})
assert all(entry.get('source') == 'Morphalou 3.1' for word,entry in evidence.items() if word == word.lower())
for category, words in decks.items():
    words = sorted({w.casefold():w for w in sorted(set(words), reverse=True)}.values(), key=str.casefold)
    assert len(words) >= 110, f'{category}: too few words for 10 players, 9 turns + 2 Jokers'
    assert all(not any(c.isspace() for c in w) for w in words)
    (root/'data/fr'/f'{category}.json').write_text(json.dumps({'notice': NOTICE, 'words': words}, ensure_ascii=False, indent=2)+'\n')
    print(category, len(words))
(root/'data/fr/morphalou-evidence.json').write_text(json.dumps({'notice': NOTICE, 'archiveSHA256': hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(), 'entries': evidence}, ensure_ascii=False, indent=2)+'\n')
print('Unmatched candidates (excluded):', json.dumps(missing, ensure_ascii=False))

"""After editing local JSON decks, rebuild both file-friendly browser bundles."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
for language, folder, global_name in [('en', root/'data', 'PyramidWords'), ('fr', root/'data/fr', 'PyramidWordsFr')]:
    decks = {}
    for name in ('global', 'food', 'animals', 'geography', 'body', 'kids', 'teens'):
        source = json.loads((folder/f'{name}.json').read_text())
        words = source.get('words') if isinstance(source, dict) else source
        if not isinstance(words, list) or not all(isinstance(word, str) and word.strip() for word in words):
            raise ValueError(f'{language}/{name} must contain non-empty word strings')
        unique = {}
        for word in words:
            unique.setdefault(word.strip().casefold(), word.strip())
        decks[name] = list(unique.values())
        if len(decks[name]) < 110:
            raise ValueError(f'{language}/{name} needs 110 unique words for 10 players, 9 turns, and 2 Jokers')
    # Global combines common words; proper place names stay in Geography.
    global_words = {}
    for words in decks.values():
        for word in words:
            if word == word.lower():
                global_words.setdefault(word.casefold(), word)
    decks['global'] = sorted(global_words.values(), key=str.casefold)
    global_source = json.loads((folder/'global.json').read_text())
    if isinstance(global_source, dict): global_source['words'] = decks['global']
    else: global_source = decks['global']
    (folder/'global.json').write_text(json.dumps(global_source, indent=2, ensure_ascii=False)+'\n')
    notice = ('Princeton WordNet 3.0; see WORDNET-LICENSE.txt and SOURCES.md.' if language == 'en' else
              'Modified Morphalou 3.1 selections, 2026-10-02, ATILF CNRS; LGPL-LR.\n// Place names: Unicode CLDR (Unicode License V3) and Wikidata (CC0).\n// See SOURCES.md and included licenses. Editable source: the seven neighboring JSON files.')
    (folder/'words.js').write_text('// Generated from the neighboring JSON decks.\n// '+notice+'\nwindow.'+global_name+' = '+json.dumps(decks, ensure_ascii=False)+';\n')
    print(language, {name:len(words) for name,words in decks.items()})

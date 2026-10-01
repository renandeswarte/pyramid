"""After editing data/*.json, rebuild the file-friendly browser word bundle."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
decks = {}
for name in ('global', 'food', 'animals', 'geography', 'body', 'kids', 'teens'):
    words = json.loads((root / 'data' / f'{name}.json').read_text())
    if not isinstance(words, list) or not all(isinstance(word, str) and word.strip() for word in words):
        raise ValueError(f'{name}.json must contain an array of non-empty word strings')
    unique = {}
    for word in words:
        unique.setdefault(word.strip().lower(), word.strip())
    decks[name] = list(unique.values())
    if len(decks[name]) < 100:
        raise ValueError(f'{name} needs at least 100 unique words for 10 players, 9 turns, and their Jokers')

# Global merges common words, excluding capitalized proper place names.
global_words = {}
for words in decks.values():
    for word in words:
        if word == word.lower():
            global_words.setdefault(word.lower(), word)
decks['global'] = sorted(global_words.values(), key=str.lower)
(root / 'data' / 'global.json').write_text(json.dumps(decks['global'], indent=2, ensure_ascii=False) + '\n')
(root / 'data' / 'words.js').write_text('// Generated from the neighboring JSON decks.\n// Princeton WordNet 3.0; see WORDNET-LICENSE.txt and SOURCES.md.\nwindow.PyramidWords = ' + json.dumps(decks, ensure_ascii=False) + ';\n')
print('Updated all seven browser decks from local JSON files.')

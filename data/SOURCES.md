# English word sources

The word lists are curated from and verified against the official Princeton WordNet 3.0 English lexical database, downloaded from:

https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz

WordNet is an authoritative lexical database, rather than a conventional general-purpose dictionary. No claim is made that its categories or age levels are official dictionary classifications.

Citation: Princeton University. “About WordNet.” WordNet. Princeton University, 2010. https://wordnet.princeton.edu/

WordNet 3.0 Copyright 2006 by Princeton University. The complete redistribution license is included in `WORDNET-LICENSE.txt`.

## Selection

- Candidate entries were selected for everyday familiarity and suitability for spoken clues. Rare technical vocabulary, surnames, and personal names were excluded.
- Every bundled entry is checked for membership in the official WordNet index. The lemma, part of speech, and one source synset offset are recorded in `wordnet-evidence.json`.
- Geography deliberately permits English place names. Other categories use ordinary English words. Some established English words have borrowed origins, such as sushi; these are standard English dictionary entries.
- Kids is an editorial selection of familiar words for ages 11 and under. Teens includes everyday and school-level vocabulary for ages 12 and up. These are suggestions, not assessed reading-age ratings.
- Global combines ordinary English words across categories with additional everyday nouns, verbs, adjectives and adverbs. Country, city and other proper place names remain in Geography only. The preparation and bundling scripts exclude capitalized proper-name candidates from Global. Words for landscapes and places in general, such as mountain or village, remain suitable for Global. Some words also serve as prepositions or conjunctions in ordinary usage (such as before, after and however); WordNet indexes their noun, verb, adjective or adverb senses rather than grammatical function words as a separate category.
- Overlap between categories is expected; the game deduplicates case-insensitively and never reuses a drawn word in the same game.
- Only words are bundled; dictionary definitions and example sentences are not copied.

## Local files

Each category has a JSON array. `words.js` bundles exactly those arrays into one classic browser script, allowing the app to work when `index.html` is opened directly, without fetching files or requiring modules.

To reproduce the data, run `python3 tools/prepare_words.py /path/to/WordNet-3.0.tar.gz`, then `python3 tools/bundle_words.py`. Editorial candidates are in `tools/prepare_words.py` and `tools/extra_words.py`; `tools/word_exclusions.py` records the playability review. Additions cover ingredients and cooking, species and habitats, landscapes and English place names, anatomy and everyday health, familiar childhood vocabulary, school and teenage interests, and general actions and descriptions. The app itself needs no network or dictionary API.

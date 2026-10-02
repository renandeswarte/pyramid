const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sandbox = { window: {} };
for (const file of ['i18n.js', 'data/words.js', 'data/fr/words.js']) vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
const messages = sandbox.window.PyramidI18n;
const placeholders = text => [...new Set(text.match(/\{\w+\}/g) || [])].sort();
for (const [key, value] of Object.entries(messages.fr)) {
  assert.deepEqual(placeholders(value), placeholders(messages.en[key] || key), `Message variables: ${key}`);
  assert.equal(messages.text('fr', key, {n:3}).includes('{n}'), false, `Unexpanded number: ${key}`);
}
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'data/fr/morphalou-evidence.json'))).entries;
const categories = ['global','food','animals','geography','body','kids','teens'];
for (const language of ['en','fr']) {
  const base = language === 'fr' ? 'data/fr' : 'data';
  const bundle = sandbox.window[language === 'fr' ? 'PyramidWordsFr' : 'PyramidWords'];
  for (const category of categories) {
    const source = JSON.parse(fs.readFileSync(path.join(root, base, category + '.json')));
    const words = Array.isArray(source) ? source : source.words;
    if (language === 'fr') assert(source.notice.includes('LGPL-LR'), 'French source notice missing');
    assert.deepEqual(JSON.parse(JSON.stringify(bundle[category])), words, `Bundle differs: ${language}/${category}`);
    assert(words.length >= 72, 'Enough words for 8 players, seven turns, two Jokers');
    assert.equal(new Set(words.map(w => w.toLowerCase())).size, words.length, 'No case-insensitive duplicates');
    if (language === 'fr') for (const word of words) {
      assert.equal(word, word.normalize('NFC'), 'Preserve normalized accents');
      assert(!/\s/.test(word), 'Single-word targets');
      assert(evidence[word], `Missing source: ${word}`);
      if (category !== 'geography') assert.equal(word, word.toLowerCase(), `Proper place in ${category}: ${word}`);
      if (word === word.toLowerCase()) assert.equal(evidence[word].source, 'Morphalou 3.1');
    }
  }
}
console.log(`Verified ${Object.keys(messages.fr).length} French messages and all 14 decks, including source evidence and offline bundles.`);

# Pyramid

A responsive, shared-device oral word game. Plain HTML, CSS, JavaScript, and local English word files. No database, account, framework, external fonts, or runtime dependencies.

## Open locally

Open `index.html` directly for ordinary gameplay, or serve this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173. Installation and offline caching need localhost or HTTPS; the normal game also works with a file URL.

## Rules

- 2–10 players; defaults are Renan, Valerie, Thomas, and Chloe.
- Setup moves through five screens: Players → Words → Time → Jokers → Length. Short games and the six-turn Classic game are available. Each player gets three starting blue bricks per telling turn and 0, 1, or 2 Jokers per game (one by default).
- For two players choose 1, 3 or 6 turns per role; for three choose 2, 4 or 6; for four choose 3 or 6. Larger groups can choose six turns or a full round robin of `players − 1` turns. Six-turn Classic starts with 18 bricks; the shortest two-, three- and four-player games start with 3, 6 and 9 respectively.
- One turn is one word. Bet 1–3 bricks before the 30- or 60-second betting deadline (30 seconds by default). The full bet is committed with no refund for an early success.
- Each brick buys one spoken clue word and one spoken guess. The teller records each attempt as Correct or Incorrect. Each clue-and-guess attempt gets a fresh 30- or 60-second timer. Expiry acts as Incorrect and advances to the next attempt, or ends the word if none remain. No extra bricks are charged.
- A correct guess gives one guessing point to the guesser and one telling point to the teller.
- A betting timeout spends three bricks, loses the turn, and gives neither player a success point. It still counts as one telling and one guessing turn.
- The Joker replaces a word before betting and never restarts the timer. Replaced words remain used.
- After the player's final telling turn, leftover bricks become bonus points added to their guessing score. Each unused Joker awards one bonus point. Both Jokers may be used on the same word before betting. The leaderboard shows all components separately.
- All players with the highest total share the victory. Play again resets scores and the used-word pool.

## Balanced partners

The schedule has one cycle per chosen turn. Every cycle assigns each player exactly one telling and one guessing turn. A randomized player ring and shuffled cyclic offsets produce partner counts that differ by at most one. Pairings are exactly equal when turns per player are a multiple of `players − 1`. Every offered length for two, three and four players satisfies that condition. The shortest exact game has 1, 2 or 3 turns per role respectively. No player guesses their own word. Consecutive telling turns have different partners whenever there are at least three players.

Two-player games skip the guesser animation and go straight to the partner confirmation. The selection animation reveals the prepared balanced schedule; it does not make independent, potentially unfair random draws.

## Game screens and motion

The interface uses an immersive dark game stage, blue gem resources, a step-by-step setup, and three-second player reveals with orbiting spotlights and animated player cards. Screen changes, word swaps, scores and winners have restrained transitions. Phone setup controls stay available at the bottom of the screen. Reduced-motion preferences disable CSS motion and slow the changing names; sound can be muted independently.

The stage follows the usable browser height and installed-app safe areas. Setup cards, player selections, handoffs, word screens, recaps, and score rows use spare vertical space when available. Spacing is recalculated from the content after resizing and stays compact during keyboard entry. Short landscape windows arrange the content in two columns. Setup and normal gameplay fit without scrolling the page; if the on-screen keyboard reduces name-entry space, only the name panel scrolls. Longer targets scale to stay readable on one line. Groups larger than four use leaderboard pages, with champions marked beside their names. Word history and help open in a bounded dialog with its close button kept visible.

## Privacy and persistence

Session storage protects progress against refresh in the same tab. It does not synchronize devices. Closing the tab can discard progress depending on browser behavior. On refresh or when returning after switching apps, an active word is covered. Betting and guessing deadlines continue to run while hidden; using a Joker, opening help, and switching tabs never pause them. Expired guessing attempts are processed on return. Existing saved games retain their one-Joker allowance; an active guessing attempt gets its first timer when upgraded.

The app sends no gameplay data anywhere. A hosting provider still receives ordinary requests for static files.

## Files

- `index.html`, `styles.css`, `app.js`: screens, presentation, timer, audio, and interactions.
- `engine.js`: game rules and balanced scheduling, independent of the interface.
- `data/*.json`: seven editable English decks; `data/words.js` is their browser bundle.
- `data/SOURCES.md`, `data/WORDNET-LICENSE.txt`, `data/wordnet-evidence.json`: provenance and attribution.
- `assets/`: favicon and app icons.
- `manifest.webmanifest`, `sw.js`: install metadata and offline caching.
- `tools/`: reproducible word preparation, icon generation, and rule verification.

## Verify the rules

```sh
node tools/verify-game.cjs
```

Browser verification also covers complete games, betting expiry, refresh privacy, responsive layouts, and offline reload. When updating cached assets for a future release, change the cache version in `sw.js`.

## Edit word files

Edit a category JSON file, then run `python3 tools/bundle_words.py` to refresh the browser bundle. Global combines ordinary words from all categories and its own general vocabulary, including actions and descriptive words. Capitalized proper place names are excluded from Global and remain in Geography. Preserve capitalization for proper place names when editing Geography. Added entries should be checked against an authoritative English dictionary and their source recorded. The app does not contact a dictionary service.

An optional read-only WebMCP scoreboard tool is feature-detected for supporting browsers. It reveals no target words or future turns. Registration, a valid read, and invalid-input rejection were verified in the native Codex preview; ordinary gameplay does not depend on this proposed API.

## GitHub Pages

The public game address is https://renandeswarte.github.io/pyramid/. The source repository is https://github.com/renandeswarte/pyramid.

Pages publishes the `main` branch from `/(root)`. Push changes to `main` to update the game. No build step is required; `.nojekyll` tells Pages to serve the static files directly. All asset paths are relative so the `/pyramid/` subfolder works. ZIP downloads, test screenshots, local browser profiles, and Python cache files are excluded from Git.

On iPhone or iPad, open the game in Safari and choose Share → Add to Home Screen for standalone app mode. Offline play becomes available after the first successful load and caching. When changing app assets, bump the cache version in `sw.js` so installed copies receive the update.

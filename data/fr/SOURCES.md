# Sources des mots français / French word sources

Les sept listes françaises sont une sélection originale pour Pyramid, composée en français et vérifiée dans des sources françaises. Elles ne sont pas des traductions des listes anglaises. Les thèmes et les niveaux d’âge sont des choix éditoriaux, sans classement officiel de difficulté.

## Morphalou 3.1 — ATILF CNRS

Source : Analyse et traitement informatique de la langue française (ATILF, UMR 7118, CNRS / Université de Lorraine), **Morphalou 3.1**, lexique morphologique ouvert du français, version juin 2016. Travail réalisé par Marie Tonnelier dans le cadre du projet ORTOLANG. ORTOLANG bénéficie d’une aide de l’État au titre du programme « Investissements d’avenir » ANR–11–EQPX–0032.

- Ressource officielle : https://www.ortolang.fr/market/lexicons/morphalou
- Archive utilisée : https://repository.ortolang.fr/api/content/morphalou/latest/Morphalou3.1_formatCSV.zip
- Documentation : https://repository.ortolang.fr/api/content/morphalou/latest/LISEZ-MOI.html
- Licence intégrale jointe : [MORPHALOU-LICENSE.txt](MORPHALOU-LICENSE.txt), Lesser General Public License for Linguistic Resources (LGPL-LR).

**Avis de modification, 2 octobre 2026 :** les fichiers `global.json`, `food.json`, `animals.json`, `geography.json`, `body.json`, `kids.json`, `teens.json` et leur compilation `words.js` constituent une sélection modifiée pour Pyramid. Les entrées ont été filtrées, dédupliquées et classées par thème et public. Les informations grammaticales, phonétiques et les formes fléchies non retenues ont été retirées. Les sélections françaises dérivées de Morphalou sont redistribuées sous LGPL-LR, sans garantie. Aucune définition ni phrase d’exemple n’est reproduite.

Chaque mot ordinaire retenu correspond à une entrée de Morphalou. `morphalou-evidence.json` conserve l’identifiant et la catégorie grammaticale de cette entrée, ainsi que l’empreinte SHA-256 de l’archive. Les fichiers JSON ci-dessus sont la forme source lisible et modifiable de la ressource utilisée : chaque fichier porte un avis de licence et de modification (`notice`) et sa liste éditable (`words`). Modifier ces listes et lancer `python3 tools/bundle_words.py` reconstruit le fichier utilisé par l’app. La ressource peut être remplacée par une version modifiée conservant le même format. Le code de l’app est fourni séparément dans le dépôt et permet ces modifications.

## Noms de lieux

Les noms propres restent exclusivement dans Géographie.

- Pays, territoires et continents : [Unicode CLDR, libellés français](https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-localenames-full/main/fr/territories.json). Copyright Unicode, Inc. ; [Unicode License V3](UNICODE-LICENSE.txt) jointe. Les codes CLDR retenus sont dans le fichier d’éléments probants.
- Villes : libellés français de Wikidata, sous [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing). Les identifiants d’entité figurent dans `morphalou-evidence.json`. Seules les villes explicitement relues sont retenues.

Ces noms sont ajoutés à la sélection de vocabulaire géographique. Les noms composés de plusieurs mots sont exclus pour respecter le format du jeu.

## Choix éditoriaux

- Vocabulaire courant pour des francophones ; accents et ligatures conservés.
- Verbes généralement à l’infinitif ; pas de remplissage par conjugaisons ou pluriels.
- Cuisine : ingrédients, spécialités familières, ustensiles et gestes culinaires.
- Animaux : espèces familières, habitats, comportements et vocabulaire animalier.
- Corps humain : anatomie courante, sensations, santé et gestes du quotidien.
- Enfants : objets, actions, animaux et mots familiers pour les 11 ans et moins.
- Ados : vie scolaire, loisirs, sciences, culture, sport et numérique.
- Général : tous les mots ordinaires des thèmes, complétés par des noms, verbes, adjectifs, adverbes et mots grammaticaux. Aucun nom propre de lieu.
- Les mots peuvent appartenir à plusieurs thèmes. Le moteur évite toute répétition pendant une partie, y compris les mots remplacés par un Joker.

## Reproduction

`tools/french_candidates.py` contient la sélection initiale indépendante. `tools/prepare_french.py` vérifie cette sélection contre l’archive CSV officielle de Morphalou et les libellés des sources de lieux. Les entrées non reconnues sont signalées et exclues. `tools/bundle_words.py` compile les listes JSON finales. La langue des mots est enregistrée au début de chaque partie ; changer la langue de l’interface ne modifie jamais un paquet déjà en cours.

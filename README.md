# The Lord of the Rings TCG — Digital Edition

Adaptation digitale du jeu de cartes à collectionner **The Lord of the Rings Trading Card Game** (LOTR TCG), conçu à l’origine par **Decipher**.

L’objectif est une expérience **fidèle aux règles du jeu sur table**, avec une interface pensée pour le confort des joueurs : clarté des phases, feedback immédiat, et fluidité des interactions.

> Version actuelle : `0.1.0-alpha.1` — prototype jouable en multijoueur local / réseau.

---

## Fonctionnalités

- Cycle de tour complet (Fellowship → Shadow → Maneuver → Archery → Assignment → Skirmish → Regroup)
- Setup : enchères de fardeaux, choix du premier joueur, sites, mulligan
- Plateau interactif (drag-and-drop, aperçus de cartes, bannières de phase)
- Multijoueur 2 joueurs via `boardgame.io` (Socket.IO)
- Base de cartes issue des données communautaires LOTR TCG

---

## Stack

| Couche | Technologie |
|--------|-------------|
| UI | React 19, TypeScript, styled-components |
| Build | Vite |
| Moteur de jeu | [boardgame.io](https://boardgame.io/) |
| Serveur | Node.js (`tsx`) |

---

## Démarrage rapide

Prérequis : Node.js (LTS recommandé) et npm.

```bash
npm install
```

### Client (interface)

```bash
npm run dev
```

Ouvre l’URL affichée par Vite (souvent `http://localhost:5173`).

Pour y accéder depuis un autre appareil sur le même Wi‑Fi :

```bash
npm run dev -- --host
```

### Serveur multijoueur

Dans un second terminal :

```bash
npm run server
```

Le serveur écoute par défaut sur le port **8000**.

Pour une partie à deux joueurs, ouvre deux onglets / navigateurs avec les paramètres de joueur attendus par l’app (ex. `?player=0` et `?player=1`).

### Build de production

```bash
npm run build
npm run preview
```

---

## Données de cartes

Les cartes sont chargées depuis des JSON dérivés du CSV de l'ancien jeu officiel : The Lord of The Rings TCG Online.

- Source : [lotro_card_data.csv](https://files.lotrtcgpc.net/digital_play/lotro_card_data.csv) → `src/lotro_card_data.csv`
- Sortie : `src/data/cards.json` et `src/data/sites.json`

Depuis la **racine du repo** (pas depuis `src/`) :

```bash
npm run convert
```

Équivalent : `npx tsx scripts/convert/index.ts`.

L’ancien `node ../scripts/convert/index.ts` (lancé depuis `src/`) ne marche plus : les chemins du script sont relatifs à la racine.

---

## Conformité aux règles

Ce projet vise une **conformité stricte** avec les règles officielles du LOTR TCG Decipher. En cas d’ambiguïté ou d’écart constaté, la règle papier fait foi et doit être corrigée dans le code.

---

## Licence & crédits

- **Jeu original** : The Lord of the Rings TCG — Decipher Entertainment
- **Univers** : d’après l’œuvre de J.R.R. Tolkien
- Ce dépôt est une adaptation **non officielle / fan project** à des fins de jeu et d’apprentissage

---

## Statut

Projet en **alpha** : le cœur du cycle de jeu est en place ; certaines briques (conditions de victoire, événements, constructeur de deck, lobby, etc.) restent à compléter.

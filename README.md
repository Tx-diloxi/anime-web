# anime-web

Site de streaming d'animes en français (VOSTFR et VF), construit avec TanStack Start. Le catalogue et les lecteurs vidéo proviennent d'anime-sama.to, récupérés côté serveur par scraping : il n'existe pas d'API officielle, donc le site peut casser si la source change.

## Fonctionnalités

- Accueil avec tendances, animes en français et grands classiques
- Catalogue paginé et recherche (avec repli sur AniList pour deviner les slugs)
- Fiche d'un anime : synopsis, saisons, épisodes
- Lecture en VOSTFR ou VF
- Sélecteur de lecteurs : tous les lecteurs d'un épisode sont proposés, et le site bascule sur le suivant si un lecteur échoue
- Bibliothèque : favoris et reprise de lecture, stockés dans le navigateur

## Lecteurs vidéo

| Lecteur | Traitement |
|---|---|
| Sibnet | flux MP4 direct, via le proxy du site |
| ansembed, vidmoly, vidspeed | flux HLS direct, via le proxy du site |
| Sendvid | flux MP4 direct ; les vidéos supprimées (404) sont masquées |
| embed4me et autres | affichés dans une iframe (« intégré ») |

Les flux directs sont vérifiés avant d'être proposés et passent par `/api/proxy`, qui ajoute le `Referer` exigé par les hébergeurs. Un lecteur qui ne peut pas être résolu en flux direct est proposé en iframe, sans enregistrement de la progression.

## Prérequis

- Node.js 22 ou plus récent
- npm

## Démarrage

```bash
npm install
npm run dev
```

Le site est servi sur http://localhost:8082.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement (port 8082) |
| `npm run build` | build de production |
| `npm run preview` | prévisualisation du build |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Structure

```
src/
  routes/                pages et route proxy (/api/proxy)
  components/            composants, dont le lecteur vidéo (video-player.tsx)
  lib/anime/
    anime-sama.server.ts scraping et résolution des lecteurs (serveur uniquement)
    functions.ts         fonctions serveur appelées par les pages
    library-store.ts     favoris et progression (zustand)
```

## Technologies

TanStack Start, TanStack Router et Query, React 19, Tailwind CSS 4, Radix UI, hls.js, Zustand, Nitro (déploiement Vercel).

## Avertissement

Ce projet n'héberge aucun contenu vidéo. Il relaie des liens publiés par des sites tiers, dont l'accès et la légalité dépendent de ta juridiction. Utilise-le à tes risques.

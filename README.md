# Poker Asso

Application pour organiser des tournois de poker associatifs avec deux interfaces :

- **Contrôle** (téléphone / PC) : niveaux, timer, joueurs, prize pool
- **Affichage** (TV / grand écran) : timer, blinds, stats en direct

## Lancer en local

```bash
cd poker-asso
npm install
cd server && npm install && cd ..

# Terminal 1 — serveur de sync
npm run sync-server

# Terminal 2 — application (copiez .env.example vers .env d’abord)
npm start
```

Créez un fichier `.env` à partir de `.env.example` :

```env
EXPO_PUBLIC_SYNC_URL=http://VOTRE_IP_LOCALE:3001
EXPO_PUBLIC_APP_URL=http://VOTRE_IP_LOCALE:8081
```

Remplacez `VOTRE_IP_LOCALE` par l’adresse IP de votre PC (ex. `192.168.1.42`).  
Ainsi, téléphone, TV et PC sur le même réseau accèdent au même tournoi via le **code salle**.

- `w` pour le web dans le navigateur
- Scanner le QR code avec **Expo Go** sur mobile

## Accès depuis n’importe quel appareil (internet)

Deux composants à déployer :

1. **Serveur de sync** (`server/`) — stocke les tournois et les partage entre appareils
2. **Application web** — interface accessible dans le navigateur

### 1. Déployer le serveur de sync (Render, gratuit)

1. Poussez le projet sur GitHub
2. Créez un **Web Service** sur [render.com](https://render.com)
3. Utilisez le blueprint `render.yaml` ou configurez :
   - Build : `cd server && npm install`
   - Start : `cd server && npm start`
4. Notez l’URL obtenue, ex. `https://poker-asso-sync.onrender.com`

### 2. Déployer l’application web (Vercel)

1. Importez le repo sur [vercel.com](https://vercel.com)
2. Variables d’environnement :
   - `EXPO_PUBLIC_SYNC_URL` = URL du serveur Render
   - `EXPO_PUBLIC_APP_URL` = URL Vercel de l’app (ex. `https://poker-asso.vercel.app`)
3. Commande de build : `npm run export:web`
4. Dossier de sortie : `dist`

### 3. Utilisation

1. Ouvrez l’URL Vercel sur n’importe quel téléphone ou PC
2. Créez un tournoi → notez le **code salle** (ex. `ABC123`)
3. Sur la TV : ouvrez `https://votre-app.vercel.app/display/ABC123`
4. Sur le téléphone : contrôle via l’app ou `https://votre-app.vercel.app/control/ABC123`
5. Un autre organisateur peut rejoindre avec le même code depuis n’importe où

## Utilisation rapide (sans déploiement)

Sans `.env` configuré, l’app fonctionne en **mode local** :

- Web, même navigateur : contrôle + affichage synchronisés
- Mobile seul : les deux écrans sur le même appareil

## Structure

```
app/
  index.tsx              # Accueil
  create.tsx             # Création tournoi
  control/[roomId].tsx   # Interface organisateur
  display/[roomId].tsx   # Écran d’affichage
lib/
  config.ts              # URLs publiques (env)
  remote-sync.ts         # Client API cloud
  tournament-sync.ts     # Persistance locale + cloud
  tournament-utils.ts    # Calculs et reducer
server/
  src/index.ts           # API REST de synchronisation
types/
  tournament.ts          # Modèle métier
```

## API de sync

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | État du serveur |
| GET | `/api/tournaments/:code` | Charger un tournoi |
| PUT | `/api/tournaments/:code` | Sauvegarder (dernière version gagne) |

Les tournois sont identifiés par leur code salle à 6 caractères.

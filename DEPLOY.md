# Déploiement Poker Asso

Guide pas à pas pour Render (sync) + Vercel (app web).

## Prérequis

- Compte [GitHub](https://github.com)
- Compte [Render](https://render.com) (gratuit)
- Compte [Vercel](https://vercel.com) (gratuit)

---

## Étape 1 — Mettre le code sur GitHub

1. Créez un repo **vide** sur GitHub (ex. `poker-asso`)
2. Dans le dossier du projet, poussez le code :

```powershell
cd C:\Users\Baptiste\Projects\poker-asso
git init
git add .
git commit -m "Poker Asso — app tournoi avec sync cloud"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/poker-asso.git
git push -u origin main
```

> Si `git` n’est pas installé : [git-scm.com/download/win](https://git-scm.com/download/win)

---

## Étape 2 — Déployer le serveur de sync sur Render

1. Allez sur [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Blueprint**
3. Connectez GitHub et sélectionnez le repo `poker-asso`
4. Render détecte `render.yaml` — cliquez **Apply**
5. Attendez le déploiement (2–5 min)
6. Notez l’URL du service, ex. :
   ```
   https://poker-asso-sync.onrender.com
   ```
7. Testez : ouvrez `https://poker-asso-sync.onrender.com/health`  
   → vous devez voir `{"ok":true,"service":"poker-asso-sync"}`

> **Plan gratuit Render** : le serveur s’endort après 15 min d’inactivité.  
> Le premier chargement peut prendre ~30 s (normal).

---

## Étape 3 — Déployer l’app web sur Vercel

### Option A — Interface web (recommandé)

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Importez le repo GitHub `poker-asso`
3. **Framework Preset** : Other
4. Paramètres de build (normalement détectés via `vercel.json`) :
   - Build Command : `npm run export:web`
   - Output Directory : `dist`
5. **Environment Variables** — ajoutez **avant** le premier déploiement :

   | Variable | Valeur |
   |----------|--------|
   | `EXPO_PUBLIC_SYNC_URL` | `https://poker-asso-sync.onrender.com` |
   | `EXPO_PUBLIC_APP_URL` | `https://VOTRE-PROJET.vercel.app` *(provisoire, on corrige après)* |

6. Cliquez **Deploy**
7. Une fois déployé, copiez l’URL Vercel réelle (ex. `https://poker-asso-abc123.vercel.app`)
8. Retournez dans **Settings → Environment Variables** sur Vercel :
   - Mettez à jour `EXPO_PUBLIC_APP_URL` avec l’URL réelle
9. **Redeploy** le projet (Deployments → ⋯ → Redeploy)

> Les variables `EXPO_PUBLIC_*` sont injectées **au build**.  
> Chaque changement d’URL nécessite un redéploiement.

### Option B — Ligne de commande

```powershell
cd C:\Users\Baptiste\Projects\poker-asso
npx vercel login
npx vercel --prod
```

Puis configurez les variables dans le dashboard Vercel et redeployez.

---

## Étape 4 — Vérifier que tout fonctionne

1. Ouvrez votre URL Vercel sur le téléphone
2. Créez un tournoi → notez le code salle (ex. `ABC123`)
3. Sur la TV / un autre appareil, ouvrez :
   ```
   https://VOTRE-PROJET.vercel.app/display/ABC123
   ```
4. Depuis le téléphone, pilotez le timer → l’écran TV doit se mettre à jour en ~2 s
5. Sur l’accueil, le bandeau **« Sync cloud active »** doit apparaître

---

## Dépannage

| Problème | Solution |
|----------|----------|
| « Serveur de sync injoignable » | Render endormi → attendez 30 s et rafraîchissez |
| Tournoi introuvable sur un autre appareil | Vérifiez `EXPO_PUBLIC_SYNC_URL` sur Vercel + redeploy |
| Lien d’affichage incorrect sur mobile | Vérifiez `EXPO_PUBLIC_APP_URL` + redeploy |
| Build Vercel échoue | Lancez `npm run export:web` en local pour voir l’erreur |

---

## URLs finales à partager

| Usage | URL |
|-------|-----|
| Accueil / création | `https://VOTRE-PROJET.vercel.app` |
| Contrôle tournoi | `https://VOTRE-PROJET.vercel.app/control/CODE` |
| Écran salle TV | `https://VOTRE-PROJET.vercel.app/display/CODE` |

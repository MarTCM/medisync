# MediSync — Plateforme de gestion de cabinet médical

MediSync est une application web full-stack qui dématérialise la gestion d'un cabinet médical : prise de rendez-vous en ligne, dossier médical centralisé, facturation conforme à la nomenclature, journal d'audit et analytique pour la direction. Quatre rôles cohabitent dans la même base de code : **patient**, **médecin**, **secrétaire** et **administrateur**.

---

## Sommaire

1. [Rôles utilisateurs](#1-rôles-utilisateurs)
2. [Stack technique](#2-stack-technique)
3. [Architecture logicielle](#3-architecture-logicielle)
4. [Arborescence du projet](#4-arborescence-du-projet)
5. [Prérequis](#5-prérequis)
6. [Installation sur Linux](#6-installation-sur-linux)
7. [Installation sur Windows](#7-installation-sur-windows)
8. [Configuration `.env`](#8-configuration-env)
9. [Comptes de démonstration](#9-comptes-de-démonstration)
10. [Lancement et vérification](#10-lancement-et-vérification)
11. [Dépannage](#11-dépannage)

---

## 1. Rôles utilisateurs

| Rôle | Capacités principales |
|------|----------------------|
| **Patient** | Recherche de médecins, prise de rendez-vous (pour soi ou un ayant droit), consultation du dossier médical et des factures, dépôt d'avis après consultation. |
| **Médecin** | Planning journalier, saisie des consultations (compte rendu + prescriptions), gestion des disponibilités et des congés. |
| **Secrétaire** | Planning global de la clinique, création de fiches patient, prise de RDV pour le compte d'un patient, gestion complète des factures. |
| **Administrateur** | CRUD du personnel, configuration de la clinique (salles, spécialités), tableau de bord analytique, journal d'audit, activation 2FA. |

---

## 2. Stack technique

### Backend

| Couche | Technologie |
|--------|-------------|
| Runtime | Node.js ≥ 18 |
| Serveur HTTP | Express 4 |
| Base de données | MongoDB ≥ 6 (via Mongoose) |
| Authentification | JWT (`jsonwebtoken`) + bcryptjs |
| 2FA | speakeasy (TOTP) + qrcode |
| OAuth | google-auth-library (Google Sign-In) |
| Emails | Resend |
| PDF / Excel | PDFKit, ExcelJS |
| Téléversement | multer (limite 20 Mo, formats PDF/JPG/PNG/DICOM) |
| Validation | express-validator |
| Tâches planifiées | node-cron (rappels horaires) |

### Frontend

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 17 (composants standalone) |
| UI | Angular Material + thème teal personnalisé |
| Graphiques | Chart.js (via ng2-charts) |
| HTTP | HttpClient + intercepteurs (auth, erreur) |
| Locale | Français (`fr`) enregistré globalement |

---

## 3. Architecture logicielle

```
┌─────────────────────┐        REST / JSON          ┌──────────────────────┐
│                     │   Authorization: Bearer     │                      │
│  Angular 17 (SPA)   │ ──────────────────────────▶ │  Express API (Node)  │
│  4 portails par     │                             │  routes → controllers│
│  rôle, lazy-loaded  │ ◀────────────────────────── │       → models       │
│                     │      JSON (+ PDF blob)      │                      │
└─────────────────────┘                             └──────────┬───────────┘
       │                                                       │
       │ localStorage : JWT + profil                           │ Mongoose
       │                                                       ▼
       │                                            ┌──────────────────────┐
       │                                            │   MongoDB (clinic)   │
       │                                            └──────────────────────┘
       │
       │                            cron horaire (rappels 24h / 1h) ─┐
       │                                                             ▼
       │                                                       ┌──────────┐
       └──────────── Google Sign-In (idToken) ──────────────▶  │  Resend  │
                                                               │  (email) │
                                                               └──────────┘
```

### Backend — Express en couches MVC

- **`routes/`** : déclare les endpoints et chaîne les middlewares (`protect` JWT, `authorize` RBAC, validation express-validator).
- **`controllers/`** : logique métier — manipulent les modèles Mongoose et formatent la réponse JSON.
- **`models/`** : schémas Mongoose (Account, PatientProfile, DoctorProfile, Appointment, MedicalRecord, Invoice, Facility, Review, AuditLog, SecretaryProfile).
- **`middleware/`** : `auth.js` (vérification JWT), `role.js` (RBAC), `upload.js` (multer + filtre de format), `validate.js` (collecte des erreurs de validation).
- **`utils/`** : services transverses — `emailService` (Resend), `emailTemplates` (HTML transactionnels), `pdfGenerator`, `auditLogger`, `reminderScheduler` (cron horaire qui envoie les rappels 24h et 1h).
- **`config/db.js`** : connexion MongoDB (l'application s'arrête si la base n'est pas joignable).

### Frontend — Angular 17 standalone

- **`app.config.ts`** : providers globaux (Router, HttpClient + intercepteurs, animations, locale `fr`, Chart.js).
- **`app.routes.ts`** : routes lazy-loaded ; quatre portails (`/patient`, `/doctor`, `/secretary`, `/admin`) chacun protégé par `authGuard` puis `roleGuard`.
- **`core/services/`** : un service HTTP par domaine fonctionnel (Auth, Appointment, Doctor, Record, Invoice, Facility, Admin, Analytics, Review, GoogleAuth).
- **`core/guards/`** : `authGuard` (JWT présent + profil patient complété) et `roleGuard` (rôle attendu déclaré dans `route.data.roles`).
- **`core/interceptors/`** : `authInterceptor` (injecte `Authorization: Bearer <token>`) et `errorInterceptor` (déconnecte sur 401).
- **`core/models/index.ts`** : interfaces TypeScript miroir des schémas Mongoose.
- **`features/{patient,practitioner,secretary,admin}/`** : un dossier par portail, chaque composant correspondant à une vue (dashboard, prise de RDV, calendrier, factures, etc.).

### Communication

- **REST JSON** sur `http://localhost:3000/api/...`, base configurable via `environment.ts`.
- **JWT** envoyé dans l'en-tête `Authorization: Bearer <token>`, persisté côté navigateur dans `localStorage` (clé `medisync_token`).
- **CORS** : le backend autorise uniquement l'URL définie dans `FRONTEND_URL` (`.env`).
- **Fichiers téléversés** : servis statiquement via `http://localhost:3000/uploads/...`.

---

## 4. Arborescence du projet

```
medisync/
├── backend/
│   ├── server.js                  # Point d'entrée Express + montage des routes
│   ├── seed.js                    # Script de seed (comptes démo)
│   ├── uploads/                   # Fichiers téléversés (créé au boot)
│   └── src/
│       ├── config/db.js           # Connexion Mongoose
│       ├── models/                # 10 schémas Mongoose
│       ├── routes/                # 9 routeurs Express
│       ├── controllers/           # 9 contrôleurs métier
│       ├── middleware/            # auth, role, upload, validate
│       └── utils/                 # email, PDF, audit, cron
│
├── frontend/
│   └── src/
│       ├── environments/          # apiUrl, uploadsUrl, Google clientId
│       ├── app/
│       │   ├── app.config.ts      # Providers globaux
│       │   ├── app.routes.ts      # Routing lazy par rôle
│       │   ├── core/
│       │   │   ├── guards/        # auth.guard, role.guard
│       │   │   ├── interceptors/  # auth.interceptor, error.interceptor
│       │   │   ├── services/      # 10 services HTTP
│       │   │   ├── models/        # Interfaces TS partagées
│       │   │   └── utils/         # date, token-storage
│       │   ├── features/
│       │   │   ├── auth/          # login, register, 2fa, complete-profile
│       │   │   ├── patient/       # 8 vues + shell
│       │   │   ├── practitioner/  # 5 vues + shell (médecin)
│       │   │   ├── secretary/     # 6 vues + shell
│       │   │   └── admin/         # 6 vues + shell
│       │   └── shared/            # Composants réutilisables
│       └── styles.scss            # Thème global (teal médical)
│
├── docs/                          # Documentation technique (LaTeX)
└── README.md
```

---

## 5. Prérequis

| Outil | Version | Notes |
|-------|---------|-------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9 | Fourni avec Node |
| MongoDB | ≥ 6 | Local **ou** MongoDB Atlas (gratuit) |
| Angular CLI | 17 | `npm install -g @angular/cli@17` |
| Git | tout | — |

---

## 6. Installation sur Linux

### 6.1 Installer Node.js et MongoDB

```bash
# Node.js via nvm (recommandé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18

# MongoDB (Ubuntu/Debian, voir la doc officielle pour les autres distributions)
sudo apt update && sudo apt install -y mongodb
sudo systemctl enable --now mongod
```

Sur Arch / Manjaro : `sudo pacman -S mongodb-bin` puis `sudo systemctl enable --now mongodb`.

### 6.2 Cloner le dépôt

```bash
git clone <url-du-dépôt>
cd medisync
```

### 6.3 Configurer et lancer le backend

```bash
cd backend
npm install
cp .env.example .env        # remplir les valeurs (voir section 8)
node seed.js                # crée les comptes démo (à n'exécuter qu'une fois)
npm run dev                 # démarre l'API sur le port 3000
```

### 6.4 Lancer le frontend

Dans un **second terminal** :

```bash
cd medisync/frontend
npm install
npm start                   # démarre Angular sur le port 4200
```

Ouvrir `http://localhost:4200`.

---

## 7. Installation sur Windows

### 7.1 Installer Node.js et MongoDB

- **Node.js** : télécharger l'installeur LTS depuis [nodejs.org](https://nodejs.org) (la version LTS 18 ou supérieure). Cocher « Automatically install the necessary tools » durant l'installation.
- **MongoDB** : deux options.
  - **Option A — installation locale** : télécharger **MongoDB Community Server** depuis [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) et lancer le MSI. Cocher « Install MongoDB as a Service » pour un démarrage automatique.
  - **Option B — sans installation (recommandée si vous découvrez MongoDB)** : créer un cluster gratuit sur [cloud.mongodb.com](https://cloud.mongodb.com) (MongoDB Atlas) et utiliser la chaîne de connexion `mongodb+srv://...` dans `.env`.

### 7.2 Cloner le dépôt

Dans **PowerShell** :

```powershell
git clone <url-du-dépôt>
cd medisync
```

### 7.3 Configurer et lancer le backend

```powershell
cd backend
npm install
copy .env.example .env       # puis ouvrir .env dans un éditeur et remplir les valeurs
node seed.js                 # crée les comptes démo
npm run dev                  # démarre l'API sur le port 3000
```

### 7.4 Lancer le frontend

Dans un **second onglet PowerShell** :

```powershell
cd medisync\frontend
npm install
npm start                    # démarre Angular sur le port 4200
```

Ouvrir `http://localhost:4200` dans Chrome ou Edge.

> **Note Windows** : utilisez les antislashs (`\`) dans les chemins PowerShell, et `copy` plutôt que `cp`. Le pare-feu Windows peut afficher une fenêtre la première fois — autorisez Node.js sur les réseaux privés.

---

## 8. Configuration `.env`

Le fichier `backend/.env` est créé à partir de `backend/.env.example`. Variables attendues :

```env
# Serveur
PORT=3000
FRONTEND_URL=http://localhost:4200

# MongoDB
MONGO_URI=mongodb://localhost:27017/medisync
# Pour Atlas : mongodb+srv://<utilisateur>:<motdepasse>@cluster.mongodb.net/medisync

# JWT — n'importe quelle chaîne aléatoire longue
JWT_SECRET=remplacez_par_une_chaine_aleatoire_longue
JWT_EXPIRES_IN=1d

# Emails — Resend (https://resend.com → API Keys)
# Sans cette clé, les emails (confirmations, rappels, factures) seront silencieusement ignorés.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Clinique MediSync <onboarding@resend.dev>

# Google OAuth (connexion patient via Google)
# À récupérer dans Google Cloud Console → APIs & Services → Credentials
GOOGLE_OAUTH_CLIENT_ID=votre_client_id.apps.googleusercontent.com
```

> **Minimum requis pour démarrer** : `MONGO_URI` et `JWT_SECRET`. L'application fonctionne sans `RESEND_API_KEY` et `GOOGLE_OAUTH_CLIENT_ID`, mais les emails et la connexion Google sont alors désactivés.

---

## 9. Comptes de démonstration

Mot de passe commun : **`Demo1234!`**

| Rôle | Email |
|------|-------|
| Administrateur | `admin@medisync.demo` |
| Médecin | `doctor@medisync.demo` |
| Secrétaire | `secretary@medisync.demo` |
| Patient | `patient@medisync.demo` |
| Patient (alternatif) | `patient2@medisync.demo` |

Le script `node seed.js` est idempotent (utilise des upserts) : il peut être réexécuté sans créer de doublons.

---

## 10. Lancement et vérification

Deux terminaux en parallèle :

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm start
```

Vérification rapide :

1. Ouvrir `http://localhost:4200`.
2. Se connecter avec `admin@medisync.demo` / `Demo1234!`.
3. Vous devriez atterrir sur le tableau de bord administrateur, avec les cartes KPI et la barre latérale visibles.
4. Tester un autre rôle (ex. `doctor@medisync.demo`) pour vérifier le routage par rôle.

---

## 11. Dépannage

### MongoDB inaccessible

- **Linux** : `sudo systemctl status mongod` (ou `mongodb` selon la distrib). Démarrer avec `sudo systemctl start mongod`.
- **Windows** : ouvrir l'application « Services » (Win+R → `services.msc`), retrouver « MongoDB Server » et cliquer sur « Démarrer ».
- Si le socket Linux est verrouillé après un crash : `sudo rm /tmp/mongodb-27017.sock`, puis redémarrer le service.

### Erreur sur le dossier `uploads`

Le serveur le crée automatiquement au démarrage. En cas de problème de permission :

```bash
# Linux
mkdir backend/uploads

# Windows
New-Item -ItemType Directory backend\uploads
```

### Port déjà utilisé

- **Backend** : changer `PORT` dans `backend/.env`.
- **Frontend** : `ng serve --port 4201`, puis mettre à jour `FRONTEND_URL` dans `.env` et `apiUrl` dans `frontend/src/environments/environment.ts`.

### Angular CLI introuvable

```bash
npm install -g @angular/cli@17
```

### Emails non envoyés

L'API affiche au démarrage `EMAIL DISABLED — add RESEND_API_KEY to .env` si la clé Resend est absente. Les requêtes HTTP ne sont pas bloquées (envoi en fire-and-forget) — il suffit d'ajouter la clé et de redémarrer le backend.

### Google Sign-In ne s'affiche pas

Vérifier que `GOOGLE_OAUTH_CLIENT_ID` est défini côté backend **et** que `googleClientId` est renseigné dans `frontend/src/environments/environment.ts`. Le SDK Google nécessite aussi que l'origine `http://localhost:4200` soit autorisée dans la console Google Cloud.

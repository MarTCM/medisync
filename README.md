# MediSync — Local Setup Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9 | Comes with Node |
| MongoDB | ≥ 6 | Local instance **or** MongoDB Atlas |
| Angular CLI | 17 | `npm install -g @angular/cli@17` |
| Git | any | — |

---

## 1. Clone the repository

```bash
git clone <repo-url>
cd medisync
```

---

## 2. Backend setup

### 2.1 Install dependencies

```bash
cd backend
npm install
```

### 2.2 Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set each variable:

```env
# Server
PORT=3000
FRONTEND_URL=http://localhost:4200

# MongoDB
MONGO_URI=mongodb://localhost:27017/medisync
# For Atlas: mongodb+srv://<user>:<password>@cluster.mongodb.net/medisync

# JWT — pick any long random string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d

# Email — Resend (https://resend.com → API Keys)
# Without this, invitation and reminder emails will fail silently.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Clinique MediSync <onboarding@resend.dev>

# Google OAuth (used for patient Google Sign-In)
# Obtain from Google Cloud Console → APIs & Services → Credentials
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

> **Minimum to get started:** `MONGO_URI` and `JWT_SECRET`. The app runs without `RESEND_API_KEY` and `GOOGLE_OAUTH_CLIENT_ID`, but email features and Google login won't work.

### 2.3 Seed demo data

This creates one account for every role with the password `Demo1234!`:

```bash
node seed.js
```

| Role | Email |
|------|-------|
| Admin | `admin@medisync.demo` |
| Doctor | `doctor@medisync.demo` |
| Secretary | `secretary@medisync.demo` |
| Patient | `marwane.elbaraka@gmail.com` |

Safe to re-run — it uses upsert so it won't create duplicates.

### 2.4 Start the backend

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`.

---

## 3. Frontend setup

### 3.1 Install dependencies

```bash
# From the repo root
cd frontend
npm install
```

### 3.2 Environment config

The frontend config is at `src/environments/environment.ts`. The defaults point to `http://localhost:3000` and already include the shared Google OAuth client ID — **no changes needed for local development.**

If you change the backend port, update `apiUrl` and `uploadsUrl` in that file.

### 3.3 Start the frontend

```bash
npm start
# or
ng serve
```

The app will open at `http://localhost:4200`.

---

## 4. Running both servers together

Open two terminal tabs:

```bash
# Tab 1 — backend
cd backend && npm run dev

# Tab 2 — frontend
cd frontend && npm start
```

---

## 5. Verify everything works

1. Open `http://localhost:4200`
2. Log in with `admin@medisync.demo` / `Demo1234!`
3. You should land on the admin dashboard

---

## 6. Troubleshooting

**MongoDB connection refused**
- Make sure MongoDB is running: `sudo systemctl start mongod` (Linux) or open the MongoDB app (Mac)
- Check that `MONGO_URI` in `.env` is correct

**`uploads` directory errors on first run**
- The server creates it automatically. If you see permission errors: `mkdir backend/uploads`

**Port already in use**
- Backend: change `PORT` in `.env`
- Frontend: `ng serve --port 4201`, then update `FRONTEND_URL` in `.env` and `apiUrl` in `environment.ts`

**Angular CLI not found**
```bash
npm install -g @angular/cli@17
```

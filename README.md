# 🏢 Macher Business

Vollständige Business-Management Website mit Discord Login, Turso Datenbank.

---

## 🚀 Setup (Schritt für Schritt)

### 1. Discord Application erstellen
1. Gehe auf https://discord.com/developers/applications
2. Klicke **"New Application"** → Name: "Macher Business"
3. Links auf **"OAuth2"** klicken
4. **Client ID** und **Client Secret** kopieren und notieren
5. Unter **"Redirects"** hinzufügen:
   - Für lokal: `http://localhost:3000/auth/discord/callback`
   - Für Server: `https://DEINE-DOMAIN.com/auth/discord/callback`

### 2. Turso Datenbank erstellen
```bash
# Turso CLI installieren
curl -sSfL https://get.tur.so/install.sh | bash

# Einloggen
turso auth login

# Datenbank erstellen
turso db create macher-business

# URL und Token holen
turso db show macher-business --url
turso db tokens create macher-business
```
Alternativ: https://turso.tech → Dashboard → Create Database

### 3. Deine Discord User ID finden
1. Discord öffnen → Einstellungen → Erweitert → **Entwicklermodus aktivieren**
2. Rechtsklick auf deinen Namen → **"ID kopieren"**

### 4. Umgebungsvariablen konfigurieren
```bash
cp .env.example .env
```
Dann `.env` öffnen und alle Werte eintragen.

### 5. Dependencies installieren & starten
```bash
npm install
npm start
```

Die Website läuft auf http://localhost:3000

---

## 🌐 Hosting (Website läuft ohne PC)

### Option A: Railway (Empfohlen - alles in einem)
1. https://railway.app → Account erstellen
2. **"New Project"** → **"Deploy from GitHub Repo"**
3. GitHub Repo erstellen und Code hochladen:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/DEIN-NAME/macher-business.git
   git push -u origin main
   ```
4. Railway: Repository auswählen → Deploy
5. In Railway → **Variables** → alle `.env` Werte eintragen
6. Railway gibt dir eine URL (z.B. `https://macher-business-production.up.railway.app`)
7. Diese URL als `DISCORD_CALLBACK_URL` eintragen und auch im Discord Developer Portal hinzufügen

### Option B: Render.com (kostenlos)
1. https://render.com → New Web Service → GitHub verbinden
2. Build Command: `npm install`
3. Start Command: `node src/server.js`
4. Environment Variables eintragen

---

## 👑 Admins verwalten
- Nur **du** (Super-Admin) kannst Admins hinzufügen/entfernen
- Gehe auf den **Admin-Tab** → Admin Verwaltung
- Discord User ID der Person eingeben
- **Entwicklermodus** in Discord aktivieren → Rechtsklick auf User → ID kopieren

---

## 📁 Struktur
```
macher-business/
├── src/
│   ├── server.js          # Hauptserver
│   ├── lib/db.js          # Datenbank
│   └── routes/
│       ├── auth.js        # Discord OAuth
│       └── api.js         # Alle API Endpoints
├── public/
│   ├── index.html         # Frontend
│   └── uploads/           # Hochgeladene Bilder (auto-erstellt)
├── .env.example           # Vorlage für Umgebungsvariablen
├── .env                   # Deine Konfiguration (NICHT committen!)
└── package.json
```

---

## ⚠️ Wichtig
- Die `.env` Datei **niemals** auf GitHub hochladen!
- Füge `.env` zu `.gitignore` hinzu

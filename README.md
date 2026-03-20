# 🍽️ Essensplaner

Eine Web-App für gemeinsame Essenswochenpläne mit Einkaufsliste und Benutzerverwaltung.

## Features

- **Benutzerauthentifizierung** – Registrierung & Login mit Benutzername/Passwort
- **Wochenplan** – Frühstück, Mittagessen & Abendessen für jeden Tag der Woche
- **Einkaufsliste** – Artikel hinzufügen, abhaken und löschen
- **Mehrbenutzer** – Andere Nutzer per Einladungscode zum Plan einladen
- **Rollensystem:**
  - 👑 **Manager** – Vollzugriff, kann Rollen vergeben und Einladungscode teilen
  - ✏️ **Admin** – Kann den Plan bearbeiten
  - 👁️ **Zuschauer** – Kann den Plan nur ansehen

## Setup

### Voraussetzungen
- Node.js 18+

### Installation

```bash
npm run install:all
```

### Entwicklung

Backend (Port 3001):
```bash
npm run dev:backend
```

Frontend (Port 5173):
```bash
npm run dev:frontend
```

### Produktion

```bash
npm run build:frontend
npm start
```

Die App läuft dann auf Port 3001 und serviert das Frontend als statische Dateien.

## Technik

- **Backend:** Node.js, Express, SQLite (better-sqlite3), JWT, bcrypt
- **Frontend:** React, TypeScript, Vite, React Router

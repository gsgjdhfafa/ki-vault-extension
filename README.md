# 🏛️ KI-Vault Extraktor — Chrome Extension (Manifest V3)

**Scannt KI-Threads auf ChatGPT, Claude, Gemini & Perplexity automatisch.**  
Bewertet, klassifiziert und exportiert deine 20% wertvollen Outputs — lokal, keine Cloud.

---

## ⚡ INSTALLATION (2 Minuten)

### Schritt 1 — Entwicklermodus aktivieren
1. Chrome öffnen
2. In die Adressleiste eingeben: `chrome://extensions`
3. Oben rechts: **"Entwicklermodus"** einschalten (Toggle)

### Schritt 2 — Extension laden
1. Button **"Entpackte Erweiterung laden"** klicken
2. Den Ordner **`ki-vault-extension/`** auswählen (dieser Ordner)
3. ✅ Extension erscheint in der Liste

### Schritt 3 — Icon anpinnen
1. Puzzle-Icon in Chrome-Toolbar klicken
2. Neben **"KI-Vault Extraktor"** das Pin-Symbol klicken
3. Das 🏛️-Icon ist jetzt immer sichtbar

---

## 🚀 SO FUNKTIONIERT ES

### Automatischer Scan (immer aktiv)
Die Extension läuft permanent im Hintergrund auf:
- `chat.openai.com` / `chatgpt.com`
- `claude.ai`
- `gemini.google.com`
- `perplexity.ai`

**Jedes Mal wenn du einen Thread öffnest oder neue Nachrichten erscheinen**, scannt die Extension automatisch den Inhalt.

### Score-Blase
Nach jedem Scan erscheint kurz eine Blase rechts unten:
- 🏆 **75–100** — TOP-ASSET (sofort gespeichert)
- 💎 **55–74** — Wertvoll
- 📌 **35–54** — Nützlich
- (🗑️ unter 35 = stumm, kein Popup)

Mit 👍/👎 in der Blase trainierst du das System — es passt die Keyword-Gewichtung automatisch an.

### Badge am Icon
Das Extension-Icon zeigt in Echtzeit den Score des aktuellen Threads:
- **Cyan** = Top-Asset
- **Grün** = Wertvoll
- **Gelb** = Nützlich
- (leer) = Müll

---

## 📊 POPUP-DASHBOARD

Auf das Icon klicken — 3 Tabs:

### 📊 Übersicht
- Gesamtzahl Threads / Top-Assets / Ø Score
- Balkendiagramm nach Kategorie und Plattform
- Zuletzt gespeicherte Threads

### 📄 Threads
- Liste aller gespeicherten Threads
- Suche + Plattform-Filter
- Thumbs Up/Down, Einzeldatei-Download, Löschen

### 🧠 Lernen
- Zeigt gelernte Keyword-Gewichte (Top 20)
- Anzahl Bewertungen pro Keyword
- Reset-Button

---

## 📁 AUTO-KLASSIFIZIERUNG

Threads werden automatisch in Kategorien eingeteilt:

| Kategorie | Keywords |
|-----------|----------|
| `🖥️ HTML_TOOLS` | html, css, dashboard, interface, frontend |
| `💻 CODE` | python, javascript, bash, docker, function |
| `💼 KONZEPTE` | businessplan, patent, dpma, ki4ki, saas |
| `⚙️ AUTOMATISIERUNG` | n8n, workflow, webhook, automation |
| `🤿 TTT_TAUCHEN` | ttt, taucherteam, triton, tauchen |

Exportpfade beim ZIP-Export:
```
_KAI_VAULT/
├── 01_HTML_TOOLS/
├── 03_KONZEPTE/
├── 04_CODE/
├── 06_TTT_TAUCHEN/
└── 07_AUTOMATISIERUNG/
```

---

## 📦 ZIP-EXPORT

Im Popup: **"📦 ZIP"** Button klicken.

Lädt eine HTML-Seite herunter, die alle gespeicherten Threads als einzelne HTML-Dateien enthält — ein Klick lädt alle auf einmal herunter.

---

## ⚙️ EINSTELLUNGEN

Rechtsklick auf Extension-Icon → **"Optionen"** oder im Popup auf ⚙️:
- Score-Schwellen anpassen (Standard: 75/55/35)
- Auto-Scan pro Plattform an/aus
- Bubble-Benachrichtigungen an/aus
- Keyword-Basisgewichte manuell anpassen

---

## 🔒 DATENSCHUTZ

- **Kein Cloud-Upload** — alles bleibt lokal in Chrome's IndexedDB
- **Keine externen Server** — keine API-Calls, kein Tracking
- **Nur Lesen** — die Extension schreibt nichts in deine Chats

---

## 🐛 PROBLEMBEHANDLUNG

**Extension wird nicht geladen:**
- Stelle sicher, dass `manifest.json` im root des gewählten Ordners liegt
- Entwicklermodus muss aktiviert sein

**Kein Scan auf Gemini:**
- Gemini nutzt Web Components / Shadow DOM — bei Updates von Google kann der Selektor brechen
- Seite neu laden hilft meistens

**Score immer 0:**
- Öffne einen vollständigen Chat-Thread (nicht die Startseite)
- Warte 3 Sekunden nach dem Öffnen

**Extension nach Chrome-Update deaktiviert:**
- `chrome://extensions` → Extension wieder aktivieren

---

## 📂 DATEISTRUKTUR

```
ki-vault-extension/
├── manifest.json          ← MV3 Manifest
├── popup.html             ← Dashboard
├── popup.js               ← Dashboard Logik
├── options.html           ← Einstellungen
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   └── background.js      ← Service Worker (DB, Scoring, Learning)
└── content/
    ├── shared.js           ← Gemeinsame Utilities
    ├── chatgpt.js          ← ChatGPT Extraktor
    ├── claude.js           ← Claude Extraktor
    ├── gemini.js           ← Gemini Extraktor
    └── perplexity.js       ← Perplexity Extraktor
```

---

*KI-Vault v1.0 · Gerrit Großmaas · April 2026*

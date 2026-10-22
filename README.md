# Soplaya Shorts

Feed verticale stile Reels con gli ultimi 10 YouTube Shorts di @soplaya, da embeddare nel sito.

- `site/index.html`: la pagina del feed (swipe verticale, like, link a YouTube, audio on/off)
- `site/feed.json`: i video mostrati, rigenerato ogni mattina
- `site/config.js`: configurazione pubblica (endpoint dei like)
- `scripts/fetch-feed.mjs`: legge YouTube e scrive `feed.json`
- `.github/workflows/update-feed.yml`: ogni mattina aggiorna il feed e pubblica su GitHub Pages

## Setup

1. **API key YouTube** → GitHub repo › Settings › Secrets and variables › Actions › *New repository secret*
   nome `YOUTUBE_API_KEY`. Mai scriverla nei file del repo.
   (Opzionale: variabile `CHANNEL_HANDLE` per cambiare canale.)
2. **Pages** → Settings › Pages › Source: *GitHub Actions*.
3. Lancia la prima volta da Actions › *Aggiorna feed e pubblica* › *Run workflow*.

## Embed nel sito

```html
<iframe src="https://davide-soplaya.github.io/Soplaya-shorts/"
        style="width:100%;height:100dvh;border:0"
        allow="autoplay; encrypted-media; fullscreen"></iframe>
```

## Like

Imposta `likeEndpoint` in `site/config.js`. Ad ogni like/unlike la pagina invia:

```json
POST { "videoId": "abc123", "liked": true, "clientId": "uuid-del-browser", "at": "2026-10-22T08:00:00Z" }
```

L'endpoint deve accettare CORS dal dominio di GitHub Pages. Finché è vuoto, il like resta solo nel browser.

## Test in locale

```sh
YOUTUBE_API_KEY=... node scripts/fetch-feed.mjs
npx serve site
```

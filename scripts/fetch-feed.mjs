// Scarica gli ultimi N shorts del canale e scrive site/feed.json.
// Uso: YOUTUBE_API_KEY=... node scripts/fetch-feed.mjs
import { writeFile } from "node:fs/promises";

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_HANDLE = process.env.CHANNEL_HANDLE || "@soplaya";
const FEED_SIZE = Number(process.env.FEED_SIZE || 10);
const MAX_SHORT_SECONDS = 180; // gli Shorts possono durare fino a 3 minuti
const MAX_SCANNED = 200; // limite di upload da esaminare per trovare N shorts
const OUT_FILE = new URL("../site/feed.json", import.meta.url);

if (!API_KEY) {
  console.error("Manca YOUTUBE_API_KEY");
  process.exit(1);
}

async function yt(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: API_KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ISO 8601 (PT1M5S) -> secondi
function durationSeconds(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return Infinity;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

// youtube.com/shorts/ID risponde 200 per gli Shorts e fa redirect per i video normali.
// Se il controllo non è possibile ci si affida solo alla durata.
async function isShortUrl(id) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, { method: "HEAD", redirect: "manual" });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400) return false;
  } catch {}
  return null;
}

const channels = await yt("channels", { part: "contentDetails,snippet", forHandle: CHANNEL_HANDLE });
const channel = channels.items?.[0];
if (!channel) throw new Error(`Canale ${CHANNEL_HANDLE} non trovato`);
const uploads = channel.contentDetails.relatedPlaylists.uploads;

const shorts = [];
let pageToken;
let scanned = 0;
while (shorts.length < FEED_SIZE && scanned < MAX_SCANNED) {
  const page = await yt("playlistItems", {
    part: "contentDetails",
    playlistId: uploads,
    maxResults: 50,
    ...(pageToken && { pageToken }),
  });
  const ids = page.items.map((i) => i.contentDetails.videoId);
  scanned += ids.length;
  if (!ids.length) break;

  const videos = await yt("videos", { part: "snippet,contentDetails,status", id: ids.join(",") });
  for (const v of videos.items) {
    if (shorts.length >= FEED_SIZE) break;
    if (v.status.privacyStatus !== "public" || !v.status.embeddable) continue;
    if (durationSeconds(v.contentDetails.duration) > MAX_SHORT_SECONDS) continue;
    if ((await isShortUrl(v.id)) === false) continue;
    shorts.push({
      id: v.id,
      title: v.snippet.title,
      publishedAt: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/shorts/${v.id}`,
    });
  }

  pageToken = page.nextPageToken;
  if (!pageToken) break;
}

const feed = {
  channel: { handle: CHANNEL_HANDLE, title: channel.snippet.title, id: channel.id },
  updatedAt: new Date().toISOString(),
  items: shorts,
};
await writeFile(OUT_FILE, JSON.stringify(feed, null, 2) + "\n");
console.log(`Feed aggiornato: ${shorts.length} shorts da ${channel.snippet.title}`);

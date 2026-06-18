import http from 'node:http';
import { Buffer } from 'node:buffer';
import {
  Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder,
  ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
  SeparatorBuilder, SeparatorSpacingSize, MessageFlags
} from 'discord.js';
import sharp from 'sharp';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TARGET_LANG = (process.env.TARGET_LANG || 'pl').toLowerCase();
const IGNORE_LANGS = (process.env.IGNORE_LANGS || 'en,pl').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const DELETE_ORIGINAL_MESSAGE = String(process.env.DELETE_ORIGINAL_MESSAGE || 'true').toLowerCase() === 'true';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const PORT = Number(process.env.PORT || 10000);
const PHOTO_UPLOAD_LIMIT_MB = Number(process.env.PHOTO_UPLOAD_LIMIT_MB || 8);
const PHOTO_UPLOAD_LIMIT_BYTES = Math.max(1, PHOTO_UPLOAD_LIMIT_MB) * 1024 * 1024;
const VIDEO_LINK_MODE = (process.env.VIDEO_LINK_MODE || 'player').toLowerCase(); // player | buttons_only
const VIDEO_LINK_STYLE = (process.env.VIDEO_LINK_STYLE || 'labeled').toLowerCase(); // labeled | plain | spoiler
const SHOW_LANGUAGE_BADGE = String(process.env.SHOW_LANGUAGE_BADGE || 'false').toLowerCase() === 'true';
const SHOW_FOOTER = String(process.env.SHOW_FOOTER || 'false').toLowerCase() === 'true';
const SHOW_STATS = String(process.env.SHOW_STATS || 'true').toLowerCase() === 'true';
const VIDEO_RENDER_MODE = (process.env.VIDEO_RENDER_MODE || 'components_v2').toLowerCase(); // components_v2 | fx

if (!DISCORD_TOKEN) {
  console.error('Brak DISCORD_TOKEN w Environment Variables.');
  process.exit(1);
}

http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('OK');
}).listen(PORT, () => console.log(`HTTP healthcheck działa na porcie ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const X_RE = /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,20})\/status(?:es)?\/(\d+)/i;

const langNames = {
  en: 'Angielski', pl: 'Polski', es: 'Hiszpański', pt: 'Portugalski', fr: 'Francuski', it: 'Włoski', de: 'Niemiecki', ar: 'Arabski', tr: 'Turecki', nl: 'Niderlandzki', ja: 'Japoński', ko: 'Koreański', ru: 'Rosyjski', uk: 'Ukraiński'
};

function langLabel(code) { return langNames[(code || '').toLowerCase()] || (code || 'Nieznany').toUpperCase(); }
const langFlags = { en:'🇬🇧', pl:'🇵🇱', es:'🇪🇸', pt:'🇵🇹', fr:'🇫🇷', it:'🇮🇹', de:'🇩🇪', ar:'🇸🇦', tr:'🇹🇷', nl:'🇳🇱', ja:'🇯🇵', ko:'🇰🇷', ru:'🇷🇺', uk:'🇺🇦' };
function langFlag(code) { return langFlags[(code || '').toLowerCase()] || '🌍'; }
function avatarHd(url) {
  if (!url) return null;
  return String(url).replace('_normal.', '_400x400.').replace('_bigger.', '_400x400.');
}
function compactNumber(n) {
  n = Number(n || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.0','') + ' mln';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0','') + ' tys.';
  return String(n);
}
function buildStatsLine(tweet) {
  if (!SHOW_STATS || !tweet.stats) return '';
  const parts = [];
  if (tweet.stats.likes) parts.push(`❤️ ${compactNumber(tweet.stats.likes)}`);
  if (tweet.stats.retweets) parts.push(`🔁 ${compactNumber(tweet.stats.retweets)}`);
  if (tweet.stats.replies) parts.push(`💬 ${compactNumber(tweet.stats.replies)}`);
  if (tweet.stats.views) parts.push(`👁️ ${compactNumber(tweet.stats.views)}`);
  return parts.join('  ·  ');
}
function buildMetaLine(tweet, didTranslate) {
  const parts = [];
  if (SHOW_LANGUAGE_BADGE) parts.push(didTranslate ? `${langFlag(tweet.lang)} → 🇵🇱` : `${langFlag(tweet.lang)} bez tłumaczenia`);
  if (tweet.verified) parts.push('✔️ zweryfikowany');
  const stats = buildStatsLine(tweet);
  if (stats) parts.push(stats);
  return parts.join('  ·  ');
}
function prettyText(text='') {
  return String(text)
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
function authorLabel(tweet) { return `${tweet.authorName} (@${tweet.authorUser})`; }
function langBadge(tweet, didTranslate) {
  if (!SHOW_LANGUAGE_BADGE) return '';
  return didTranslate ? `${langFlag(tweet.lang)} → 🇵🇱` : `${langFlag(tweet.lang)} bez tłumaczenia`;
}
function cleanText(t='') { return String(t).replace(/https?:\/\/\S+/g, '').trim(); }
function truncate(t='', n=1000) { return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function fxUrl(user, id) { return `https://fxtwitter.com/${user}/status/${id}`; }
function xUrl(user, id) { return `https://x.com/${user}/status/${id}`; }
function safeFilename(s='file') { return String(s).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }

function parseTweetRefFromUrl(url='') {
  const m = String(url).match(/https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|fxtwitter\.com|fixupx\.com|vxtwitter\.com)\/([A-Za-z0-9_]{1,20})\/status(?:es)?\/(\d+)/i);
  return m ? { user: m[1], id: m[2] } : null;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function unwrapTweetEnvelope(value) {
  let current = value;
  const seen = new Set();
  for (let i = 0; i < 8 && isObject(current) && !seen.has(current); i++) {
    seen.add(current);
    const next = current.tweet || current.status || current.quoted_tweet || current.quotedTweet ||
      current.result || current.data || current.tweet_results?.result || current.tweetResult?.result;
    if (!isObject(next) || next === current) break;
    current = next;
  }
  return current;
}

function looksLikeTweetObject(value) {
  if (!isObject(value)) return false;
  const v = unwrapTweetEnvelope(value);
  return Boolean(
    v.id || v.id_str || v.rest_id || v.tweet_id || v.status_id ||
    v.text || v.full_text || v.content || v.description ||
    v.author || v.user || v.media || v.mediaDetails
  );
}

function findQuoteObjectDeep(root) {
  if (!isObject(root)) return null;
  const queue = [root];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!isObject(current) || seen.has(current)) continue;
    seen.add(current);
    for (const [key, value] of Object.entries(current)) {
      const k = key.toLowerCase();
      if (/quote|quoted_status/.test(k) && !/(count|id|url)$/.test(k) && isObject(value)) {
        const unwrapped = unwrapTweetEnvelope(value);
        if (looksLikeTweetObject(unwrapped)) return unwrapped;
      }
      if (isObject(value)) queue.push(value);
      else if (Array.isArray(value)) {
        for (const item of value) if (isObject(item)) queue.push(item);
      }
    }
  }
  return null;
}

function findQuoteIdDeep(root, currentId='') {
  if (!isObject(root)) return null;
  const queue = [root];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!isObject(current) || seen.has(current)) continue;
    seen.add(current);
    for (const [key, value] of Object.entries(current)) {
      const k = key.toLowerCase();
      if (/^(quoted_status_id(_str)?|quoted_tweet_id|quote_tweet_id|quote_id|quotedid|quotedtweetid)$/.test(k)) {
        const id = String(value || '').match(/\d{10,25}/)?.[0];
        if (id && id !== String(currentId)) return id;
      }
      if (isObject(value)) queue.push(value);
      else if (Array.isArray(value)) for (const item of value) if (isObject(item)) queue.push(item);
    }
  }
  return null;
}

function syndicationToken(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return '0';
  return ((n / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

function collectDeepUrls(obj, out = []) {
  if (!obj || out.length > 50) return out;
  if (typeof obj === 'string') {
    if (/https?:\/\//i.test(obj)) out.push(obj);
    return out;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectDeepUrls(item, out);
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (['url', 'expanded_url', 'display_url', 'unwound_url', 'text', 'full_text', 'content'].includes(k) || typeof v === 'object') {
        collectDeepUrls(v, out);
      }
    }
  }
  return out;
}

function findQuotedReference(t, data, currentUser, currentId) {
  const direct = [
    t.quote_url, t.quoted_url, t.quoted_status_url, t.quotedTweetUrl, t.quoteTweetUrl,
    data.quote_url, data.quoted_url, data.quoted_status_url, data.quotedTweetUrl, data.quoteTweetUrl
  ].filter(Boolean);
  const urls = [...direct, ...collectDeepUrls(t), ...collectDeepUrls(data)];
  for (const u of urls) {
    const ref = parseTweetRefFromUrl(u);
    if (ref && String(ref.id) !== String(currentId)) return ref;
  }
  return null;
}

function findQuotedIdOnly(t = {}, data = {}, currentId = '') {
  const candidates = [
    t.quoted_status_id_str, t.quoted_status_id, t.quotedTweetId, t.quoted_tweet_id,
    t.quoted_id, t.quote_id, t.quote_tweet_id, t.quoteTweetId,
    data.quoted_status_id_str, data.quoted_status_id, data.quotedTweetId, data.quoted_tweet_id,
    data.quoted_id, data.quote_id, data.quote_tweet_id, data.quoteTweetId
  ];
  for (const v of candidates) {
    const id = String(v || '').match(/\d{10,25}/)?.[0];
    if (id && id !== String(currentId)) return id;
  }
  return findQuoteIdDeep(t, currentId) || findQuoteIdDeep(data, currentId);
}

async function fetchSyndicationTweet(id) {
  const token = syndicationToken(id);
  const urls = [
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=pl&token=${token}`,
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`,
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}`,
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=0`
  ];
  let lastErr;
  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: {
          'user-agent': 'Mozilla/5.0 DiscordBot TwitterTranslator',
          'accept': 'application/json,text/plain,*/*'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && typeof json === 'object') return json;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Syndication fetch failed');
}

function normalizeSyndicationTweet(q) {
  if (!q || typeof q !== 'object') return null;
  const userObj = q.user || {};
  const id = String(q.id_str || q.id || '').trim();
  const screen = userObj.screen_name || userObj.username || q.screen_name || q.username || '';
  const text = cleanText(q.text || q.full_text || q.content || q.description || '');
  const media = normalizeMedia(q, q);

  // syndication.twimg.com często trzyma zdjęcia w mediaDetails.
  const mediaDetails = Array.isArray(q.mediaDetails) ? q.mediaDetails : [];
  const photos = mediaDetails
    .filter(m => (m.type === 'photo' || m.type === 'animated_gif') && (m.media_url_https || m.media_url))
    .map(m => m.media_url_https || m.media_url);
  if (photos.length && !media.photos.length) media.photos = [...new Set(photos)];

  const videoItem = mediaDetails.find(m => m.type === 'video' || m.type === 'animated_gif');
  if (videoItem && !media.video) {
    const variants = (videoItem.video_info?.variants || [])
      .filter(v => v.url && String(v.url).includes('.mp4'))
      .map(v => ({ url: v.url, bitrate: Number(v.bitrate || 0), contentType: v.content_type || '' }))
      .sort((a,b) => (a.bitrate || 0) - (b.bitrate || 0));
    media.video = { variants, url: variants[0]?.url || null };
    media.thumbnail = videoItem.media_url_https || videoItem.media_url || null;
  }

  if (!id && !text && !media.photos.length && !media.video) return null;
  return {
    id: id || 'quoted',
    user: screen || 'x',
    text,
    lang: (q.lang || q.language || '').toLowerCase() || guessLang(text),
    authorName: userObj.name || userObj.display_name || screen || 'Autor cytowanego wpisu',
    authorUser: screen || 'unknown',
    authorAvatar: avatarHd(userObj.profile_image_url_https || userObj.profile_image_url || userObj.avatar_url || null),
    verified: Boolean(userObj.verified || userObj.is_blue_verified || userObj.blue_verified),
    stats: normalizeStats(q, q),
    media,
    isQuoted: true
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 DiscordBot TwitterTranslator' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} przy pobieraniu ${url}`);
  return res.json();
}

async function getTweet(user, id, depth = 0) {
  const apiUrls = [
    `https://api.fxtwitter.com/${user}/status/${id}`,
    `https://api.fxtwitter.com/status/${id}`,
    `https://api.vxtwitter.com/${user}/status/${id}`,
    `https://api.vxtwitter.com/status/${id}`
  ];
  let lastErr;
  for (const u of apiUrls) {
    try {
      const data = await fetchJson(u);
      const t = unwrapTweetEnvelope(data.tweet || data.status || data);
      const author = t.author || data.author || {};
      const rawText = t.text || t.full_text || t.content || '';
      const text = cleanText(rawText);
      const lang = (t.lang || t.language || data.lang || '').toLowerCase() || guessLang(text);
      const media = normalizeMedia(t, data);

      let quoted = normalizeQuoted(t, data);
      // Cytowane tweety bywają zwracane na różne sposoby: jako obiekt, URL, samo ID albo tylko w syndication API.
      if (!quoted && depth < 1) {
        const ref = findQuotedReference(t, data, user, id);
        const idOnly = findQuotedIdOnly(t, data, id);
        const quoteId = ref?.id || idOnly;
        const quoteUser = ref?.user || user;
        if (quoteId && String(quoteId) !== String(id)) {
          try {
            quoted = await getTweet(quoteUser, quoteId, depth + 1);
            quoted.isQuoted = true;
            console.log(`Dociągnięto cytowany wpis przez FxTwitter: ${quoteId}`);
          } catch (e) {
            console.warn('Nie udało się dociągnąć cytowanego wpisu przez FxTwitter:', e.message);
          }
        }
      }

      if (!quoted && depth < 1) {
        try {
          const synd = await fetchSyndicationTweet(id);
          quoted = normalizeQuoted(synd, synd);
          const syndQuote = synd.quoted_tweet || synd.quotedTweet || synd.quoted_status || findQuoteObjectDeep(synd);
          if (!quoted && syndQuote) quoted = normalizeSyndicationTweet(unwrapTweetEnvelope(syndQuote));
          const qid = findQuotedIdOnly(synd, synd, id);
          if (!quoted && qid) {
            try {
              quoted = await getTweet(user, qid, depth + 1);
              quoted.isQuoted = true;
            } catch (e) {
              console.warn('Nie udało się dociągnąć cytowanego wpisu po ID z syndication:', e.message);
            }
          }
          if (quoted) console.log(`Znaleziono cytowany wpis przez syndication dla ${id}: ${quoted.id}`);
        } catch (e) {
          console.warn('Syndication nie zwróciło cytowanego wpisu:', e.message);
        }
      }

      if (!quoted) console.log(`Brak cytowanego wpisu w danych dla ${user}/${id}`);

      return {
        id,
        user,
        text,
        lang,
        authorName: author.name || author.screen_name || author.username || user,
        authorUser: author.screen_name || author.username || user,
        authorAvatar: avatarHd(author.avatar_url || author.avatar || author.profile_image_url || null),
        verified: Boolean(author.verified || author.is_blue_verified || author.blue_verified || author.verified_type),
        stats: normalizeStats(t, data),
        media,
        quoted
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Nie udało się pobrać tweeta.');
}

function pickNum(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
function normalizeStats(t, data) {
  const s = t.stats || t.metrics || data.stats || data.metrics || {};
  return {
    likes: pickNum(t.likes, t.favorite_count, t.like_count, s.likes, s.favorites, s.like_count, data.likes),
    retweets: pickNum(t.retweets, t.retweet_count, t.reposts, s.retweets, s.reposts, s.retweet_count, data.retweets),
    replies: pickNum(t.replies, t.reply_count, s.replies, s.reply_count, data.replies),
    views: pickNum(t.views, t.view_count, t.views_count, s.views, s.view_count, data.views)
  };
}

function normalizeMedia(t, data) {
  const media = { photos: [], video: null, thumbnail: null };
  const candidates = [];
  if (Array.isArray(t.media?.photos)) candidates.push(...t.media.photos.map(p => p.url || p));
  if (Array.isArray(t.photos)) candidates.push(...t.photos.map(p => p.url || p));
  if (Array.isArray(data.photos)) candidates.push(...data.photos.map(p => p.url || p));
  if (Array.isArray(t.media?.all)) candidates.push(...t.media.all.filter(m => m.type === 'photo').map(m => m.url));
  media.photos = [...new Set(candidates.filter(Boolean))];

  const v = t.media?.videos?.[0] || t.media?.video || t.video || data.video || null;
  if (v) {
    const variants = [];
    const rawVariants = v.variants || v.videoVariants || v.variants_mp4 || [];
    for (const item of rawVariants) {
      const url = item.url || item.src;
      if (!url || !String(url).includes('.mp4')) continue;
      variants.push({ url, bitrate: Number(item.bitrate || item.bit_rate || 0), contentType: item.content_type || item.type || '' });
    }
    if (v.url && String(v.url).includes('.mp4')) variants.push({ url: v.url, bitrate: Number(v.bitrate || 0) });
    if (v.video_url && String(v.video_url).includes('.mp4')) variants.push({ url: v.video_url, bitrate: Number(v.bitrate || 0) });
    variants.sort((a,b) => (a.bitrate || 0) - (b.bitrate || 0));
    media.video = { variants, url: variants[0]?.url || v.url || v.video_url || null };
    media.thumbnail = v.thumbnail_url || v.thumbnail || v.poster || v.cover || media.photos[0] || null;
  }
  return media;
}


function normalizeQuoted(parentT, data) {
  const direct = parentT?.quote || parentT?.quoted_tweet || parentT?.quotedTweet || parentT?.quoted ||
    parentT?.quoted_status || parentT?.quoted_status_result || data?.quote || data?.quoted_tweet ||
    data?.quotedTweet || data?.quoted || data?.quoted_status || data?.quoted_status_result || null;
  const q = unwrapTweetEnvelope(isObject(direct) ? direct : findQuoteObjectDeep(parentT) || findQuoteObjectDeep(data));
  if (!q || typeof q !== 'object') return null;

  const legacy = isObject(q.legacy) ? q.legacy : {};
  const coreUser = q.core?.user_results?.result || q.core?.userResult?.result || {};
  const userLegacy = coreUser.legacy || {};
  const qa = q.author || q.user || q.author_info || coreUser || {};
  const qId = String(q.id || q.id_str || q.rest_id || q.tweet_id || q.status_id || legacy.id_str || '').trim();
  const qUser = qa.screen_name || qa.username || userLegacy.screen_name || q.screen_name || q.username || '';
  const qText = cleanText(q.text || q.full_text || q.content || q.description || legacy.full_text || legacy.text || '');
  const qLang = (q.lang || q.language || legacy.lang || '').toLowerCase() || guessLang(qText);
  const qMedia = normalizeMedia(q, q);

  // GraphQL/syndication fallbacks can keep media under legacy or mediaDetails.
  if (!qMedia.photos.length && legacy.extended_entities?.media) {
    qMedia.photos = legacy.extended_entities.media
      .filter(m => m.type === 'photo')
      .map(m => m.media_url_https || m.media_url)
      .filter(Boolean);
  }
  if (!qMedia.photos.length && Array.isArray(q.mediaDetails)) {
    qMedia.photos = q.mediaDetails
      .filter(m => m.type === 'photo')
      .map(m => m.media_url_https || m.media_url)
      .filter(Boolean);
  }

  if (!qId && !qText && !qMedia.photos.length && !qMedia.video) return null;

  return {
    id: qId || 'quoted',
    user: qUser || 'x',
    text: qText,
    lang: qLang,
    authorName: qa.name || qa.display_name || userLegacy.name || qa.screen_name || qa.username || qUser || 'Autor cytowanego wpisu',
    authorUser: qa.screen_name || qa.username || userLegacy.screen_name || qUser || 'unknown',
    authorAvatar: avatarHd(qa.avatar_url || qa.avatar || qa.profile_image_url || userLegacy.profile_image_url_https || userLegacy.profile_image_url || null),
    verified: Boolean(qa.verified || qa.is_blue_verified || qa.blue_verified || qa.verified_type || coreUser.is_blue_verified || userLegacy.verified),
    stats: normalizeStats({ ...legacy, ...q }, q),
    media: qMedia,
    isQuoted: true
  };
}

function guessLang(text) {
  const s = text.toLowerCase();
  if (/[ąćęłńóśźż]/i.test(text)) return 'pl';
  if (/\b(el|la|los|las|una|que|hay|pero|simplemente|notan|diferencia|solo)\b/.test(s)) return 'es';
  if (/\b(the|and|or|with|without|you|this|that|from|only|what|who)\b/.test(s)) return 'en';
  return 'auto';
}

async function translateWithDeepL(text, from, to) {
  if (!DEEPL_API_KEY) throw new Error('Brak DEEPL_API_KEY');
  const host = DEEPL_API_KEY.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  const params = { text, target_lang: to.toUpperCase() };
  if (from && from !== 'auto') params.source_lang = from.toUpperCase();
  const body = new URLSearchParams(params);
  const res = await fetch(host, { method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const json = await res.json();
  if (res.ok && json.translations?.[0]?.text) return json.translations[0].text;
  throw new Error(`DeepL HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
}

async function translateWithGoogle(text, from, to) {
  const url = 'https://translate.googleapis.com/translate_a/single?' + new URLSearchParams({ client: 'gtx', sl: from && from !== 'auto' ? from : 'auto', tl: to, dt: 't', q: text });
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const json = await res.json();
  return (json?.[0] || []).map(x => x?.[0] || '').join('').trim() || text;
}

async function translateText(text, from, to) {
  if (!text) return '';

  if (DEEPL_API_KEY) {
    try {
      const out = await translateWithDeepL(text, from, to);
      console.log('DeepL OK');
      return out;
    } catch (e) {
      console.warn('DeepL failed, fallback Google:', e.message);
    }
  }

  try {
    const out = await translateWithGoogle(text, from, to);
    console.log('Google Translate OK');
    return out;
  } catch (e) {
    console.warn('Google Translate failed, showing original:', e.message);
  }

  return text;
}

async function maybeSummarize() {
  return '';
}

function buildNativeContent(tweet, translated, didTranslate, fx, hasVideo) {
  const header = `**${tweet.authorName} (@${tweet.authorUser})**`;
  const mode = didTranslate ? `🌍 **${langLabel(tweet.lang)} → PL**` : `**${langLabel(tweet.lang)} · bez tłumaczenia**`;
  const parts = [header, mode, '', truncate(translated || 'Brak tekstu.', didTranslate ? 650 : 1100)];
  parts.push('', `*Automatycznie ${didTranslate ? 'przetłumaczone' : 'bez tłumaczenia'}*`);
  if (hasVideo && VIDEO_LINK_MODE === 'player') {
    // Link musi być jawny, żeby Discord zrobił natywny odtwarzacz.
    parts.push('', fx);
  }
  return truncate(parts.join('\n'), 1900);
}

function buildFallbackEmbed(tweet, translated, didTranslate, imageUrl=null, note='') {
  const meta = buildMetaLine(tweet, didTranslate);
  const description = [meta ? `*${meta}*` : '', prettyText(truncate(translated || 'Brak tekstu.', 1300)), note].filter(Boolean).join('\n\n');
  const e = new EmbedBuilder()
    .setColor(didTranslate ? 0x00B7FF : 0x5865F2)
    .setAuthor({ name: authorLabel(tweet), iconURL: tweet.authorAvatar || undefined, url: xUrl(tweet.authorUser || tweet.user, tweet.id) })
    .setDescription(description);
  if (SHOW_FOOTER) e.setFooter({ text: didTranslate ? 'Przetłumaczono automatycznie' : 'Bez tłumaczenia' });
  if (imageUrl) e.setImage(imageUrl);
  return e;
}

async function getContentLength(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': 'Mozilla/5.0' } });
    const len = Number(res.headers.get('content-length') || 0);
    return Number.isFinite(len) ? len : 0;
  } catch { return 0; }
}

async function downloadLimited(url, limitBytes) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > limitBytes) throw new Error(`Plik przekracza limit ${Math.round(limitBytes/1024/1024)} MB`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}


async function bufferFromUrl(url, limitBytes) {
  const len = await getContentLength(url);
  if (len && len > limitBytes) throw new Error(`Plik za duży: ${Math.round(len/1024/1024)} MB`);
  return downloadLimited(url, limitBytes);
}

async function buildPhotoCollageBuffer(tweet) {
  const photos = tweet?.media?.photos?.slice(0, 4) || [];
  if (!photos.length) return null;

  const size = photos.length === 1 ? 900 : 448;
  const gap = photos.length === 1 ? 0 : 8;
  const cols = photos.length === 1 ? 1 : 2;
  const rows = photos.length <= 2 ? 1 : 2;
  const width = cols * size + (cols - 1) * gap;
  const height = rows * size + (rows - 1) * gap;

  const composites = [];
  for (let i = 0; i < photos.length; i++) {
    const input = await bufferFromUrl(photos[i], PHOTO_UPLOAD_LIMIT_BYTES);
    const resized = await sharp(input)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 88 })
      .toBuffer();
    composites.push({
      input: resized,
      left: (i % cols) * (size + gap),
      top: Math.floor(i / cols) * (size + gap)
    });
  }

  return sharp({
    create: { width, height, channels: 3, background: { r: 18, g: 18, b: 18 } }
  }).composite(composites).jpeg({ quality: 90 }).toBuffer();
}

async function buildPhotoCollage(tweet, filenamePrefix = 'tweet') {
  const out = await buildPhotoCollageBuffer(tweet);
  if (!out) return null;
  return new AttachmentBuilder(out, { name: safeFilename(`${filenamePrefix}-${tweet.id}-gallery.jpg`) });
}

async function stackCollages(topBuffer, bottomBuffer) {
  if (!topBuffer) return bottomBuffer;
  if (!bottomBuffer) return topBuffer;

  const targetWidth = 900;
  const gap = 18;

  const top = await sharp(topBuffer)
    .resize({ width: targetWidth, fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 90 })
    .toBuffer();
  const bottom = await sharp(bottomBuffer)
    .resize({ width: targetWidth, fit: 'inside', withoutEnlargement: false })
    .jpeg({ quality: 90 })
    .toBuffer();

  const topMeta = await sharp(top).metadata();
  const bottomMeta = await sharp(bottom).metadata();
  const width = Math.max(topMeta.width || targetWidth, bottomMeta.width || targetWidth);
  const height = (topMeta.height || 0) + gap + (bottomMeta.height || 0);

  return sharp({
    create: { width, height, channels: 3, background: { r: 18, g: 18, b: 18 } }
  }).composite([
    { input: top, left: Math.floor((width - (topMeta.width || width)) / 2), top: 0 },
    { input: bottom, left: Math.floor((width - (bottomMeta.width || width)) / 2), top: (topMeta.height || 0) + gap }
  ]).jpeg({ quality: 90 }).toBuffer();
}

async function buildCombinedMediaAttachment(tweet, quoted) {
  const mainHasPhotos = Boolean(tweet?.media?.photos?.length);
  const quoteHasPhotos = Boolean(quoted?.media?.photos?.length);
  if (!mainHasPhotos && !quoteHasPhotos) return null;

  const mainBuffer = mainHasPhotos ? await buildPhotoCollageBuffer(tweet) : null;
  const quoteBuffer = quoteHasPhotos ? await buildPhotoCollageBuffer(quoted) : null;
  const out = await stackCollages(mainBuffer, quoteBuffer);
  if (!out) return null;

  return new AttachmentBuilder(out, {
    name: safeFilename(`tweet-${tweet.id}-combined-gallery.jpg`)
  });
}

function buildMainEmbed(tweet, translated, didTranslate, imageAttachmentName = null, note = '', quotedContext = null) {
  const meta = buildMetaLine(tweet, didTranslate);
  const description = [
    meta ? `*${meta}*` : '',
    prettyText(truncate(translated || 'Brak tekstu.', 1200)),
    note
  ].filter(Boolean).join('\n\n');

  const e = new EmbedBuilder()
    .setColor(didTranslate ? 0x00B7FF : 0x5865F2)
    .setAuthor({
      name: authorLabel(tweet),
      iconURL: tweet.authorAvatar || undefined,
      url: xUrl(tweet.authorUser || tweet.user, tweet.id)
    })
    .setDescription(description);

  if (quotedContext) {
    e.addFields({
      name: '↪ Cytowany wpis',
      value: quotedContext.fieldValue
    });
  }

  if (SHOW_FOOTER) e.setFooter({ text: didTranslate ? 'Przetłumaczono automatycznie' : 'Bez tłumaczenia' });
  if (imageAttachmentName) e.setImage(`attachment://${imageAttachmentName}`);
  return e;
}

async function buildQuotedContext(quoted) {
  if (!quoted) return null;

  const shouldTranslateQuote = Boolean(quoted.text) && !IGNORE_LANGS.includes((quoted.lang || '').toLowerCase());
  let quotedDisplayText = quoted.text || 'Brak tekstu w cytowanym wpisie.';
  if (shouldTranslateQuote) {
    try {
      quotedDisplayText = await translateText(quoted.text, quoted.lang, TARGET_LANG);
    } catch (e) {
      console.warn('Nie udało się przetłumaczyć cytowanego wpisu:', e.message);
    }
  }

  const quoteUrl = quoted.id && quoted.id !== 'quoted'
    ? xUrl(quoted.authorUser || quoted.user, quoted.id)
    : null;
  const author = quoteUrl
    ? `### [${authorLabel(quoted)}](${quoteUrl})`
    : `### ${authorLabel(quoted)}`;
  const stats = buildStatsLine(quoted);
  const lines = [author];
  if (stats) lines.push(`*${stats}*`);
  lines.push('', prettyText(truncate(quotedDisplayText, 650)));

  if (quoted.media?.video && quoted.authorUser && quoted.id && quoted.id !== 'quoted') {
    lines.push('', `[🎥 Otwórz film z cytowanego wpisu](${fxUrl(quoted.authorUser, quoted.id)})`);
  }

  return {
    displayText: prettyText(quotedDisplayText),
    fieldValue: truncate(lines.join('\n'), 1024),
    plainText: truncate([
      `**↪ Cytowany wpis — ${authorLabel(quoted)}**`,
      stats ? `*${stats}*` : '',
      '',
      prettyText(quotedDisplayText),
      quoted.media?.video && quoted.authorUser && quoted.id && quoted.id !== 'quoted'
        ? `\n🎥 ${fxUrl(quoted.authorUser, quoted.id)}`
        : ''
    ].filter(Boolean).join('\n'), 850)
  };
}


function pickBestVideoUrl(video) {
  if (!video) return null;
  const variants = Array.isArray(video.variants) ? [...video.variants] : [];
  const usable = variants
    .filter(v => v?.url && /^https:\/\//i.test(v.url))
    .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0));
  return usable[0]?.url || video.url || null;
}

function buildComponentStats(tweet) {
  const stats = buildStatsLine(tweet);
  // Nie używamy już markdownowego "subtext" (-#), bo na desktopie i telefonie
  // statystyki były zbyt małe. Zwykły pogrubiony wiersz jest czytelniejszy.
  return stats ? `**${stats}**` : '';
}


function toLargeComponentText(text, level = 3) {
  const prefix = `${'#'.repeat(Math.min(3, Math.max(1, level)))} `;
  return prettyText(text || '')
    .split('\n')
    .map(line => line.trim() ? `${prefix}${line}` : '')
    .join('\n');
}

function buildVideoMainText(tweet, translated, didTranslate) {
  const authorUrl = xUrl(tweet.authorUser || tweet.user, tweet.id);
  const header = `## [${authorLabel(tweet)}](${authorUrl})`;
  const stats = buildComponentStats(tweet);
  const body = toLargeComponentText(truncate(translated || 'Brak tekstu.', 1300), 3);
  const top = [header, stats].filter(Boolean).join('\n');

  // Dwie nowe linie pomiędzy nagłówkiem/metadanymi a treścią wpisu dają
  // więcej oddechu i poprawiają czytelność bez zmiany układu mediów.
  return truncate(`${top}\n\n${body}`, 1800);
}

function buildVideoQuoteText(quoted, quotedContext) {
  if (!quoted || !quotedContext) return '';

  const quoteUrl = quoted.id && quoted.id !== 'quoted'
    ? xUrl(quoted.authorUser || quoted.user, quoted.id)
    : null;
  const author = quoteUrl
    ? `### [${authorLabel(quoted)}](${quoteUrl})`
    : `### ${authorLabel(quoted)}`;
  const stats = buildComponentStats(quoted);
  const body = toLargeComponentText(truncate(
    quotedContext.displayText || quoted.text || 'Brak tekstu w cytowanym wpisie.',
    850
  ), 3);

  const top = [
    '## ↪ Cytowany wpis',
    author,
    stats
  ].filter(Boolean).join('\n');

  return truncate(`${top}\n\n${body}`, 1400);
}

function buildComponentMediaGallery(tweet, labelPrefix = 'Media z wpisu') {
  if (!tweet?.media) return null;

  const items = [];
  const videoUrl = pickBestVideoUrl(tweet.media.video);

  // Wpis na X nie powinien mieszać filmu i zdjęć w jednej publikacji.
  // Jeżeli jednak API zwróci oba typy, priorytet ma odtwarzalne wideo/GIF.
  if (videoUrl) {
    items.push(
      new MediaGalleryItemBuilder()
        .setURL(videoUrl)
        .setDescription(`${labelPrefix}: ${authorLabel(tweet)}`)
    );
  } else {
    for (const [index, photoUrl] of (tweet.media.photos || []).slice(0, 4).entries()) {
      if (!photoUrl) continue;
      items.push(
        new MediaGalleryItemBuilder()
          .setURL(photoUrl)
          .setDescription(`${labelPrefix} — zdjęcie ${index + 1}: ${authorLabel(tweet)}`)
      );
    }
  }

  return items.length ? new MediaGalleryBuilder().addItems(...items) : null;
}

async function sendComponentsV2Tweet(message, tweet, translated, didTranslate, quotedContext) {
  const container = new ContainerBuilder()
    .setAccentColor(didTranslate ? 0x00B7FF : 0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(buildVideoMainText(tweet, translated, didTranslate))
    );

  // Najpierw media głównego wpisu — dokładnie pod jego tekstem.
  const mainGallery = buildComponentMediaGallery(tweet, 'Media głównego wpisu');
  if (mainGallery) {
    container.addMediaGalleryComponents(mainGallery);
  }

  // Dopiero potem cytowany wpis i jego własne media.
  if (quotedContext && tweet.quoted) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(buildVideoQuoteText(tweet.quoted, quotedContext))
      );

    const quotedGallery = buildComponentMediaGallery(tweet.quoted, 'Media cytowanego wpisu');
    if (quotedGallery) {
      container.addMediaGalleryComponents(quotedGallery);
    }
  }

  if (!mainGallery && !tweet.quoted?.media?.video && !(tweet.quoted?.media?.photos || []).length) {
    throw new Error('Brak bezpośrednich mediów dla Components V2');
  }

  return message.channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] }
  });
}

async function sendFxVideoFallback(message, tweet, translated, quotedContext, fx, summary = '') {
  const bodyParts = [];
  if (summary) bodyParts.push(`**W skrócie:** ${truncate(summary, 180)}`, '');
  bodyParts.push(prettyText(truncate(translated || 'Brak tekstu.', 900)));
  if (quotedContext) bodyParts.push('', '────────────', '', quotedContext.plainText);
  const playerLink = VIDEO_LINK_STYLE === 'spoiler' ? `||${fx}||` : fx;
  const content = [bodyParts.join('\n'), '', playerLink].join('\n');
  return message.channel.send({
    content: truncate(content, 1900),
    allowedMentions: { parse: [] }
  });
}

async function sendTweetMessage(message, tweet, translated, didTranslate, fx, originalX, summary = '') {
  const hasVideo = Boolean(tweet.media.video || tweet.quoted?.media?.video);
  const hasPhotos = Boolean(
    tweet.media.photos.length ||
    tweet.quoted?.media?.photos?.length
  );
  const hasMedia = hasVideo || hasPhotos;
  const quotedContext = await buildQuotedContext(tweet.quoted);

  // WSZYSTKIE MEDIA: zdjęcia, GIF-y i filmy korzystają z tego samego
  // czytelnego układu Components V2. Dzięki temu większa czcionka i hierarchia
  // z wersji filmowej działają też dla zwykłych wpisów ze zdjęciami.
  // Kolejność pozostaje logiczna:
  // główny wpis -> jego media -> cytowany wpis -> jego media.
  if (hasMedia && VIDEO_RENDER_MODE === 'components_v2') {
    try {
      return await sendComponentsV2Tweet(message, tweet, translated, didTranslate, quotedContext);
    } catch (e) {
      console.warn('Components V2 media failed, uruchamiam fallback:', e.message);
    }
  }

  // Wideo/GIF: awaryjnie korzystamy ze stabilnego playera FxTwitter.
  if (hasVideo) {
    return sendFxVideoFallback(message, tweet, translated, quotedContext, fx, summary);
  }

  // ZDJĘCIA: fallback do wcześniejszej, sprawdzonej galerii jako pojedynczy obraz.
  let mediaAttachment = null;
  try {
    mediaAttachment = await buildCombinedMediaAttachment(tweet, tweet.quoted);
  } catch (e) {
    console.warn('Nie udało się zbudować wspólnej galerii wpisu i cytatu:', e.message);
  }

  const displayText = summary
    ? `**W skrócie:** ${truncate(summary, 180)}\n\n${translated}`
    : translated;

  if (mediaAttachment) {
    const embed = buildMainEmbed(
      tweet,
      displayText,
      didTranslate,
      mediaAttachment.name,
      '',
      quotedContext
    );
    return message.channel.send({
      embeds: [embed],
      files: [mediaAttachment],
      allowedMentions: { parse: [] }
    });
  }

  // Wpis bez mediów albo awaryjny fallback tekstowy.
  const embed = buildMainEmbed(tweet, displayText, didTranslate, null, '', quotedContext);
  if (tweet.media.photos[0]) embed.setImage(tweet.media.photos[0]);
  else if (tweet.quoted?.media?.photos?.[0]) embed.setImage(tweet.quoted.media.photos[0]);

  return message.channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] }
  });
}

client.once('clientReady', c => {
  console.log(`Bot zalogowany jako ${c.user.tag}`);
  console.log(`Tłumaczenie na: ${TARGET_LANG}`);
  console.log(`Języki bez tłumaczenia, ale z wpisem: ${IGNORE_LANGS.join(', ')}`);
  console.log(`Tryb mediów: v40 czytelne Components V2 dla zdjęć, GIF-ów i filmów, DeepL -> Google fallback`);
  console.log(`Renderowanie wideo: ${VIDEO_RENDER_MODE}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;
  const m = message.content.match(X_RE);
  if (!m) return;

  const [, user, id] = m;
  const fx = fxUrl(user, id);
  const originalX = xUrl(user, id);

  try {
    const tweet = await getTweet(user, id);
    const shouldTranslate = !IGNORE_LANGS.includes(tweet.lang);
    const translated = shouldTranslate ? await translateText(tweet.text, tweet.lang, TARGET_LANG) : tweet.text;
    const summary = await maybeSummarize(translated);

    await sendTweetMessage(message, tweet, translated, shouldTranslate, fx, originalX, summary);

    if (DELETE_ORIGINAL_MESSAGE) {
      try { await message.delete(); } catch (e) { console.warn('Nie mogę usunąć oryginalnej wiadomości:', e.message); }
    }
  } catch (err) {
    console.error('Błąd obsługi wiadomości:', err);
    try { await message.channel.send({ content: 'Wystąpił błąd przy obsłudze tego wpisu.', allowedMentions: { parse: [] } }); } catch {}
  }
});

client.login(DISCORD_TOKEN);

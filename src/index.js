import http from 'node:http';
import { Buffer } from 'node:buffer';
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } from 'discord.js';
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
const SHOW_LANGUAGE_BADGE = String(process.env.SHOW_LANGUAGE_BADGE || 'false').toLowerCase() === 'true';
const SHOW_FOOTER = String(process.env.SHOW_FOOTER || 'false').toLowerCase() === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TRANSLATOR_PROVIDER = (process.env.TRANSLATOR_PROVIDER || 'auto').toLowerCase(); // auto | openai | deepl | google
const SHOW_STATS = String(process.env.SHOW_STATS || 'true').toLowerCase() === 'true';
const SHOW_SUMMARY = String(process.env.SHOW_SUMMARY || 'false').toLowerCase() === 'true';

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

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 DiscordBot TwitterTranslator' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} przy pobieraniu ${url}`);
  return res.json();
}

async function getTweet(user, id) {
  const apiUrls = [
    `https://api.fxtwitter.com/${user}/status/${id}`,
    `https://api.fxtwitter.com/status/${id}`
  ];
  let lastErr;
  for (const u of apiUrls) {
    try {
      const data = await fetchJson(u);
      const t = data.tweet || data.status || data;
      const author = t.author || data.author || {};
      const text = cleanText(t.text || t.full_text || t.content || '');
      const lang = (t.lang || t.language || data.lang || '').toLowerCase() || guessLang(text);
      const media = normalizeMedia(t, data);
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
        media
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

function guessLang(text) {
  const s = text.toLowerCase();
  if (/[ąćęłńóśźż]/i.test(text)) return 'pl';
  if (/\b(el|la|los|las|una|que|hay|pero|simplemente|notan|diferencia|solo)\b/.test(s)) return 'es';
  if (/\b(the|and|or|with|without|you|this|that|from|only|what|who)\b/.test(s)) return 'en';
  return 'auto';
}

async function callOpenAI(messages, temperature = 0.2) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: OPENAI_MODEL, temperature, messages })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json.choices?.[0]?.message?.content?.trim() || '';
}

async function translateWithOpenAI(text, from, to) {
  if (!OPENAI_API_KEY) throw new Error('Brak OPENAI_API_KEY');
  return callOpenAI([
    { role: 'system', content: 'Jesteś świetnym tłumaczem wpisów z X/Twittera na naturalny polski. Tłumacz sens, slang, ironię i kontekst piłkarski. Nie dodawaj komentarzy ani objaśnień. Zachowaj nazwy własne, emoji, liczby i ton wypowiedzi. Nie cenzuruj wulgaryzmów, tylko oddaj je naturalnie po polsku.' },
    { role: 'user', content: `Przetłumacz ten wpis z języka ${from || 'auto'} na ${to}. Zwróć wyłącznie tłumaczenie:\n\n${text}` }
  ], 0.15);
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
  const providers = [];
  if (TRANSLATOR_PROVIDER === 'openai' || TRANSLATOR_PROVIDER === 'gpt') providers.push('openai');
  else if (TRANSLATOR_PROVIDER === 'deepl') providers.push('deepl');
  else if (TRANSLATOR_PROVIDER === 'google') providers.push('google');
  else providers.push('openai', 'deepl', 'google');

  for (const provider of providers) {
    try {
      if (provider === 'openai' && OPENAI_API_KEY) return await translateWithOpenAI(text, from, to);
      if (provider === 'deepl' && DEEPL_API_KEY) return await translateWithDeepL(text, from, to);
      if (provider === 'google') return await translateWithGoogle(text, from, to);
    } catch (e) {
      console.warn(`${provider} fallback:`, e.message);
    }
  }
  return text;
}

async function maybeSummarize(text) {
  if (!SHOW_SUMMARY || !OPENAI_API_KEY || !text || text.length < 220) return '';
  try {
    return await callOpenAI([
      { role: 'system', content: 'Streszczaj tweety po polsku w jednym krótkim, naturalnym zdaniu. Bez komentarzy.' },
      { role: 'user', content: text }
    ], 0.2);
  } catch (e) {
    console.warn('summary fallback:', e.message);
    return '';
  }
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

async function buildPhotoCollage(tweet) {
  const photos = tweet.media.photos.slice(0, 4);
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

  const out = await sharp({
    create: { width, height, channels: 3, background: { r: 18, g: 18, b: 18 } }
  }).composite(composites).jpeg({ quality: 90 }).toBuffer();

  return new AttachmentBuilder(out, { name: safeFilename(`tweet-${tweet.id}-gallery.jpg`) });
}

function buildMainEmbed(tweet, translated, didTranslate, imageAttachmentName = null, note = '') {
  const meta = buildMetaLine(tweet, didTranslate);
  const description = [
    meta ? `*${meta}*` : '',
    prettyText(truncate(translated || 'Brak tekstu.', 1200)),
    note
  ].filter(Boolean).join('\n\n');

  const e = new EmbedBuilder()
    .setColor(didTranslate ? 0x00B7FF : 0x5865F2)
    .setAuthor({ name: authorLabel(tweet), iconURL: tweet.authorAvatar || undefined, url: xUrl(tweet.authorUser || tweet.user, tweet.id) })
    .setDescription(description);

  if (SHOW_FOOTER) e.setFooter({ text: didTranslate ? 'Przetłumaczono automatycznie' : 'Bez tłumaczenia' });
  if (imageAttachmentName) e.setImage(`attachment://${imageAttachmentName}`);
  return e;
}

async function sendTweetMessage(message, tweet, translated, didTranslate, fx, originalX, summary = '') {
  const hasVideo = Boolean(tweet.media.video);
  const hasPhotos = tweet.media.photos.length > 0 && !hasVideo;

  // VIDEO: jedna wiadomość bez dodatkowego embeda.
  // Discord nie pozwala botom edytować treści karty FxTwitter, ale gdy tekst + link są w tej samej wiadomości,
  // dostajesz jeden wpis bota: tłumaczenie na górze i odtwarzalny player pod spodem.
  if (hasVideo) {
    // VIDEO: minimalistyczny układ, bo FxTwitter i tak pokazuje statystyki, autora i player.
    // Celowo NIE dodajemy tutaj statystyk ani etykiet typu 'automatyczne tłumaczenie', żeby nie dublować informacji.
    const header = `**[${authorLabel(tweet)}](${originalX})**`;
    const bodyParts = [];
    if (summary) bodyParts.push(`**W skrócie:** ${truncate(summary, 180)}`, '');
    bodyParts.push(prettyText(truncate(translated || 'Brak tekstu.', 1000)));

    // Link FxTwitter musi być jawny w wiadomości, żeby Discord wyrenderował odtwarzacz.
    const content = [
      header,
      '',
      bodyParts.join('\n'),
      '',
      fx
    ].filter(x => x !== '').join('\n');

    return message.channel.send({ content: truncate(content, 1900), allowedMentions: { parse: [] } });
  }

  // ZDJĘCIA: jedna skondensowana galeria 1/2/4 w jednym embedzie.
  if (hasPhotos) {
    try {
      const collage = await buildPhotoCollage(tweet);
      if (collage) {
        const embed = buildMainEmbed(tweet, summary ? `**W skrócie:** ${truncate(summary, 180)}\n\n${translated}` : translated, didTranslate, collage.name);
        return await message.channel.send({ embeds: [embed], files: [collage], allowedMentions: { parse: [] } });
      }
    } catch (e) {
      console.warn('Nie udało się zrobić galerii zdjęć, fallback do pierwszego zdjęcia:', e.message);
    }

    const embed = buildFallbackEmbed(tweet, summary ? `**W skrócie:** ${truncate(summary, 180)}\n\n${translated}` : translated, didTranslate, tweet.media.photos[0], 'Nie udało się złożyć galerii, więc pokazuję pierwsze zdjęcie.');
    return message.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  const embed = buildMainEmbed(tweet, summary ? `**W skrócie:** ${truncate(summary, 180)}\n\n${translated}` : translated, didTranslate);
  return message.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
}

client.once('clientReady', c => {
  console.log(`Bot zalogowany jako ${c.user.tag}`);
  console.log(`Tłumaczenie na: ${TARGET_LANG}`);
  console.log(`Języki bez tłumaczenia, ale z wpisem: ${IGNORE_LANGS.join(', ')}`);
  console.log(`Tryb mediów: v25 clean video + pro photo UI + OpenAI/DeepL fallback`);
});
client.once('ready', c => console.log(`Bot zalogowany jako ${c.user.tag}`));

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

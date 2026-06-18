import http from 'node:http';
import { Buffer } from 'node:buffer';
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
        authorAvatar: author.avatar_url || author.avatar || author.profile_image_url || null,
        media
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Nie udało się pobrać tweeta.');
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

async function translateText(text, from, to) {
  if (!text) return '';
  if (DEEPL_API_KEY) {
    try {
      const host = DEEPL_API_KEY.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
      const key = DEEPL_API_KEY;
      const params = { text, target_lang: to.toUpperCase() };
      if (from && from !== 'auto') params.source_lang = from.toUpperCase();
      const body = new URLSearchParams(params);
      const res = await fetch(host, { method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const json = await res.json();
      if (res.ok && json.translations?.[0]?.text) return json.translations[0].text;
      console.warn('DeepL fallback:', JSON.stringify(json).slice(0, 300));
    } catch (e) { console.warn('DeepL błąd:', e.message); }
  }
  const url = 'https://translate.googleapis.com/translate_a/single?' + new URLSearchParams({ client: 'gtx', sl: from && from !== 'auto' ? from : 'auto', tl: to, dt: 't', q: text });
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Błąd tłumaczenia HTTP ${res.status}`);
  const json = await res.json();
  return (json?.[0] || []).map(x => x?.[0] || '').join('').trim() || text;
}

function buildButtons(fx, x) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Otwórz player').setURL(fx),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Otwórz na X').setURL(x)
  );
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
  const e = new EmbedBuilder()
    .setColor(didTranslate ? 0x00AEEF : 0x5865F2)
    .setAuthor({ name: `${tweet.authorName} (@${tweet.authorUser})`, iconURL: tweet.authorAvatar || undefined })
    .setTitle(didTranslate ? `🌍 ${langLabel(tweet.lang)} → PL` : `${langLabel(tweet.lang)} · bez tłumaczenia`)
    .setDescription([truncate(translated || 'Brak tekstu.', 1200), note].filter(Boolean).join('\n\n'))
    .setFooter({ text: didTranslate ? 'Automatyczne tłumaczenie' : 'Oryginał bez tłumaczenia' });
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
  const e = new EmbedBuilder()
    .setColor(didTranslate ? 0x00AEEF : 0x5865F2)
    .setAuthor({ name: `${tweet.authorName} (@${tweet.authorUser})`, iconURL: tweet.authorAvatar || undefined })
    .setTitle(didTranslate ? `🌍 ${langLabel(tweet.lang)} → PL` : `${langLabel(tweet.lang)} · bez tłumaczenia`)
    .setDescription([
      truncate(translated || 'Brak tekstu.', 950),
      didTranslate && tweet.text ? `**Oryginał**\n${truncate(tweet.text, 520)}` : '',
      note
    ].filter(Boolean).join('\n\n'))
    .setFooter({ text: `Tweet ID: ${tweet.id} · ${didTranslate ? 'auto' : 'oryginał'}` });
  if (imageAttachmentName) e.setImage(`attachment://${imageAttachmentName}`);
  return e;
}

async function sendTweetMessage(message, tweet, translated, didTranslate, fx, originalX) {
  const hasVideo = Boolean(tweet.media.video);
  const hasPhotos = tweet.media.photos.length > 0 && !hasVideo;
  const components = [buildButtons(fx, originalX)];

  // VIDEO: najczyściej = najpierw przetłumaczony wpis, potem player FxTwitter pod spodem.
  if (hasVideo) {
    const embed = buildMainEmbed(tweet, translated, didTranslate, null, '🎬 **Wideo poniżej.**');
    await message.channel.send({ embeds: [embed], components, allowedMentions: { parse: [] } });
    // Druga wiadomość jest celowa: wtedy Discord renderuje odtwarzacz FxTwitter POD przetłumaczonym wpisem.
    if (VIDEO_LINK_MODE === 'player') {
      await new Promise(r => setTimeout(r, 350));
      return message.channel.send({ content: fx, allowedMentions: { parse: [] } });
    }
    return null;
  }

  // ZDJĘCIA: jedna skondensowana galeria 1/2/4 w jednym embedzie.
  if (hasPhotos) {
    try {
      const collage = await buildPhotoCollage(tweet);
      if (collage) {
        const embed = buildMainEmbed(tweet, translated, didTranslate, collage.name);
        return await message.channel.send({ embeds: [embed], files: [collage], components, allowedMentions: { parse: [] } });
      }
    } catch (e) {
      console.warn('Nie udało się zrobić galerii zdjęć, fallback do pierwszego zdjęcia:', e.message);
    }

    const embed = buildFallbackEmbed(tweet, translated, didTranslate, tweet.media.photos[0], 'Nie udało się złożyć galerii, więc pokazuję pierwsze zdjęcie.');
    return message.channel.send({ embeds: [embed], components, allowedMentions: { parse: [] } });
  }

  const embed = buildMainEmbed(tweet, translated, didTranslate);
  return message.channel.send({ embeds: [embed], components, allowedMentions: { parse: [] } });
}

client.once('clientReady', c => {
  console.log(`Bot zalogowany jako ${c.user.tag}`);
  console.log(`Tłumaczenie na: ${TARGET_LANG}`);
  console.log(`Języki bez tłumaczenia, ale z wpisem: ${IGNORE_LANGS.join(', ')}`);
  console.log(`Tryb mediów: v16 clean layout - no original text in embeds, compact photo gallery, video below tweet`);
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

    await sendTweetMessage(message, tweet, translated, shouldTranslate, fx, originalX);

    if (DELETE_ORIGINAL_MESSAGE) {
      try { await message.delete(); } catch (e) { console.warn('Nie mogę usunąć oryginalnej wiadomości:', e.message); }
    }
  } catch (err) {
    console.error('Błąd obsługi wiadomości:', err);
    try { await message.channel.send({ content: 'Wystąpił błąd przy obsłudze tego wpisu.', allowedMentions: { parse: [] } }); } catch {}
  }
});

client.login(DISCORD_TOKEN);

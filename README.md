# Twitter Translator v33 — bez OpenAI

Wersja usuwa całkowicie OpenAI z kodu. Tłumaczenie działa w kolejności:

1. DeepL, jeśli ustawisz `DEEPL_API_KEY`
2. Google Translate jako fallback
3. Jeśli oba padną, bot pokazuje oryginalny tekst

## Render — zmienne, które zostawić

```env
DISCORD_TOKEN=...
DEEPL_API_KEY=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
SHOW_FOOTER=false
SHOW_LANGUAGE_BADGE=false
SHOW_STATS=true
VIDEO_LINK_MODE=player
VIDEO_LINK_STYLE=plain
```

## Render — zmienne, które można usunąć

```env
OPENAI_API_KEY
OPENAI_MODEL
TRANSLATOR_PROVIDER
SHOW_SUMMARY
SUPPRESS_ORIGINAL_EMBED
MAX_VIDEO_UPLOAD_MB
UPLOAD_VIDEO_ATTACHMENT
VIDEO_FALLBACK_LINK_MODE
```

## Deploy

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

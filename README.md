# Twitter Translator Discord Bot — v16 Clean

Układ dopracowany pod czytelność:

- usuwa oryginalną wiadomość z linkiem,
- pokazuje tylko tłumaczenie, bez sekcji „Oryginał” w embedzie,
- angielskie i polskie wpisy pokazuje bez tłumaczenia,
- zdjęcia składa w jedną skondensowaną galerię 1/2/4,
- przy video: najpierw czysty embed z tekstem, potem player FxTwitter pod spodem,
- DeepL jest używany jako główny tłumacz, jeśli dodasz `DEEPL_API_KEY`; bez klucza działa fallback.

## Render — zmienne

```env
DISCORD_TOKEN=twój_token
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
DEEPL_API_KEY=twój_klucz_deepl_opcjonalnie
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
```

Usuń stare zmienne typu:

```env
MAX_VIDEO_UPLOAD_MB
UPLOAD_VIDEO_ATTACHMENT
VIDEO_FALLBACK_LINK_MODE
```

## Komendy Render

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

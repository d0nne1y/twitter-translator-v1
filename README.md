# Twitter Translator v23 polished UI

Wersja kosmetyczna:
- czystszy embed dla zdjęć,
- skondensowana galeria zdjęć jak wcześniej,
- video: autor + tekst + player FxTwitter pod spodem,
- bez etykiet typu „Automatyczne tłumaczenie”,
- autor jest linkiem do oryginalnego wpisu,
- opcjonalny badge języka przez `SHOW_LANGUAGE_BADGE=true`.

## Render ENV
Zalecane:

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
SHOW_LANGUAGE_BADGE=false
SHOW_FOOTER=false
DEEPL_API_KEY=opcjonalnie
```

Jeżeli chcesz pokazywać np. `🇵🇹 → 🇵🇱`, ustaw:

```env
SHOW_LANGUAGE_BADGE=true
```

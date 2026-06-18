# Twitter Translator v22 — clean no labels

Zmiany:
- usunięto stopkę „Automatyczne tłumaczenie” / „Bez tłumaczenia”,
- autor dalej jest linkiem do oryginalnego wpisu,
- zdjęcia zostają jako skondensowana galeria,
- video: tłumaczenie + surowy FxTwitter link, bo tylko tak Discord stabilnie robi player.

Render env:
```
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
VIDEO_LINK_MODE=player
PHOTO_UPLOAD_LIMIT_MB=8
DEEPL_API_KEY=opcjonalnie
```

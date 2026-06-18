# Twitter Translator v21 – clean layout

Zmiany:
- usunięte nagłówki typu `Hiszpański → PL` / `Angielski · bez tłumaczenia`,
- autor tweeta jest klikalny i prowadzi do oryginalnego wpisu na X,
- zdjęcia zostają jako skondensowana galeria,
- video: czysty tekst + link FxTwitter, żeby Discord stabilnie zrobił player pod wiadomością,
- `Oryginał` nie jest pokazywany w embedzie,
- DeepL jako główny tłumacz, Google jako fallback.

Render env:
```
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
DEEPL_API_KEY=opcjonalnie
```

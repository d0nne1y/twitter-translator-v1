# Twitter Translator v28 — video minimal, zdjęcia bez zmian

Zmiany:
- dla wpisów z video bot wysyła tylko przetłumaczony tekst + link FxTwitter, bez autora i bez napisu „Odtwarzacz wpisu”;
- przerwa między tekstem a linkiem zostaje;
- zdjęcia zostają jak wcześniej: skondensowana galeria w embedzie;
- FxTwitter link musi być widoczny, żeby Discord wygenerował player.

Render — zalecane zmienne:

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_STYLE=plain
TRANSLATOR_PROVIDER=auto
OPENAI_API_KEY=... # opcjonalnie
DEEPL_API_KEY=... # opcjonalnie
```

Nie wrzucaj `.env` na GitHuba.

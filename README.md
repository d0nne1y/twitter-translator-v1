# Twitter Translator v25 — clean video + pro photo UI

Najważniejsze zmiany:
- VIDEO: bardzo czysty układ — autor + tekst + FxTwitter player. Bez statystyk w górnej wiadomości, bo statystyki są już w playerze FxTwitter.
- ZDJĘCIA: zostaje profesjonalny embed ze skondensowaną galerią i statystykami.
- Bez sekcji „Oryginał”.
- OpenAI/DeepL/Google fallback zostaje.

## Render ENV
Zalecane:

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
TRANSLATOR_PROVIDER=auto
OPENAI_API_KEY=opcjonalnie
OPENAI_MODEL=gpt-4o-mini
DEEPL_API_KEY=opcjonalnie
SHOW_STATS=true
SHOW_SUMMARY=false
SHOW_LANGUAGE_BADGE=false
SHOW_FOOTER=false
```

Dla najlepszego tłumaczenia wpisów/memów ustaw `OPENAI_API_KEY`. Jeśli go nie podasz, bot użyje DeepL/Google fallback.

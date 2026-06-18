# Twitter Translator v24 Pro UI + AI

Wersja kosmetyczna i translatorska:
- zdjęcia jako skondensowana galeria,
- video jako stabilny player FxTwitter,
- bez sekcji „Oryginał”,
- autor jako link do wpisu,
- opcjonalne statystyki tweeta,
- opcjonalne streszczenie,
- tłumaczenie: OpenAI → DeepL → Google fallback.

## Render – Environment Variables

Wymagane:

```env
DISCORD_TOKEN=token_bota
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
VIDEO_LINK_MODE=player
PHOTO_UPLOAD_LIMIT_MB=8
```

Polecane:

```env
OPENAI_API_KEY=twój_klucz_openai
OPENAI_MODEL=gpt-4o-mini
TRANSLATOR_PROVIDER=auto
SHOW_STATS=true
SHOW_LANGUAGE_BADGE=false
SHOW_FOOTER=false
SHOW_SUMMARY=false
```

Opcjonalnie DeepL:

```env
DEEPL_API_KEY=twój_klucz_deepl
```

`TRANSLATOR_PROVIDER=auto` oznacza: najpierw OpenAI, potem DeepL, potem Google.
Jeśli chcesz wymusić jeden silnik: `openai`, `deepl` albo `google`.

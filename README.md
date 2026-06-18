# Twitter Translator v27 — video spacing polish

Zmiany:
- video: pogrubiony autor jako link do X,
- większy odstęp między autorem a tekstem,
- podpis `🎬 Odtwarzacz wpisu` przed playerem,
- opcjonalny test ukrytego linku FxTwitter przez `VIDEO_LINK_STYLE=spoiler`,
- zdjęcia bez zmian: skondensowana galeria,
- bez sekcji Oryginał.

## Render — zmienne

Zostaw:

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
SHOW_FOOTER=false
SHOW_LANGUAGE_BADGE=false
```

Opcjonalnie dodaj:

```env
VIDEO_LINK_STYLE=labeled
```

Możliwe wartości:
- `labeled` — polecane: pokazuje `🎬 Odtwarzacz wpisu` + link, player działa stabilnie,
- `plain` — sam link bez podpisu,
- `spoiler` — test ukrytego linku; jeśli player się nie pokaże, wróć na `labeled`.

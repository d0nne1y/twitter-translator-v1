# Twitter Translator v17 – one-message video layout

Zmiany:
- wideo próbuje renderować się w tej samej wiadomości bota co tłumaczenie,
- zdjęcia dalej jako skondensowana galeria,
- bez sekcji Oryginał,
- EN/PL bez tłumaczenia,
- inne języki tłumaczone na PL,
- DeepL używany, jeśli ustawisz prawdziwy DEEPL_API_KEY.

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

# Twitter Translator v19 No Buttons

Układ:
- brak przycisków `Otwórz player` / `Otwórz na X`,
- zdjęcia: skondensowana galeria w jednym embedzie,
- video: najpierw czysty wpis/tłumaczenie, potem osobna wiadomość z linkiem FxTwitter, żeby Discord wyrenderował odtwarzacz,
- bez sekcji Oryginał,
- EN/PL bez tłumaczenia,
- inne języki tłumaczy na PL,
- usuwa oryginalną wiadomość, jeśli `DELETE_ORIGINAL_MESSAGE=true`.

## Render env

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
VIDEO_LINK_MODE=player
PHOTO_UPLOAD_LIMIT_MB=8
DEEPL_API_KEY=opcjonalnie
```

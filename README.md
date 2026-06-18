# Twitter Translator v18 Stable Video

Stabilny układ:
- zdjęcia: skondensowana galeria w jednym embedzie,
- video: najpierw wpis/tłumaczenie w embedzie, potem osobna wiadomość z linkiem FxTwitter, żeby Discord zawsze wyrenderował odtwarzacz,
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

Nie używaj już `MAX_VIDEO_UPLOAD_MB`, `UPLOAD_VIDEO_ATTACHMENT`, `VIDEO_FALLBACK_LINK_MODE`.

# Twitter Translator v20 - Video single message

Zmiany:
- video: brak dodatkowego embeda u góry; bot wysyła tłumaczenie i link FxTwitter w jednej wiadomości, więc player renderuje się pod tłumaczeniem,
- zdjęcia: nadal skondensowana galeria w jednym embedzie,
- EN/PL pokazuje bez tłumaczenia, inne języki tłumaczy na PL,
- DELETE_ORIGINAL_MESSAGE usuwa oryginalny link użytkownika.

Render env:
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
VIDEO_LINK_MODE=player
PHOTO_UPLOAD_LIMIT_MB=8
DEEPL_API_KEY=opcjonalnie

# Twitter Translator v26 – polished video layout

Zmiany względem v25:
- video ma większy odstęp między autorem a tłumaczeniem,
- video ma czystszy układ: autor → tekst → player FxTwitter,
- zdjęcia zostają bez zmian: skondensowana galeria,
- link FxTwitter nadal musi być widoczny, bo tylko wtedy Discord generuje odtwarzalny player.

Render:
```env
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
SHOW_STATS=true
SHOW_SUMMARY=false
TRANSLATOR_PROVIDER=auto
```

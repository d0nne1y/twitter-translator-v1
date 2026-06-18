# Twitter Translator v15 - final layout

Układ dopasowany do Twoich screenów:

- wiadomość użytkownika z linkiem jest usuwana,
- **video:** najpierw przetłumaczony wpis/tweet, potem pod nim player FxTwitter,
- **zdjęcia:** skondensowana galeria 1/2/4 w jednym embedzie,
- EN/PL pokazuje bez tłumaczenia,
- inne języki tłumaczy na PL,
- DeepL działa przez `DEEPL_API_KEY`, a bez niego jest fallback.

## Render

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

Environment Variables:

```env
DISCORD_TOKEN=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
VIDEO_LINK_MODE=player
DEEPL_API_KEY=opcjonalnie
```

Usuń stare zmienne od uploadu video, jeśli jeszcze są:

```env
UPLOAD_VIDEO_ATTACHMENT
MAX_VIDEO_UPLOAD_MB
VIDEO_FALLBACK_LINK_MODE
```

Wymagane uprawnienia bota na Discordzie:

- Wyświetlanie kanałów
- Wysyłanie wiadomości
- Osadzanie linków
- Czytanie historii czatu
- Zarządzanie wiadomościami, jeśli `DELETE_ORIGINAL_MESSAGE=true`

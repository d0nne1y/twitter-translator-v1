# Twitter Translator v29 — cytowane wpisy

Zmiany:
- bot pokazuje cytowane wpisy/reposty z komentarzem jako dodatkowy embed pod głównym wpisem;
- jeśli cytowany wpis ma zdjęcie/zdjęcia, bot robi z nich skondensowaną galerię;
- video zostaje w minimalistycznym trybie: sam tekst + link FxTwitter, żeby Discord wygenerował player;
- układ dla zwykłych zdjęć zostaje bez zmian.

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

Nie wrzucaj `.env` ani `node_modules` na GitHuba.

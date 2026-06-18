# Twitter Translator v39 — większy tekst

Zmiany względem v38:

- większy tekst głównego wpisu w Components V2,
- większy tekst cytowanego wpisu,
- wyraźniejsza hierarchia: autor jako nagłówek poziomu 2, treść jako poziom 3,
- kolejność mediów pozostaje bez zmian: główny wpis → jego media → cytowany wpis → jego media,
- zwykłe wpisy ze zdjęciami pozostają bez zmian.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością tej paczki.
2. Zrób commit.
3. Render wykona redeploy.
4. Zostaw `VIDEO_RENDER_MODE=components_v2`.

Discord nie pozwala ustawić dowolnego rozmiaru czcionki. Ta wersja używa nagłówków Markdown w `TextDisplay`, aby tekst był realnie większy.

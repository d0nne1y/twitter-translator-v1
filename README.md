# Twitter Translator v40 — większy tekst także przy zdjęciach

Zmiany względem v39:

- ten sam czytelny układ Components V2 działa teraz także dla wpisów ze zdjęciami,
- autor głównego wpisu i cytatu mają większe nagłówki,
- treść głównego i cytowanego wpisu jest większa,
- zdjęcia nadal układają się automatycznie w zwartą galerię (do 4 zdjęć),
- kolejność pozostaje logiczna: główny wpis → jego zdjęcia/film → cytowany wpis → jego zdjęcia/film,
- filmy i GIF-y pozostają bez zmian,
- jeżeli Components V2 nie przyjmie mediów, bot automatycznie użyje wcześniejszego fallbacku.

## Wdrożenie

1. Rozpakuj ZIP.
2. Nadpisz pliki w repozytorium na GitHubie.
3. Zrób commit.
4. Render wykona automatyczny redeploy.

Nie zmieniaj zmiennych środowiskowych. Zostaw:

```env
VIDEO_RENDER_MODE=components_v2
```

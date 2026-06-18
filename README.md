# Twitter Translator v37 — media przypisane do właściwego wpisu

Ta wersja poprawia układ wpisów z cytatem i wideo/GIF-em w Discord Components V2.

## Co zostało poprawione

- media głównego wpisu pojawiają się **bezpośrednio pod tekstem głównego wpisu**,
- dopiero niżej pojawia się sekcja **Cytowany wpis**,
- media cytowanego wpisu pojawiają się **bezpośrednio pod jego tekstem**,
- jeśli główny wpis ma wideo, a cytowany wpis ma własne wideo lub zdjęcia, media nie są już wrzucane razem na sam dół,
- w sekcji cytowanego wpisu nie pojawia się zbędny link FxTwitter, gdy Components V2 działa poprawnie,
- układ zwykłych wpisów ze zdjęciami pozostaje bez zmian.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością paczki.
2. Zrób commit.
3. Render uruchomi automatyczny deploy.
4. Zostaw ustawienie:

```env
VIDEO_RENDER_MODE=components_v2
```

Pozostałych zmiennych środowiskowych nie trzeba zmieniać.

## Oczekiwany układ

```text
Autor głównego wpisu
Tekst głównego wpisu
[WIDEO / GIF / ZDJĘCIA GŁÓWNEGO WPISU]

────────────
Cytowany wpis
Tekst cytowanego wpisu
[WIDEO / GIF / ZDJĘCIA CYTOWANEGO WPISU]
```

Jeżeli Discord odrzuci bezpośredni adres MP4, bot nadal użyje dotychczasowego fallbacku FxTwitter.

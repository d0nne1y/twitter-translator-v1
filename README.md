# Twitter Translator v42 — czyste klikalne nazwy autorów

Ta wersja naprawia literalne wyświetlanie składni Markdown i usuwa `@handle` z nagłówków.

## Zmiany

- wyświetlana jest tylko nazwa autora, bez `(@handle)`,
- nazwa autora jest hiperłączem do konkretnego wpisu na X,
- surowy adres X nie pojawia się jako osobna linia,
- poprawiona składnia linku Markdown w Discord Components V2,
- działa dla wpisu głównego i cytowanego,
- zdjęcia, GIF-y, filmy i kolejność mediów pozostają bez zmian.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością tej paczki.
2. Zrób commit.
3. Render wykona redeploy.
4. Nie zmieniaj zmiennych środowiskowych.

Zostaw:

```env
VIDEO_RENDER_MODE=components_v2
```

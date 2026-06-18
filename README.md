# Twitter Translator v41 — poprawione hiperłącza autorów

Ta wersja naprawia przypadek, w którym Discord pokazywał surowy adres X pod nickiem autora zamiast robić z nicku klikalne hiperłącze.

## Zmiany

- autor głównego wpisu jest klikalnym linkiem do oryginalnego posta,
- autor cytowanego wpisu również jest klikalny,
- surowy URL nie powinien już pojawiać się pod nickiem,
- bez zmian w układzie zdjęć, filmów, GIF-ów i cytowanych wpisów,
- media nadal są przypisane do właściwego wpisu.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością tej paczki.
2. Zrób commit.
3. Render wykona redeploy.
4. Nie zmieniaj zmiennych środowiskowych.

Zostaw:

```env
VIDEO_RENDER_MODE=components_v2
```

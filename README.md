# Twitter Translator v45 — uniwersalne linki autorów

Ta wersja poprawia klikalne nazwy autorów w Discord Components V2.

## Co się zmieniło

- usunięto niestabilny zapis linków z `(<https://...>)`,
- linki używają standardowego Markdown: `[nazwa](https://...)`,
- dla nazw zawierających emoji, `™`, `#`, nawiasy lub inne ryzykowne znaki bot automatycznie używa bezpiecznego handle bez `@`,
- handle z `_` jest poprawnie escapowany,
- poprawka działa dla wpisu głównego i cytowanego,
- avatar, galerie, video/GIF i układ cytatu pozostają bez zmian.

## Render

- Build Command: `npm ci --no-audit --no-fund`
- Start Command: `npm start`
- `VIDEO_RENDER_MODE=components_v2`

Pozostałe zmienne środowiskowe zostają bez zmian.

# Twitter Translator v43 — poprawione linki autorów

Ta wersja naprawia przypadki, w których przy wpisach ze zdjęciami Discord pokazywał:

```text
[Nazwa autora]
(https://x.com/...)
```

zamiast klikalnej nazwy.

## Co poprawiono

- nazwa autora głównego wpisu jest klikalna także przy zdjęciach,
- obsługiwane są handle z `_`,
- obsługiwane są nazwy zawierające `#` i inne znaki Markdown,
- cytowany wpis nadal ma własne poprawne hiperłącze,
- usunięto `@handle` z wyświetlanego nagłówka,
- układ zdjęć, wideo i GIF-ów pozostał bez zmian.

## Wdrożenie

Nadpisz pliki w repozytorium i wykonaj redeploy na Renderze. Zmiennych środowiskowych nie trzeba zmieniać.

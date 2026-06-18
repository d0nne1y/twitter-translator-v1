# Twitter Translator v34 — cytowane wpisy naprawione

Ta wersja bazuje bezpośrednio na przesłanym projekcie v33 i poprawia obsługę cytowanych wpisów.

## Najważniejsza poprawka

W poprzedniej wersji cytowany wpis mógł zostać poprawnie pobrany, ale nie był dołączany do wiadomości Discorda, gdy główny wpis nie zawierał własnego zdjęcia ani filmu. To dotyczyło dokładnie przypadków typu:

- główny wpis: sam tekst,
- pod nim na X: cytowany wpis ze zdjęciem lub filmem.

v34 dołącza cytowany wpis także w tym układzie.

## Dodatkowe zabezpieczenia

- obsługa `tweet.quote` zgodnie z API FxTwitter,
- dodatkowe warianty nazw pól i zagnieżdżonych odpowiedzi,
- fallback przez `api.vxtwitter.com`,
- fallback przez Twitter Syndication z tokenem,
- dociąganie cytowanego wpisu po ID lub adresie URL,
- galeria zdjęć cytowanego wpisu,
- tłumaczenie cytowanego wpisu, jeśli jego język nie znajduje się w `IGNORE_LANGS`,
- brak podwójnego komunikatu startowego `ready`.

## Render — zmienne

Nie musisz dodawać żadnych nowych zmiennych. Zostaw:

```env
DISCORD_TOKEN=...
DEEPL_API_KEY=...
TARGET_LANG=pl
IGNORE_LANGS=en,pl
DELETE_ORIGINAL_MESSAGE=true
PHOTO_UPLOAD_LIMIT_MB=8
SHOW_FOOTER=false
SHOW_LANGUAGE_BADGE=false
SHOW_STATS=true
VIDEO_LINK_MODE=player
VIDEO_LINK_STYLE=plain
```

## Deploy

```bash
npm install
npm start
```

Po wdrożeniu przetestuj wpis, który cytuje inny wpis. W logach zobaczysz jedną z informacji:

```text
Dociągnięto cytowany wpis przez FxTwitter: ...
Znaleziono cytowany wpis przez syndication dla ...
Brak cytowanego wpisu w danych dla ...
```

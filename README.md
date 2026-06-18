# Twitter Translator v44 — avatary autorów

Ta wersja dodaje aktualne zdjęcie profilowe autora z X obok jego nazwy w wiadomościach Discord Components V2.

## Co zmieniono

- avatar głównego autora jest wyświetlany obok klikalnej nazwy konta i statystyk,
- avatar autora cytowanego wpisu jest wyświetlany w jego osobnej sekcji,
- avatar pobierany jest z danych FxTwitter/VxTwitter i używana jest wersja wyższej jakości, jeżeli adres ją udostępnia,
- jeśli źródło nie zwróci avatara, bot automatycznie użyje dotychczasowego nagłówka bez obrazka,
- kolejność tekstu, zdjęć, GIF-ów, filmów oraz cytowanych wpisów pozostaje bez zmian.

Discord wyświetla miniaturę jako akcesorium sekcji, dlatego avatar znajduje się po prawej stronie bloku autora.

## Wdrożenie

1. Nadpisz obecne pliki zawartością paczki.
2. Zrób commit na GitHubie.
3. Poczekaj na redeploy Rendera.

Nie trzeba zmieniać zmiennych środowiskowych. Zostaw:

```env
VIDEO_RENDER_MODE=components_v2
```

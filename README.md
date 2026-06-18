# Twitter Translator v38 — czytelniejszy układ Components V2

Ta wersja zachowuje poprawne przypisanie mediów z v37, ale poprawia czytelność tekstu w wiadomościach z wideo/GIF-em i cytowanym wpisem.

## Zmiany

- autor głównego wpisu jest większym nagłówkiem Markdown,
- nagłówek **Cytowany wpis** jest większy i wyraźniej oddzielony,
- statystyki nie są już renderowane jako bardzo mały tekst `-#`,
- pomiędzy autorem/statystykami a treścią jest większy odstęp,
- separator przed cytowanym wpisem ma większą wysokość,
- media nadal pozostają dokładnie przy wpisie, do którego należą,
- zwykłe wpisy ze zdjęciami pozostają bez zmian.

## Ważne ograniczenie Discorda

Bot nie może ustawić dowolnego rozmiaru czcionki w pikselach. Components V2 obsługuje jednak Markdown, dlatego wersja v38 wykorzystuje nagłówki `###`, pogrubienie oraz większe odstępy, aby uzyskać najbardziej czytelny układ.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością paczki.
2. Zrób commit.
3. Render uruchomi automatyczny deploy.
4. Zostaw:

```env
VIDEO_RENDER_MODE=components_v2
```

Pozostałe zmienne środowiskowe pozostają bez zmian.

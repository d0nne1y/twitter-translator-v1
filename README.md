# Twitter Translator v36 — wideo/GIF w jednym kontenerze

Ta wersja korzysta z **Discord Components V2**. Dla wpisów z wideo lub GIF-em bot próbuje wysłać jedną wizualną kartę zawierającą:

- autora i statystyki,
- przetłumaczony tekst,
- cytowany wpis (jeżeli występuje),
- odtwarzalne wideo/GIF w tej samej karcie.

Wpisy ze zdjęciami pozostają w dotychczasowym układzie z galerią.

## Wdrożenie

1. Nadpisz pliki w repozytorium zawartością tej paczki.
2. Zrób commit.
3. Render uruchomi deploy. Build: `npm install`, start: `npm start`.
4. Dodaj na Renderze:

```env
VIDEO_RENDER_MODE=components_v2
```

Pozostałe zmienne zostają bez zmian.

## Tryb awaryjny

Jeżeli na Twoim Discordzie bezpośrednie MP4 z X nie załaduje się w galerii, bot automatycznie użyje starego playera FxTwitter. Możesz również wymusić stary tryb:

```env
VIDEO_RENDER_MODE=fx
```

## Wymagania

- Node.js 20+
- discord.js 14.22.1+
- bot z uprawnieniami do wysyłania wiadomości i osadzania linków

# Twitter Translator v35 — cytowany wpis w jednym embedzie

Ta wersja łączy główny wpis i cytowany wpis w **jeden embed Discorda**.

## Co zmieniono

- cytowany wpis jest sekcją `↪ Cytowany wpis` wewnątrz głównego embeda,
- nie powstaje już drugi embed pod głównym wpisem,
- gdy główny i cytowany wpis mają zdjęcia, bot składa je pionowo w jeden obraz,
- gdy tylko cytowany wpis ma zdjęcia, jego galeria pojawia się jako obraz głównego embeda,
- przy wpisach z video kontekst cytatu jest dopisywany w tej samej wiadomości nad playerem FxTwitter,
- tłumaczenie nadal działa: DeepL → Google Translate → oryginalny tekst.

## Render

Nie musisz zmieniać zmiennych środowiskowych. Zostaw obecne ustawienia.

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

## Ograniczenie Discorda

Natywnego playera video nie można umieścić wewnątrz własnego embeda bota. Dla wpisów video bot wysyła jedną wiadomość z tekstem, kontekstem cytatu i linkiem FxTwitter generującym player.

# Haarojen yhdistäminen 25.10.2026

## Tulos

Muutokset on yhdistetty paikalliseen haaraan `integration/main-updates-20261025`.
Mainia tai etähaaroja ei ole muutettu. Suoraa mainiin puskua ei vielä suositella:
mainin push käynnistää GitHub Pages -julkaisun, mutta nykyinen tuotantopalvelin
ei tue uuden pelin kirjautumista. Lisäksi chatin nimimerkin omistus on varmistamatta.

## Mukana olevat muutokset

- `backup/local-work-20261025` (`03b14e0`): chat, näkyvyysasetus ja ajon reaaliaikaisuus sekä palautuminen yhteyskatkoksista.
- `origin/feature/password-accounts` (`7c62889`): salasanalliset nimimerkit, erikseen peruttavat seitsemän päivän kirjautumiset, vapaa pelaaminen ja vapaaehtoinen analytiikka.
- `origin/codex/verified-lap-replays` (`5163d46`): allekirjoitetut kierrostallenteet, julkiset TOP 10 -uusinnat ja ylläpidon tarkastusarkisto.

Muut paikalliset kehityshaarat sekä suorituskykyhaarat sisältyvät jo mainiin.
`origin/testing` jätettiin erilleen: sen tuotemuutokset ovat mukana uusintahaarasta,
mutta testiympäristön osoitteet ja julkaisuasetukset eivät kuulu tuotantoon.

Yhdistämisessä säilytettiin tilikohtainen uusintajono, kirjautumisen vanhenemisen
käsittely sekä harjoittelukierrosten allekirjoittamisen esto. Tulos ja tallenne
tallentuvat samaan tietokantatransaktioon. Kesken lähetyksen peruttu kirjautuminen
ei voi lisätä tulosta eikä irrallista tallennetta. Chatin testi lisättiin CI-ajoon.
Selainkokeiden konfiguraatio- ja odotusvirheet sekä katkostestin liian laaja
odotus korjattiin. Generoitu Worker rakennettiin uudelleen lähteistä.

## Tarkistukset

- Kaikki 51 tiedostoa `tests/*.test.cjs` ajettiin. Lopullisilla korjauksilla 50/51 läpäisee; muuttuneet tili-, tallenne-, selainasiakas- ja katkostestit tarkistettiin uudelleen.
- `sale-exterior.test.cjs` epäonnistuu kohdassa 50: kaide ulottuu Sale-rakennuksen kulkualueelle. Sama virhe toistettiin alkuperäisen `03b14e0`-commitin erillisessä kopiossa. Testi, ratadata ja sen käyttämät fysiikka-/rakennustiedostot eivät eroa mainista. Tämä ei ole yhdistämisen aiheuttama virhe.
- `npm run test:chat-browser`: läpi Chromessa; kaksi pelaajaa, tekstin turvallinen näyttäminen, ajaminen chatia lukiessa, kielenvaihto, näkyvyyden muistaminen ja mobiilileveys.
- `npm run test:verified-browser`: läpi Chromessa; vapaa pelaaminen, tilin varaaminen, lähtövalot, kaksi tallennettua kierrosta uusintoineen, vapaaehtoinen analytiikka sekä fysiikan ja moottoritehon väärentämisen torjunta. Ei JavaScript-virheitä.
- `npm run build`, `npm run build:verified-worker`, syntaksitarkistukset ja `git diff --check`: läpi.
- Selainajon palvelinkello oli nopeutettu. Kahden asiakkaan pitkää reaaliaikaista kuormituskoetta tai tuotannon uuden version ajokierrosta ei ajettu.

Testilokit ovat paikallisesti `artifacts/integration/` ja ajon selainraportti
`artifacts/verification/browser-report.json`. Ne eivät kuulu julkaistavaan peliin.
Fysiikkarevisio säilyi arvossa `d8d41e628bb3b62ff574c4a95bcbb410a549ba79432c268ce7dbe9cbf6013875`.

## Ennen mainiin vientiä

1. Korjaa chatin nimimerkin omistuksen tarkistus tai jätä chat pois julkaisusta.
   `verification/chat.cjs` tarkistaa tällä hetkellä vain tunnisteen muodon;
   `verification/server.cjs` hyväksyy asiakkaan lähettämän nimimerkin.
   Omatekoisella 64-merkkisellä tunnisteella voi esiintyä toisen nimimerkillä.
   Tuloslistan tilisuojaus ei ulotu chat-palveluun.
2. Päivitä olemassa olevan D1-tietokannan skeema tiedostosta
   `cloudflare/verified-schema.sql`. Julkaise tämän haaran generoitu
   `cloudflare/verified-worker.bundle.mjs` nykyiseen `lpr-verified`-Workeriin.
   Säilytä DB-binding ja `VERIFICATION_SECRET`. Aseta uusintojen ylläpitoavain
   ja siivouksen ajastus ohjeen [REPLAYS.md](verification/REPLAYS.md) mukaan.
3. Päivitä Renderin varmennuspalvelin saman yhdistetyn version mukaiseksi
   ennen uuden pelin julkaisua. `render.yaml` seuraa mainia: palvelin- ja
   Pages-julkaisun järjestys on sovittava, jotta Pages ei ehdi ensin.
4. Tarkista uusi kirjautuminen, virallinen kierros, uusinnan katselu ja
   uloskirjautuminen palvelinpäivitysten jälkeen. Vie mainiin vasta
   palvelinten ja pelin yhteensopivuuden varmistamisen jälkeen.

Tuotannosta luettiin vain julkiset GET-rajapinnat: Renderin `/health` oli 200
ja sama fysiikkarevisio; Workerin `/api/verified/account` oli 404 ja tuloslistasta
puuttuivat uusintakentät. Tuotantoon ei kirjoitettu eikä pelaajatietoja muutettu.

Uusi lista näyttää vain tilien kierrokset, joihin liittyy julkinen uusinta.
Nykyiset vanhat ajat jäävät tietokantaan, mutta poistuvat uuden julkisen TOP 10:n
näkymästä. Fysiikkarevision säilyminen ei siis säilytä nykyisen listan sisältöä
näkyvissä. Tämä julkaisuvaikutus tulee hyväksyä ennen käyttöönottoa.

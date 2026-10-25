# Haarojen yhdistäminen 25.10.2026

## Tulos

Muutokset on yhdistetty haaraan `integration/main-updates-20261025`, joka on
käyttäjän luvalla puskettu GitHubiin. Mainia ei ole muutettu.
Renderin tuotantopalvelin on päivitetty ja uusi Worker on tuotantotestattu.
Julkinen Worker-reititys on palautettu vanhan Pages-pelin kanssa yhteensopivaksi
main-julkaisua odottamaan. Julkaisun tilanne ja testit:
[DEPLOYMENT-20261025.md](verification/DEPLOYMENT-20261025.md).
Chatin nimimerkin omistus on edelleen varmistamatta ennen pelin julkaisua.

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
2. **Skeema tehty ja Worker tuotantotestattu.** Valmis uusi Worker-versio aktivoidaan yhdess? uuden Pages-pelin kanssa. Aktivoinnin yhteydess? lis?t??n siivousajastus uudelleen. Tarkat tunnisteet ovat [julkaisuraportissa](verification/DEPLOYMENT-20261025.md).
3. **Render p?ivitetty:** palvelimella on commit `613df4fe980b9f80c47dcbebd0a56a8f766d5987`. Automaattijulkaisut ovat toistaiseksi pois k?yt?st?; ne palautetaan vasta mainin sis?lt?ess? testatun integraation.
4. **Tuotantotestit tehty:** kirjautuminen, kaksi reaaliaikaista kierrosta ja uusinnat sek? Chrome-katselin l?p?isiv?t. Pelin julkaisun j?lkeinen tarkistus tehd??n viel? main-viennin j?lkeen.



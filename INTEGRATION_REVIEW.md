# Integraation tarkastus 26.10.2026

## Rajaus ja tulos

Julkaisuehdokas on `integration/main-updates-20261025`, lähtöcommit `c094c54`.
Mainia tai tuotantopalveluita ei muutettu tässä tarkastuksessa. Päiväkisa
`feature/daily-championship` ei kuulu tähän pakettiin; sen yhdistäminen tähän
haaraan tuottaa ristiriitoja 13 tiedostoon ja vaatii erillisen yhteistestauksen.

Mukana ovat salasanalliset nimimerkit, seitsemän päivän erikseen peruttavat
kirjautumiset, vapaa harjoittelu, vapaaehtoinen analytiikka, allekirjoitetut
kierrosuusinnat, chat, ajon reaaliaikaisuuden valvonta, ihmis-/bottisarjat,
katsojailmoitukset ja ylläpidon tarkastusnäkymä. TOP 10 vaatii julkisen uusinnan.
Nykyrevision 20 nopeinta uusintaa säilytetään sarjaa kohti, lisäksi tarkastukseen
merkityt. Sarja kuuluu koko tilille, ei yksittäiselle kierrokselle.

Aiemman tarkastusraportin chat-huomio on korjattu jo commitissa `bdcb37f`:
Worker myöntää tilin nimimerkkiin sidotun chat-lipun ja Render tarkistaa sen
allekirjoituksen. Selain ei voi määrätä viestin nimimerkkiä itse.

## Tämän tarkastuksen viimeistelyt

- Selainkokeet tukevat `LPR_BROWSER_EXECUTABLE_PATH`-muuttujaa sekä asennettua
  Playwright Chromiumia; järjestelmän Chrome säilyy varavaihtoehtona.
- Chatin selainkoe avaa Lisäasetukset ennen piilotetun asetuksen käyttämistä.
- Varmennuksen selainkoe tarkistaa nyt myös pakollisen sarjavalinnan, oikean
  WebGL-kuljettajanäkymän uusinnassa, aikajanan, oman kierroksen ilmoituseston,
  toisen tilin ilmoituksen, ylläpidon ilmoitustiedot, sarjanvaihdon ja lukituksen.
- Vanha tuotantoraportti on merkitty historialliseksi. Uusi
  [julkaisuohje](verification/RELEASE-CHECKLIST.md) korvaa vanhan Worker-version
  aktivointiohjeen ja kertoo yhteensopivan julkaisun sekä palautuksen järjestyksen.

## Suoritetut tarkistukset

- Kaikki **17** `.github/workflows/tests.yml`-tiedoston testikokonaisuutta läpäisivät
  Node 24.22.1:llä. Mukana ovat tili-, varmennus-, reaaliaikaisuus-, tallenne-,
  chat-, fysiikka-, determinismi-, leaderboard- ja analytiikkatestit.
- `npm run test:chat-browser`: läpi Chromium 153.0.8010.0:ssa; kaksi pelaajaa,
  tekstin turvallinen näyttäminen, näppäimistöohjaus chatin yhteydessä,
  kielenvaihto, näkyvyysasetuksen muistaminen ja 360 px:n mobiilileveys.
- `npm run test:verified-browser`: läpi samassa selaimessa; kaksi palvelimen
  varmentamaa kierrosta, lähtövalot, vapaa pelaaminen, rekisteröinti,
  pakollinen sarjavalinta, vapaaehtoinen analytiikka, paikallisen fysiikan ja
  moottoritehon muuttamisen torjunta sekä yllä kuvatut uusinta- ja ylläpitopolut.
  JavaScript-virheitä ei ollut. Tässä ajokokeessa palvelinkello on nopeutettu.
- `npm run build`, `npm run build:verified-worker` ja muutettujen skriptien
  syntaksitarkistukset läpäisivät. Generoitu Worker vastaa versionhallinnan bundlea.
- `npm run test:verified-realtime`: **ei läpäissyt** tässä ympäristössä. Kaksi
  640 × 480:n 3D-selainta käynnistyi, mutta noin 16 sekunnin kohdalla selaimet
  olivat simuloineet vasta 752 ja 729 fysiikka-askelta (noin kuusi sekuntia).
  Molemmat olivat jo harjoittelutilassa, ja myöhemmin varmennus keskeytyi
  `lag`-syyhyn. Käytössä oli ohjelmistopohjainen grafiikkatoteutus ja sama kone
  ajoi myös paikallispalvelimet. Koe ei erota näiden kuormituksia eikä mittaa
  Renderin kapasiteettia. Aikarajoja ei väljennetty testin läpäisemiseksi.

Tämä ei ole kaikkien 51 irrallisen testitiedoston uusi ajo. Aiemman tarkastuksen
`sale-exterior.test.cjs`-havainto koski mainissakin olevaa Sale-kaidetta; sitä ei
ole korjattu tässä julkaisussa eikä fysiikkaa tai ratadataa ole muutettu.
Fysiikkarevisio säilyy arvossa
`d8d41e628bb3b62ff574c4a95bcbb410a549ba79432c268ce7dbe9cbf6013875`.
Paikalliset selainraportit ovat Gitin ohittamassa `artifacts/verification/`-
kansiossa. Ne eivät sisälly pelin julkaisupakettiin.

## Ennen tuotantoon vientiä

Noudata [RELEASE-CHECKLIST.md](verification/RELEASE-CHECKLIST.md)-ohjetta.
Julkaise Worker, Render ja Pages samasta tarkistetusta sisällöstä hallitussa
järjestyksessä. Tuotannon nykyasetuksia ei varmennettu uudelleen tässä
paikallisessa tarkastuksessa. Varmista julkaistulla pelillä kirjautuminen,
virallinen kierros, chat ja uusinta. Pelkkä main-push ei julkaise koko palvelua.
Kahden samanaikaisen pelaajan reaaliaikaisuutta ei saatu tässä vahvistettua;
se pitää tarkistaa riittävällä selainlaitteistolla ja testipalvelimella ennen
kuin tätä haaraa kuvataan kaikilta osin julkaisuvalmiiksi.

# Integraation tarkastus 26.10.2026

## Rajaus ja tulos

Julkaisuehdokas on `integration/main-updates-20261025`. Tarkastuksen `405a235`
päälle yhdistetään `perf/verification-capacity` (`a7efa4a`).
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

- Kapasiteettihaara yhdistyi ilman ristiriitoja. Mukana ovat ratasegmenttien BVH-haku,
  askelnumeron kevyempi lukeminen uusintatallentimessa, asynkroninen gzip-pakkaus,
  suojattu `/metrics`, säädettävät kapasiteettirajat sekä vertailu- ja kuormitusskriptit.
  Oletusrajat ovat edelleen kaksi sessiota ja kahdeksan aloitusta minuutissa.
  Aulan ja reaaliaikaisen katselun toteutus ei kuulu tähän haaraan; README sisältää
  niitä koskevan jatkosuunnitelman.
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

- Kaikki **18** `.github/workflows/tests.yml`-tiedoston testikokonaisuutta läpäisivät
  Node 24.22.1:llä. Mukana ovat tili-, varmennus-, reaaliaikaisuus-, tallenne-,
  chat-, fysiikka-, determinismi-, leaderboard-, analytiikka- ja kapasiteettitestit.
  Uudet testit vertaavat indeksoitua ja lineaarista hakua sekä jokaista ajotilaa
  kahdella kierroksella, tarkistavat vanhan tallentimen sisältöpariteetin ja
  mittarirajapinnan käyttöoikeudet sekä kapasiteettilaskurit.
- `npm run test:chat-browser`: läpi ennen kapasiteettihaaran yhdistämistä Chromium
  153.0.8010.0:ssa; kaksi pelaajaa,
  tekstin turvallinen näyttäminen, näppäimistöohjaus chatin yhteydessä,
  kielenvaihto, näkyvyysasetuksen muistaminen ja 360 px:n mobiilileveys.
- `npm run test:verified-browser`: läpi samassa selaimessa; kaksi palvelimen
  varmentamaa kierrosta, lähtövalot, vapaa pelaaminen, rekisteröinti,
  pakollinen sarjavalinta, vapaaehtoinen analytiikka, paikallisen fysiikan ja
  moottoritehon muuttamisen torjunta sekä yllä kuvatut uusinta- ja ylläpitopolut.
  JavaScript-virheitä ei ollut. Tässä ajokokeessa palvelinkello on nopeutettu.
- `npm run build`, `npm run build:verified-worker` ja muutettujen skriptien
  syntaksitarkistukset läpäisivät. Generoitu Worker vastaa versionhallinnan bundlea.
- `npm run test:verified-realtime`: **ei läpäissyt ennen kapasiteettihaaran
  yhdistämistä** tässä ympäristössä. Kaksi
  640 × 480:n 3D-selainta käynnistyi, mutta noin 16 sekunnin kohdalla selaimet
  olivat simuloineet vasta 752 ja 729 fysiikka-askelta (noin kuusi sekuntia).
  Molemmat olivat jo harjoittelutilassa, ja myöhemmin varmennus keskeytyi
  `lag`-syyhyn. Käytössä oli ohjelmistopohjainen grafiikkatoteutus ja sama kone
  ajoi myös paikallispalvelimet. Koe ei erota näiden kuormituksia eikä mittaa
  Renderin kapasiteettia. Aikarajoja ei väljennetty testin läpäisemiseksi.

Tämä ei ole kaikkien irrallisten testitiedostojen uusi ajo. Aiemman tarkastuksen
`sale-exterior.test.cjs`-havainto koski mainissakin olevaa Sale-kaidetta; sitä ei
ole korjattu tässä julkaisussa. Ratadataa ei ole muutettu.
Kapasiteettihaara muuttaa jaettua lähdekoodia ja siten simulaatiorevisiota.
Yhdistetyn version revisio on
`ec564e6d6d7f3aff4cd6764fdfb81b421bfeaa0ec1552bc538413614e4cb8b83`.
Pariteettitestit varmistavat samoilla syötteillä saman fysiikan ja tallenteiden
sisällön, mutta vanhoja tuloksia ei siirretä uuden revision alle. Vanhan revision
ajat eivät näy uudessa julkisessa listassa, ja sen uusinnat voivat poistua
säilytyssiivouksessa. Kierrosrivit säilyvät tietokannassa.
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

## Erillinen testijulkaisu

Integraatiohaaran `56b1451` julkaistiin erilliseen Render-testiympäristöön.
Tuotannon palvelut ja main säilyivät ennallaan. Testin asetukset, linkki ja tulokset
ovat [STAGING.md](verification/STAGING.md)-ohjeessa. Julkaisussa on erillinen
D1-tietokanta, testiavain, testianalytiikka ja TESTIVERSIO-merkintä.
Uusi testirakennuksen eristystesti lisättiin CI:hin (nyt 19 kokonaisuutta), ja
`56b1451`-commitin GitHub-testit läpäisivät.

HTTPS-koe pelin omalla yhteysasiakkaalla ei läpäissyt kahta samanaikaista pelaajaa:
toinen sai kaksi virallista kierrosta tallennettua, toinen menetti kelpoisuuden
ajoitusviiveessä. Oikean sivun mobiilileveyden selainvarmistus läpäisi ilman
JavaScript- tai CORS-virheitä ja ilman tuotantopyyntöjä. Kahden laitteen varsinainen
ajokoe sekä ajoitusviiveen syyn erottelu ovat edelleen tekemättä.

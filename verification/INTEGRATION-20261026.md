# Seuraavan päivityksen integraatio — 26.10.2026

Haara: `integration/next-update-20261026`. Tämä on tarkistettava julkaisuehdokas,
ei mainiin yhdistämisen tai tuotantojulkaisun hyväksyntä. Mainin tarkistettu
lähtöpiste on `2f70a4549c2203b616e35c8dcc36b5ebf1027e99`.

## Löydetyt työt ja niiden tallennus

Aiemmassa kartoituksessa tarkastettiin keskusteluhistoriasta tunnistetut työt ja GitHubin silloiset 23 haaraa
sekä tämän ympäristön kahdeksan LPR-työtilan ja erillisen replay-työtilan Git-tila.
Muiden koneiden tai tavoittamattomien chat-ympäristöjen tallentamattomia tiedostoja
kartoitus ei voi todistaa talteen otetuiksi.

| Työ | GitHubin lähde | Integraation tila |
| --- | --- | --- |
| Tilit, 7 päivän laitekohtaiset istunnot, uloskirjautumisen mitätöinti, harjoittelu | `feature/password-accounts` / `7c62889` | Sisältyy jo aiempaan integraatioon |
| Julkiset 3D-uusinnat, TOP 10:n uusintavaatimus | `codex/verified-lap-replays` / `5163d46` | Sisältyy; säilytetty yhdistämisessä |
| Tilin chat-lipuke, ihmis-/bottisarjat, katsojailmoitukset, moderointi | `integration/main-updates-20261025` / `d4db5c7` | Sisältyy |
| Radan hakuindeksi, kevyempi tallennin, gzip ja mittarit | `perf/verification-capacity` / `a7efa4a` | Sisältyy |
| Kapasiteettinäkymä ja 90 päivän D1-historia | `feature/admin-capacity-impact` / `66ff6c4` | Yhdistetty; käyttöönottoasetukset tarvitaan |
| Törmäysmuodon välimuisti | `perf/collision-shape-cache` / `a385349` | Yhdistetty; fysiikan ja tallenteiden pariteettitestit |
| Yhteinen ratadata ja erilliset ajotilat | `perf/shared-track-state` / `4044d41` | Yhdistetty; tarkat eristys- ja pariteettitestit |
| Rajattu säiejoukko | `perf/verification-worker-pool` / `244daff` | Yhdistetty; pysyvän kapasiteettihistorian kytkentä sovitettu |
| Päiväkisa, kuukausipisteet ja ajoputket | `feature/daily-championship` / `9abbe03` | Yhdistetty ja sovitettu julkisiin uusintoihin sekä erillisiin sarjoihin |
| Aiemman testipelin erilliset build-skriptit | `testing` / `2d1500d` | Säilyvät alkuperäisessä haarassa; nykyinen `build:staging` on integraation testijulkaisutapa |
| Vanha palvelinvarmennuksen suunnitelma, aiemmin vain paikallinen | `docs/archive/server-verification-plan-20261024.md` | Arkistoitu tähän haaraan; ei nykyinen julkaisuohje |

Muut GitHub-haarat ovat integraation tai nykyisen mainin historiassa.
`testing`-haaran pelimuutokset ovat samoja uusintakorjauksia; sen erillisiä
ympäristöasetuksia ei yhdistetty tuotannon oletuksiksi. Vanhat PR:t #5 ja #6 eivät
ole tämän ehdokkaan jälkeen erikseen yhdistettäviä julkaisuja.

Paikallisen password-työtilan 16 muutettua lähdetiedostoa vastaavat GitHubiin jo
pusketun `7c62889`-version sisältöä. Paikallisen replay-työtilan tiedostot vastaavat
uusinta-/testing-haarojen sisältöä. Paikalliset kapasiteetti- ja välimuisticommitit
ovat sisällöltään samat kuin GitHubin vastineet. Vanhat generoidut Worker-bundlet
ovat eri yhdistelmiä: niitä ei käytetä integraation julkaisupakettina. Uusi bundle
rakennetaan aina yhdistetystä lähteestä.

## Yhdistämisessä korjatut asiat

- Ratkaistu päiväkilpailun ristiriidat käyttöliittymässä, käännöksissä,
  tietosuojasivussa, skeemassa, Workerissa ja build-skripteissä.
- Päiväkilpailu säilyttää julkisen uusinnan vaatimuksen: pelkkää aikakuittia ei hyväksytä.
- Kierros, uusinta-/säilytyspäivitykset ja päiväkilpailun merkintä ovat samassa
  D1-batchissa. Virhe kilpailumerkinnässä palauttaa myös kierros- ja uusintakirjoitukset.
- Päiväkirjaus tarkistaa voimassa olevan kirjautumisen myös SQL-kirjoituksen yhteydessä.
- Ihmiset ja botit ovat eri päivä- ja kuukausilistoilla. Ylläpidon sarjasiirto koskee
  tilin aiempiakin kilpailutuloksia. Ajoputki on tilikohtainen.
- Onnistunut kierrostallennus päivittää päiväkilpailun näkymän. Saman kuittauksen
  uusinta ei lisää kierrosmäärää. Päivän sulkeminen säilyy Suomen keskiyössä.
- Pelipakettiin sisältyy `championship.js`, ja Worker-bundle sisältää sekä uusinnat
  että kilpailun. Muutettujen selainresurssien versioparametrit on päivitetty.
- CI sisältää myös päiväkilpailun, törmäysvälimuistin, jaetun ajotilan ja säiejoukon testit.
- Säiejoukon ja kapasiteettihistorian ristiriidat on sovitettu: `onMetric`, `since`,
  käynnistys-/hylkäyslaskurit, aikakatkaisut ja viivekatkaisut säilyvät. Todellinen
  poolisessio testaa käynnistysten ja kapasiteettihylkäyksen D1-kytkennän.
- Palvelimen säiejoukko käyttää jaettua ratatehdasta. Oletus on yksi säie ja kaksi
  samanaikaista ajosessiota; tuotannon asetuksiin ei ole tehty muutosta.

## Tarkistukset

Node 24.22.1. Yhdistetyn kokonaisuuden kaikki **23 CI-testikokonaisuutta**
läpäisivät paikallisesti. Lisäksi yhdistettyjen kapasiteettimittarien,
pysyvän historian ja säiejoukon kohdennetut testit uusittiin viimeistelyn jälkeen.
`build`, `build:verified-worker`, `build:worker` ja staging-eristystesti läpäisivät.
Bundle on rakennettu yhdistetystä lähteestä revisiolle
`a16f61c7d0e6e86402fe8c1aaab5a42a4a17cda3e6a314f8ee118c228bcd4b2a`.

Nykyisen ehdokkaan kolme selainkoetta yritettiin, mutta ne estyivät ennen testejä:
Chromium/Chrome puuttuu ympäristöstä. Playwrightin asennusyritys sai virheellisen
latauspaketin, joten selainta ei saatu asennettua. Tätä ei merkitä läpäistyksi.
Seuraavat onnistuneet selainhavainnot koskevat **aiempaa `2c69b38`-lähdettä**,
eivät tätä säiejoukon sisältävää yhdistelmää.

Aiemman integraation Chromium 153 -selainkokeet:

- `test:verified-browser`: oikea 3D-peli, synteettiset ohjaukset, nopeutettu
  palvelinkello, lähtö- ja lentävä kierros, julkinen 3D-uusinta, katsojailmoitus,
  ylläpidon sarjasiirto ja muokatun fysiikan hylkääminen. Ei etäkapasiteettimittaus.
- `test:chat-browser`: kaksi käyttäjää, turvallinen teksti, ohjaus chatin aikana,
  näkyvyysvalinnan muistaminen, kieli ja mobiilileveys.
- `test:championship-browser`: oikea paikallinen Worker/SQL, sarjojen vaihto,
  päivävalinta, paluu tähän päivään, käännökset ja 390 px:n mobiilileveys.
  Kilpailupaneelin kuvakaappaus tarkastettu. Ei JavaScript-virheitä.

Raakatestit kirjoittuvat `artifacts/integration/` ja `artifacts/verification/`;
niitä ei julkaista pelipaketissa. Tiivistetty tarkastusnäyttö tallennetaan
`integration-check-20261026.json`-tiedostoon.

Aiemman integraation kahden täyden 3D-selaimen paikallinen `test:verified-realtime` ajettiin myös
ilman muita testejä. Se **ei läpäissyt**: asiakas siirtyi harjoitteluksi `lag`-syyllä.
Ohjelmistografiikkaa käyttävä koe ei erota selaimen hitautta, paikallista
ajastusta ja palvelinviivettä eikä mittaa Renderin kapasiteettia. Sitä ei merkitä
hyväksytyksi. Nopeutetun kellon selainkoe läpäisi erikseen.

## Julkaisun estävät keskeneräiset työt

Selainkokeet (`test:verified-browser`, `test:chat-browser` ja
`test:championship-browser`) on uusittava onnistuneesti tästä yhdistetystä
lähteestä ympäristössä, jossa Chromium on käytettävissä.

1. **Varmennuksen viiveiden erottelu ja palautumissääntö.** Nykyinen sääntö voi
   vaihtaa kierroksen harjoitteluksi yhden yli 2 s:n saapumisviiveen jälkeen.
   Paikalliset rajatun viiveen/kiinnioton testit eivät todista oikean verkkoreitin
   toimivuutta. Aiemmassa julkisessa HTTPS-kokeessa vain yksi kahdesta pelaajasta
   sai molemmat kierrokset virallisiksi. Tätä ei korjattu rajoja löysäämällä.
   Säiejoukko mittaa nyt säikeen jonotusta erikseen. Täysi korjaus erottaa edelleen
   HTTP-vastaanoton, syötejonon, säikeen odotuksen,
   fysiikan ja uusinnan pakkauksen; päätös käyttää syötteen vastaanottohetkeä.
   Palvelimen oma työ ei saa siirtyä huomaamatta seuraavan erän verkkoviiveeksi.
   Rajattu yksittäinen katko, jatkuvasti hidas tallenne, toistuvat viiveet ja
   maaliviivan molemmat puolet testataan erikseen alkuperäistä palvelinkelloa säilyttäen.
2. **Kaksi samanaikaista pelaajaa testipalvelimella.** Julkaise sama täsmällinen
   ehdokascommitti erilliseen stagingiin. Edellytä molemmilta lähtö- ja lentävää
   kierrosta, tallennettuja tuloksia ja julkisesti avautuvia uusintoja. Kirjaa
   palvelinmittarit ja kummankin asiakkaan kuittausviiveet; vapauta sessiot lopuksi.
   Oikeiden laitteiden ajokoe täydentää synteettisen HTTPS-kokeen.
3. **Kapasiteettihistorian käyttöönotto ja restart-koe stagingissa.** Tarkista
   erilliset mittarisalaisuudet, raportointiosoite ja D1-tallennus. Jo hyväksytty
   historia säilyy restartissa; muistijonon lähettämättömät tiedot voivat kadota
   äkkisammutuksessa. Älä lupaa täydellistä levypohjaista tapahtumajonoa.
4. **Yhteensopiva julkaisu ja varmistus.** Neljä osaa samasta tarkistetusta
   lähteestä: selainpeli, Render-varmennus, verified-Worker ja analytiikka-Worker.
   Ota D1-varmistus ja kirjaa palautettavat versiot ennen käyttöönottoa.
   Pelaajarajaa ei nosteta tämän integraation perusteella.

## Suunnitellut mutta toteuttamattomat ominaisuudet

- **Aula ja reaaliaikainen seuranta:** nykyinen koodi ei näytä ajavia pelaajia tai
  tarjoa live-katselua. Toteuta erillinen julkinen tunniste ja listaus palvelimen
  aktiivisista ajoista. Hyödynnä varmennuksen valmiita tilanäytteitä, yhtä jakelijaa,
  rajattua toistopuskuria ja selaimen interpolointia; katsojille ei luoda fysiikkamaailmoja.
  Piilota session salaisuudet ja poista päättyneet ajot listalta.
- **Liikkuvien esteiden tilahaku:** erillinen suorituskykytyö; vaatii vanhan ja uuden
  törmäysjärjestyksen sekä koko uusintatuloksen vastaavuustestin.
- **HttpOnly-kirjautuminen ja salasanatiivisteen Cloudflare-mittaus:** eivät sisälly
  istuntojen vanhenemiskorjaukseen. Nykyinen tunniste on localStoragessa; Worker-
  suorituskyky on vahvistettava kohdeympäristössä. Evästesiirto on oma muutos.

Nämä suunnitellut ominaisuudet eivät ole tämän julkaisuehdokkaan toimintoja.
Niitä ei merkitä valmiiksi eikä niiden odotettuja kapasiteettihyötyjä lasketa hyväksi.

## Etenemisjärjestys mainiin valmistautumiseksi

1. Säilytä tämä haara ja draft-PR tarkistettavana kokonaisuutena.
2. Tee viiveiden diagnostiikka ja palautumisen korjaus tämän haaran päälle.
3. Uusi kohdennetut testit, buildit ja kahden pelaajan staging-kokeet täsmälleen
   julkaistavasta commitista. Varmista myös päiväkilpailu ja kapasiteettihistoria.
4. Jaettu ratadata ja säiejoukko sisältyvät nyt tähän haaraan. Aula/live-katselu
   jää erilliseksi ominaisuudeksi eikä kuulu tämän julkaisun toimintoihin.
5. Käy läpi [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md), lukitse julkaisucommit ja
   tarkista mainin lähtöpiste uudelleen. Tuotantoon/mainiin siirtyminen on erillinen vaihe.

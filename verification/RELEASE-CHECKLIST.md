# Integraation julkaisu

Valmisteltava kokonaisuus: `integration/next-update-20261026`. Mukana edellinen
integraatio, päiväkilpailu, auton törmäysmuodon välimuisti ja adminin pysyvä
kapasiteettihistoria. Tilanne, testit ja julkaisuesteet: [INTEGRATION-20261026.md](INTEGRATION-20261026.md).
**Luonnos: ei vielä hyväksytty mainiin tai tuotantojulkaisuun.**
Mainiin vienti käynnistää `.github/workflows/deploy-pages.yml`-julkaisun automaattisesti.
Pelkkä main-push ei päivitä Cloudflare Workeria eikä takaa Renderin päivittymistä.

## Ennen julkaisua

1. Valitse tarkistettu integraatiohaaran commit ja kirjaa sen täydellinen SHA.
   Rakenna kaikki neljä osaa (peli, varmennuspalvelin, verified-Worker, analytiikka-Worker) tästä samasta commitista. Varmista mainin ja
   integraatiohaaran päät uudelleen ennen yhdistämistä.
2. Aja `.github/workflows/tests.yml`-tiedoston testikokonaisuudet,
   `npm run test:chat-browser`, `npm run test:verified-browser`, `npm run test:championship-browser`,
   `npm run build` ja `npm run build:verified-worker`.
   Varmista, ettei bundlen uudelleenrakentaminen muuta versionhallinnan bundlea.
   Selainkokeet tarvitsevat Playwrightin ja Chromen tai Playwright Chromiumin.
   Omaa Chromiumia voi käyttää muuttujalla `LPR_BROWSER_EXECUTABLE_PATH`.
   `npm run test:verified-realtime` on erillinen kahden paikallisen 3D-asiakkaan
   reaaliaikakoe; se ei mittaa Renderin kapasiteettia.
   Ennen kapasiteettihaaran yhdistämistä se ei läpäissyt 26.10.
   ohjelmistografiikkaa käyttäneessä tarkastusympäristössä
   (selainsimulaatiot jäivät reaaliajasta). Kahden pelaajan reaaliaikaisuus on
   siksi vielä varmennettava sopivalla laitteistolla ja testipalvelimella.
3. Tarkista tuotannon todelliset asetukset ja ota D1-varmistus ennen muutoksia.
   Kirjaa aktiivisen Workerin versio, Renderin julkaisucommit, Pagesin commit,
   Cron Triggerit, bindingit ja Renderin automaattijulkaisun tila. Vanha
   [25.10. raportti](DEPLOYMENT-20261025.md) ei todista nykyistä tilaa.
4. Säilytä nykyinen `VERIFICATION_SECRET` samana Workerissa ja Renderissä;
   älä generoi sitä uudelleen Blueprintistä. Säilytä DB-binding ja muut
   ympäristöasetukset. Varmista Workerin `ANALYTICS_ADMIN_TOKEN`.
   Avaimia ei tallenneta Gitiin tai julkaisuraporttiin.

## Julkaisujärjestys

Vanha main-asiakas ei osaa uuden Workerin tilikirjautumista. Julkaisu tarvitsee
lyhyen hallitun vaihtokatkon tai erikseen toteutetun rinnakkaisen julkaisun;
tämä haara ei toteuta katkottoman versionvaihdon reititystä. Jo avoimena olevat
vanhat pelivälilehdet pitää päivittää. Älä kuvaa vaihtoa katkottomaksi.

1. Suorita `cloudflare/verified-schema.sql` oikeassa olemassa olevassa D1:ssä.
   Lisäykset ovat `CREATE ... IF NOT EXISTS` -muotoisia; älä pudota vanhoja tauluja.
2. Julkaise Renderin `lpr-verification` valitusta commitista ja tarkista `/health`:
   `ready=true`, `protocol=driving-v1`, `hz=120` ja sama fysiikkarevisio kuin bundlessa.
   Säilytä automaattijulkaisu pois päältä vaihdon ajan, jos se on jo pois käytöstä.
3. Julkaise analytiikan `cloudflare/worker.mjs` ja päivitetty admin (`npm run build:worker`
   ennen pakkausta). Aseta erillinen `VERIFICATION_METRICS_TOKEN` molempiin palveluihin,
   varmennuspalvelimen `CAPACITY_REPORT_URL` sekä analytiikan `VERIFICATION_METRICS_URL`
   [README:n](README.md#adminin-kapasiteettinäkymä-ja-pysyvä-historia) mukaan.
   Varmista kapasiteettihistorian tallennus ja säilyminen testipalvelimen restartissa.
4. Julkaise juuri rakennettu `cloudflare/verified-worker.bundle.mjs` **lpr-verified**-
   Workeriin. Älä aktivoi historiallista versiota 6: siitä puuttuvat myöhemmät muutokset.
   Säilytä bindingit ja salaisuudet. Lisää Cron Trigger `0 3 * * *` (UTC).
   Tarkista `SIMULATION_REVISION`, jos se on asetettu: se ohittaa bundlen revision.
   Väärä mutta kelvollisen muotoinen revisio voi poistaa säilytettävät uusinnat.
5. Yhdistä sama tarkistettu sisältö mainiin ja odota GitHub Pages -työnkulun
   onnistuminen. Tämä on varsinainen pelin julkaisu, ei pelkkä testiajo.
6. Tarkista alla olevat kohdat julkisella sivulla. Palauta Renderin
   automaattijulkaisu vasta kun main sisältää saman testatun palvelinkoodin.

## Julkaisun hyväksymiskoe

- Harjoittelu toimii ilman tiliä. Tilin luonti vaatii erillisen ihmis-/bottisarjan
  valinnan. Uloskirjautuminen ja uudelleen kirjautuminen toimivat.
- Aja virallinen lähtökierros ja lentävä kierros. Molempien palvelimen kuittaamat
  ajat tallentuvat; TOP 10 -tuloksista avautuu uusinta, jossa toimivat 3D, aikajana
  ja toisto. Testitili ja tarkat testirivit kirjataan mahdollista siivousta varten.
- Chat näkyy kahdelle selaimelle, viestin nimimerkki tulee kirjautuneesta tilistä.
- Ihmis- ja bottisarjat näkyvät erillään. Kirjautunut toinen tili voi ilmoittaa
  julkisesta uusinnasta; omaa kierrosta ei voi ilmoittaa. Ylläpito näkee ilmoituksen
  ja pystyy vaihtamaan tilin sarjaa. Siirto koskee tilin kaikkia tuloksia.
- Ylläpitonäkymä hylkää avaimettoman pyynnön. Konsolissa ei ole JavaScript- tai
  CORS-virheitä. Tarkista myös mobiilileveys ja päivitettyjen tiedostojen latautuminen.
- Päiväkisa näyttää ihmiset ja botit erikseen. Varmennettu kierros kasvattaa
  kierrosmäärää vain kerran; uusinta toimii samalla. Päivän vaihto tapahtuu Suomen
  keskiyöllä ja kuukausipisteet lasketaan vahvistetuista päivistä.
- Admin näyttää pysyvän kapasiteettihistorian myös varmennuspalvelimen restartin jälkeen.
- Kirjaa julkaistut SHA:t, molempien Workerien versiot, Pages-työnkulku ja testitulokset.

Uusi julkinen lista sisältää vain tilien ajat, joilla on julkinen uusinta.
Vanhoja tuloksia ei poisteta kierrostaulusta, mutta tallenteettomat ajat eivät
näy uudessa TOP 10:ssä. Kapasiteettioptimointi vaihtaa simulaatiorevision arvoon
`e9cec7741f4d835d64b247fb1bf925572f32032380fcb9ce9074a747344ad2a2`.
Myös kaikki aiemman revision ajat suodattuvat uudelta listalta. Niille ei tehdä
migraatiota, vaikka pariteettitestit vahvistavat fysiikan vastaavuuden.
Vanhan revision uusinnat voivat poistua heti uuden revision säilytyssiivouksessa;
varmista niiden varmistus ja julkaisuvaikutus ennen Workerin vaihtamista. Kumpikin sarja säilyttää nykyrevision 20 nopeinta uusintaa,
ja tarkastettavaksi merkityt säilyvät lisäksi. Sarjasiirto tai siivous voi poistaa
muut uusintatiedostot pysyvästi; pelkällä version palautuksella niitä ei palauteta.

## Jos julkaisu epäonnistuu

Palauta selainpeli, Worker ja tarvittaessa Render yhteensopivaan aiempaan
kokonaisuuteen kirjattujen tunnisteiden perusteella. Pelkkä Workerin palautus
jättää uuden pelin ilman tilirajapintaa. Poista siivousajastus, jos palautetussa
Workerissa ei ole sitä tukevaa käsittelijää. Säilytä lisätyt tietokantataulut ja
pelaajien rivit; älä käytä tietokannan tyhjentämistä palautuksena. Palauta
varmistuksesta vain erillisellä, tietoisella päätöksellä.

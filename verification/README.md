# 3D-pelin palvelinvarmennus

Palvelin laskee jokaisen virallisen kierroksen itse kuljettajan ohjaussyötteistä ja
allekirjoittaa tuloksen; selaimen ilmoittamaa aikaa ei käytetä mihinkään. Tuotannon osat ovat
Render-palvelu `lpr-verification`, Cloudflare Worker `lpr-verified` ja GitHub Pages -peli;
käyttöönotto on kuvattu kohdassa *Julkaisua varten*. Osoitteet ovat `config.js`:ssä.

## Kokeile

Node 24.x, ei palvelimen npm-riippuvuuksia:

```sh
npm run dev:verified
```

Avaa http://127.0.0.1:8000, kirjoita nimimerkki ja salasana (vähintään 5 merkkiä), hyväksy nimimerkkiin yhdistettyjen
peli- ja käyttötietojen kerääminen ja paina **Aloita ajo**. Vapaan nimimerkin kohdalla peli pyytää
vahvistuksen (**Varaa nimimerkki**), ennen kuin nimi varataan tälle salasanalle. Kirjautuminen
muistetaan selaimessa; **Vaihda kuljettajaa** unohtaa sen. Varmennus valmistellaan
automaattisesti. Toimivalla yhteydellä ajo alkaa ilman harjoittelua tai
lähtölaskentaa. Jos yhteyttä ei saada, voi ajaa harjoitteluna. Peli yrittää yhteyttä
automaattisesti uudelleen kolmen sekunnin välein. Yhteyden palattua ja session
valmistuttua virallinen ajo alkaa automaattisesti lähtöruudusta ilman lähtölaskentaa.
Myös **Aloita uudelleen** aloittaa valmistelun automaattisesti; lentävät
jatkokierrokset säilyvät samassa varmennetussa sessiossa.
Pelissä näkyy jatkuvasti varmennuksen tila. Jokainen varmennettu ajo alkaa
palvelimen määräämästä lähtöruudusta, mutta sen jatkokierrokset ovat lentäviä.
Kierros hyväksytään vasta palvelimen kuittauksen ja allekirjoituksen jälkeen.

Käynnistin avaa vain paikalliset portit 8000 (peli), 8081 (ajovarmennus) ja
8788 (tuloslista). Tulokset tallentuvat `artifacts/verification/local.sqlite`-tiedostoon.
Paikallinen allekirjoitusavain luodaan muistiin käynnistyksessä; jos haluat vanhojen
jonossa olevien kuittien toimivan uudelleenkäynnistyksen jälkeen, anna oma
`VERIFICATION_SECRET` ympäristömuuttujana. Avainta ei saa laittaa selaimen asetuksiin.

Palvelinta odottaessa tai varmennuksen katkettua ajo on harjoittelua. Aiempi tuloslista näytetään erikseen, eikä uusi
pelikäyttöliittymä enää lähetä harjoitteluaikoja vanhaan tuloslistaan.

## Luottamusketju

0. **Nimimerkin omistus.** `POST /api/verified/account` (`cloudflare/verified-worker.mjs`)
   kirjaa sisään nimimerkillä ja salasanalla tai varaa vapaan nimimerkin, kun selain pyytää
   sitä erikseen (`create:true`). Nimimerkit ovat yksilöllisiä kirjainkoosta riippumatta.
   Salasanasta tallennetaan vain PBKDF2-SHA-256-tiiviste ja suola `verified_accounts`-tauluun
   (oletuksena 100 000 kierrosta, Workersin yläraja; ks. `PASSWORD_ITERATIONS` alla). Palvelin
   palauttaa tiliin sidotun tunnuksen, joka on sama kaikilla laitteilla; taulussa on vain tunnuksen
   tiiviste. Vain väärät salasanat rajoitetaan: 5 / 10 min nimimerkkiä ja osoitetta kohden ja
   30 / 10 min nimimerkkiä kohden. Lisäksi kaikkia tilipyyntöjä rajoitetaan 20/min osoitetta kohden.
   Onnistunut kirjautuminen ei kuluta nimimerkin kiintiötä. Salasanaa ei voi palauttaa.
1. `cloudflare/verified-worker.mjs` myöntää aloitusluvan vain tilin omistajalle. Lupa on sidottu
   pelaajatunnukseen, tilin nimimerkkiin ja simulaatioversioon, ja se on voimassa kaksi minuuttia.
2. `verification/server.cjs` tarkistaa luvan ja aloittaa oman 120 Hz:n
   simulaation worker-threadissa. Saman luvan uusintayritys palauttaa saman
   session eikä nollaa palvelinkelloa. Kapasiteetti on enintään kaksi sessiota.
   Pelin sessio valmistellaan ensin odottamaan lähtöä. Valmistelun jälkeen
   erillinen, uusintayritykset salliva aktivointi
   käynnistää palvelinkellon. Harjoittelun odotusaikaa ei lasketa ajoon.
3. Selain lähettää kaasun, jarrun, ohjauksen, ohjaustavan ja luistoneston tilan.
   Palvelin hyväksyy vain peräkkäiset erät. Jälkikäteen ei voi vaihtaa kuitattuja
   syötteitä. 250 ms:n etumatka, kahdeksan sekunnin viiveraja, 15 sekunnin
   toimettomuusraja, kymmenen minuutin ajokatto sekä erä- ja laskentarajat
   katkaisevat hallitsemattoman lähetyksen.
4. `shared/driving.js` ja `shared/people.js` laskevat sekä 3D-pelin että palvelimen
   ajofysiikan, ratakosketukset, esteet, liikkuvat ihmiset, luistoneston, portit ja
   sektorit. Renderöinti ei määrää törmäystiloja. Aika tulee fysiikka-askeleista.
5. Palvelin allekirjoittaa valmistuneen kierroksen HMAC-SHA-256:lla. Kuitti sisältää
   pelaajan, version, session, kierrosnumeron sekä palvelimen laskemat kierros- ja
   sektoriajat. Selaimen ilmoittamia kierrosaikoja ei käytetä.
6. Worker tarkistaa allekirjoituksen, pelaajan ja tilin ennen erilliseen `verified_laps`-
   tauluun tallentamista. Sama session ja kierroksen pari tallentuu vain kerran.
   Vanhoja tuloksia ei siirretä varmennettujen joukkoon. TOP 10 näyttää vain tileihin
   kuuluvat kierrokset tilin nimimerkillä; ennen tilejä ajetut kierrokset jäävät tauluun
   mutta eivät näy listalla.


Kesken virallisen ajon tapahtuva varmennuksen menetys ei enää käynnistä peliä uudelleen eikä siirrä autoa lähtöruutuun. Ajo jatkuu harjoitteluna, kunnes pelaaja käynnistää itse uuden virallisen ajon. Virheluokka näkyy pelissä ja tarkemmat tiedot löytyvät selaimen konsolista. Tämä ei hyväksy keskeneräistä kierrosta tuloslistalle.

Selaimen piilottaminen, valikkoon tai sisätilaan siirtyminen, simulaatioero,
kaatuminen, palvelimen uudelleenkäynnistys ja yhteyskatkos vaihtavat ajon
harjoitteluksi. Varmennusta ei jatketa selaimen tarjoamasta auton tilasta.
Jo allekirjoitetun kierroksen tallennusta voi yrittää myöhemmin uudelleen.

Tämä varmistaa palvelimen fysiikan mukaisen ajon. Se ei tunnista ihmistä,
estä fysiikan mukaista automaattiohjausta tai takaa julkisen palvelun saatavuutta.
Pelaajatunnus kuuluu nimimerkkitilille, ei varmennetulle henkilöllisyydelle: salasanan
tietävä voi ajaa tilin nimissä.

## Jos ajo muuttuu harjoitteluksi fysiikkaeron vuoksi

Tarkista pelin ilmoitus. `state_difference` tarkoittaa, että jonkin auton
fysiikka-arvon ero ylitti hyvin pienen `1e-5` toleranssin; `lap_checkpoint_difference`
tarkoittaa, että kierros-/sektoritila ei täsmännyt; `missing_snapshot`
kertoo puuttuvasta paikallisesta tilatallenteesta.

Kopioi diagnostiikka selaimen DevTools-konsolissa:

```js
window.LPRVerificationDiagnostics.lastMismatch
```

Raportti sisältää ensimmäisen havaitun poikkeaman tarkistustickin,
poikkeavien kenttien selain- ja palvelinarvot sekä erot. Älä sisällytä
pyynnön Authorization-otsakkeita, pelaajatunnuksia tai allekirjoitettuja
kierroskuitteja raporttiin. Huomaa, että selainikkunan uudelleenlataus
tyhjentää tämän viimeisen tapahtuman.

Tilavertailun toleranssi koskee vain sitä, näytetäänkö paikallinen ajo
palvelimen kanssa yhtäpitävänä. Palvelin laskee ja allekirjoittaa tulokset
edelleen omasta simulaatiostaan; asiakkaan aika- ja sijaintiväitteisiin
ei luoteta. Toleranssin muutos ei korjaa mahdollisia varsinaisia
simulaatioiden eroja; raportoi toistuva poikkeama ennen julkaisemista.

Tunnettu syy `state_difference`-poikkeamalle on ollut JavaScript-moottorien
matematiikkaero: `Math.sin`, `cos`, `pow` ja vastaavat saavat ECMAScript-
määrittelyn mukaan poiketa viimeisessä bitissä selaimen ja Node.js:n välillä,
ja ajomalli kasvattaa eron noin `1e-5` yksikköön minuutissa. Siksi jaettu
fysiikka käyttää `shared/dmath.js`-tiedoston deterministisiä toteutuksia
(`window.LPRMath`), ja `verification/world.cjs` kääntää sen ensimmäisenä.
`npm run test:determinism` vertaa sekä funktioita että palvelinmaailman
autopilottikierrosta Chromiumissa tallennettuun tiivisteeseen; katso
README:n kohta Deterministinen fysiikka.

## Tarkistukset

```sh
npm run test:verified
npm run build
```

`test:verified` ajaa aidon paikallisen HTTP-ketjun, saman Worker-koodin SQLitea
vasten, kaksi peräkkäistä kierrosta, allekirjoitusten väärentämisen, väärän
pelaajan, aikaväitteen väärentämisen, uusintalähetykset, järjestysvirheet,
palvelinkellon rajat sekä yhteyskatkon. Testikello on nopeutettu.

Oikean Chrome-selaimen testi (valinnainen Playwright; Chrome asennettuna):

```sh
npm install --no-save --package-lock=false playwright
npm run test:verified-browser
```

Testi lataa oikean 3D-pelin, käyttää synteettisiä ohjauksia ja nopeutettua
palvelinkelloa, vertaa näppäimistön, analogiohjauksen ja luistoneston tiloja,
tallentaa lähtö- ja lentävän kierroksen sekä muuttaa auton sijaintia ja
moottoritehoa selaimessa. Raportti ja kuvakaappaus tulevat
`artifacts/verification/`-hakemistoon. Se ei ole ihmisen ajotesti,
reaaliaikainen kuormamittaus tai mobiiliselainten yhteensopivuuslupaus.

Kahden samanaikaisen oikeassa ajassa ajavan Chrome-asiakkaan paikallinen koe:

```sh
npm run test:verified-realtime
```

Se käyttää normaalia 3D-renderöintiä, synteettistä ohjausta ja palvelimen oikeaa
monotonista kelloa. Tuloksena on `artifacts/verification/realtime-report.json`.
Testi kestää noin kaksi minuuttia. Sekään ei mittaa Renderin kapasiteettia.

24.10.2026 paikalliset tarkistukset läpäisivät Chrome 155:llä. Nopeutettu
3D-koe varmisti kaksi peräkkäistä kierrosta ja torjui sekä auton siirtämisen
että moottoritehon muuttamisen: [browser-measurement.json](browser-measurement.json).
Kaksi samanaikaista reaaliaikaista Chrome-asiakasta ajoivat kumpikin 11 539
fysiikka-askeleen eli 96,158 sekunnin kierroksen, ja molemmat tulokset
tallentuivat ilman selainvirheitä. Kokeen kokonaiskesto session aloituksista
tulosten havaitsemiseen oli 97,87 sekuntia:
[local-realtime-measurement.json](local-realtime-measurement.json).

## Julkaisua varten

Seuraavan julkaisun pelaajatiedote on [RELEASE_NOTES.md](../RELEASE_NOTES.md).
Julkaisussa uusi tuloslista aloitetaan tyhjänä ja vanha lista jää pelaajalle erilliseksi
arkistoksi. Vanhoja tuloksia ei siirretä `verified_laps`-tauluun.

### Käyttöönotto askel askeleelta

Kolme osaa, tässä järjestyksessä. Sama `VERIFICATION_SECRET` (vähintään 32 merkkiä) on
Renderissä ja Cloudflaressa; se ei saa koskaan päätyä pelin tiedostoihin tai Gitiin.

1. **Varmennuspalvelin Renderiin** (`render.yaml`, Free-taso). Render → *New* → *Blueprint*
   → valitse tämä repositorio ja `render.yaml` → *Apply*. Palvelun nimi on `lpr-verification`
   ja osoite `https://lpr-verification.onrender.com`; jos Render vaatii toisen nimen, vaihda sama
   osoite `verification/config.js`-tiedostoon ennen pelin julkaisua. Render luo
   `VERIFICATION_SECRET`-arvon automaattisesti: kopioi se palvelun *Environment*-välilehdeltä.
   Tarkista `https://lpr-verification.onrender.com/health` → `{"ready":true,...,"streaming":true}`.
   Free-palvelu nukahtaa käyttämättömänä; peli herättää sen itse ja ensimmäinen pelaaja
   odottaa jopa minuutin. Kapasiteetti on kaksi samanaikaista virallista ajoa.
2. **Varmennettu tuloslista Cloudflareen.** Aja `npm run build:verified-worker`; se kirjoittaa
   `cloudflare/verified-worker.bundle.mjs`-tiedoston, johon on upotettu protokolla ja nykyinen
   simulaatiorevisio. Cloudflare → *Workers & Pages* → *Create* → Worker nimellä **lpr-verified**
   → *Edit code* → liitä koko bundle → *Deploy*. Sitten *Settings*: D1-binding **DB → lpr-times**
   (sama tietokanta kuin vanhalla listalla) ja **Secret** `VERIFICATION_SECRET` = Renderin arvo.
   Suorita `cloudflare/verified-schema.sql` D1-konsolissa kerran (Worker luo myös
   `verified_accounts`-taulun itse, jos se puuttuu). Tarkista
   `https://lpr-verified.panu-musakka.workers.dev/api/verified/leaderboard` → `{"protocol":"driving-v1","revision":"...","results":[]}`.
   `GAME_ORIGINS` tarvitaan vain, jos pelillä on muu osoite kuin `https://panulut.github.io`.
   **Testaa kirjautuminen ennen pelin julkaisua**: luo testitili esimerkiksi selaimen konsolista
   `fetch('https://lpr-verified.panu-musakka.workers.dev/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'Testi',password:'testi123',create:true})}).then(r=>r.status)`
   → `201`. Jos vastaus on `503` tai Cloudflare näyttää virheen 1102 (CPU-raja ylittyi), lisää
   Workerin *Settings → Variables* -kohtaan `PASSWORD_ITERATIONS` = `20000` (sallittu 10 000–100 000)
   tai siirrä Worker maksulliseen tasoon. Tilit tiivistetään uudelleen seuraavalla kirjautumisella.
   Poista testitili lopuksi (ks. alla).
   Jos `VERIFICATION_SECRET` vaihdetaan, muistetut kirjautumiset toimivat edelleen, ja tili
   kierroksineen siirtyy uudelle tunnukselle, kun pelaaja seuraavan kerran kirjautuu salasanallaan.
3. **Peli.** Pushaa `main` vasta, kun Worker on päivitetty: uusi peli kirjautuu
   `/api/verified/account`-osoitteeseen, jota vanha Worker ei tunne. GitHub Pages -työnkulku
   rakentaa `dist/`-kansion, johon syntyy
   `verification/revision.js`. Avaa peli, kirjaudu nimimerkillä ja salasanalla, vahvista analytiikka, *Aloita ajo*.
   Tilarivin pitää näyttää valmistelu ja liikennevalot; kierroksen jälkeen aika ilmestyy
   varmennettuun listaan.

### Unohtunut salasana tai nimimerkin poisto

Salasanaa ei voi palauttaa. Ylläpito vapauttaa nimimerkin D1-konsolissa
(`name_key` on nimimerkki pienillä kirjaimilla):

```sql
DELETE FROM verified_accounts WHERE name_key = 'nimimerkki';
```

Tilin kierrokset katoavat silloin TOP 10 -listalta. Jos sama nimi varataan uudelleen, uusi
tili saa uuden tunnuksen, eikä vanhoja kierroksia liitetä siihen.

### Kun fysiikka muuttuu

Simulaatiorevisio on tiiviste jaetuista fysiikkatiedostoista ja ratadatasta. Jokainen muutos
niihin vaihtaa revision, ja silloin kaikki kolme osaa on päivitettävä samassa järjestyksessä:
Render julkaisee automaattisesti `main`-pushista, Workeriin liitetään uusi
`npm run build:verified-worker` -bundle, ja Pages rakentaa pelin. Väliaikaisesti eri versiot
näkyvät pelaajalle ilmoituksena ”Varmennuspalvelun versio vaihtui”, ei väärinä tuloksina.
Uusi revisio aloittaa varmennetun listan tyhjänä; vanhat rivit säilyvät taulussa.

### Mitä tämä ei vielä ole

Nykyinen käyttöönotto on yksi varmennusinstanssi: sessiot ovat sen muistissa, ja Renderin
uudelleenkäynnistys muuttaa käynnissä olevat ajot harjoitteluksi. Horisontaalinen skaalaus
edellyttää erikseen sessioreititysta ja aloituslupien kertakäytön jakamista; älä käynnistä
useita instansseja sellaisenaan. Render Free -tason todellinen viive ja kapasiteetti kahdella
yhtäaikaisella pelaajalla sekä mobiiliselainten käyttäytyminen on todennettava tuotannossa
ennen kuin listaa mainostetaan.

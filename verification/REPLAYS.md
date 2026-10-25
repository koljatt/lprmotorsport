# Varmennettujen kierrosten uusinnat

Uudet varmennetut kierrokset voivat sisältää katsottavan 2D-uusinnan. TOP 10:n rivillä on
**Katso uusinta**, kun tallenne on saatavilla. Vanhoihin tuloksiin ei synny tallennetta
jälkikäteen. Kierrosajat, nykyinen fysiikkarevisio ja vanhat tulokset eivät muutu.

## Tallennus ja luottamusketju

- `verification/replay.cjs` tallentaa **palvelimen** käsittelemät ohjauskomennot
  120 Hz:n askelindekseillä. Muuttumattomat komennot tallennetaan vain kerran.
- Palvelimen laskema sijainti, suunta ja nopeus tallennetaan 20 Hz:llä sekä
  kierroksen kummassakin päässä. Lentävä kierros saa oman alkutilan; sitä ennen
  ajettua kierrosta ei tarvita katseluun. Tallenne sisältää rataviivan ja mittakaavan.
- JSON pakataan gzipillä ja välitetään base64-muodossa. Kierroskuitti allekirjoittaa
  tallenteen SHA-256-tiivisteen (`replayHash`). Selain vain välittää aineiston;
  se ei voi korvata tallennettua ajolinjaa tai ohjauskomentoja.
- Selain pitää kuitin ja tallenteen samassa lähetysjonossa. Tulos ja tallenne
  tallennetaan samaan D1-transaktioon. Uusintalähetykset eivät monista rivejä.
- Tallenne on tarkoituksella valinnainen kierrostulokseen nähden: vanha selain,
  täysi selaintallennus, yli 900 000 merkin pakattu tallenne tai muu tallennushäiriö
  ei tee allekirjoitetusta kierrosajasta virheellistä. Pelkkä kuitti voidaan tallentaa
  ilman tallennetta. Uusinnan puuttuminen ei yksin ole bottiepäily.
- Jos selaimen localStorage täyttyy, kuitit yritetään säilyttää kevyempänä jonona;
  tallenteet pysyvät avoimen välilehden muistissa lähetyksen ajan. Sulkeminen ennen
  onnistunutta lähetystä voi silloin menettää tallenteen, vaikka aika säilyisi.

Katselin interpoloi tallennettuja sijainteja; se ei suorita vanhaa fysiikkaversiota.
Näin fysiikan myöhempi päivitys ei riko uusinnan katselua. Tämä on ylhäältä nähtävä
rata- ja ajolinjanäkymä, ei alkuperäisen 3D-renderöinnin tai liikkuvien ihmisten uusinta.
Se sisältää aikajanan, tauon, alusta aloittamisen, ¼–4× nopeuden ja ohjaustiedot.
Tallenne ei yksin tunnista ihmistä tai bottia. Automaattista bottipisteytystä ei lisätty.

## Säilytys ja ylläpito

`verified_replays` on erillinen taulu: tulokset säilyvät `verified_laps`-taulussa.

- Tavalliset uusinnat ovat ylläpidon katsottavissa 30 päivää kierroksen myöntämisestä.
- Minkä tahansa revision TOP 10:een tallennushetkellä päässeet uusinnat saavat
  pysyvän `pinned=1`-merkinnän. Ne säilyvät julkisina myös sijoituksen pudottua.
- Ylläpito voi merkitä tallenteen `flagged` (tarkastettava), `reviewed`
  (tarkastettu) tai `unreviewed` (ei tarkastettu). `flagged` säilyttää tallenteen
  myös 30 päivän jälkeen. Merkintä ei poista tulosta tai väitä pelaajaa botiksi.
- Vanhentunutta yksityistä tallennetta ei palauteta katselurajapinnasta, vaikka
  päivittäinen fyysinen siivous olisi vielä tekemättä.
- Siivous tapahtuu kierrosten tallennuksen yhteydessä ja Worker Cron Triggerillä.
  TOP 10 -arkiston ja tarkastusjonon kasvu ei ole rajattu; seuraa D1:n tilankäyttöä.

Ylläpito: pelin `replay.html?admin=1` tai katselimen **Ylläpito**-linkki.
Kirjaudu Workerille asetetulla `ANALYTICS_ADMIN_TOKEN`-avaimella. Avain jää vain
sivun muistiin; sitä ei aseteta URL:iin tai selaintallennukseen. **Lukitse** tyhjentää
näkymän ja avaimen. Listassa ovat myös vanhat ja tallenteettomat kierrokset;
se on sivutettu 50 rivin eriin ja sen voi rajata tarkastettaviin.

## Käyttöönotto

Ei uutta Render-palvelua, tallennusbuckettia tai maksullisen tason asetusta.
Olemassa olevan D1-tietokannan kiintiöt pätevät edelleen.

1. Suorita olemassa olevassa D1-tietokannassa `cloudflare/verified-schema.sql`.
   `CREATE TABLE IF NOT EXISTS` säilyttää nykyiset tulokset. Tietokannan binding
   on edelleen **DB** samassa **lpr-verified**-Workerissa.
2. `npm run build:verified-worker`: julkaise syntyvä
   `cloudflare/verified-worker.bundle.mjs` lpr-verified-Workeriin säilyttäen
   nykyiset bindingit, `VERIFICATION_SECRET` ja muut asetukset.
3. Aseta **lpr-verified**-Workerille salainen `ANALYTICS_ADMIN_TOKEN`
   (vähintään 32 merkkiä). Voit käyttää omaa nykyistä ylläpitoavaintasi, mutta
   eri Workerissa oleva samanniminen secret ei siirry automaattisesti.
   Älä käytä `VERIFICATION_SECRET`-avainta ylläpitokirjautumiseen.
4. Lisää Workerille päivittäinen Cron Trigger **`0 3 * * *`** (UTC).
   Handler poistaa vain vanhentuneet, kiinnittämättömät ja liputtamattomat tallenteet.
5. Julkaise varmennuspalvelin ja pelin Pages-julkaisu. Worker julkaistaan ensin,
   koska uudet selainpyynnöt sisältävät suuremman tallenteen. Fysiikkarevisio
   pysyy samana: tämän muutoksen vuoksi tuloslistaa ei nollata.
6. Aja uusi virallinen kierros ja tarkista **Katso uusinta**, aikajana sekä
   ylläpidon tarkastusmerkinnän pysyvyys. Vanhoilla ajoilla linkkiä ei ole.

Paikallisesti `npm run dev:verified`. Ylläpitoa varten voit asettaa
`ANALYTICS_ADMIN_TOKEN`-ympäristömuuttujan ennen käynnistystä; tietokantaskeema
luodaan automaattisesti. Uusinnat tallentuvat samaan paikalliseen SQLite-tietokantaan.

## Validointi

- `npm run test:verified`: oikea HTTP-ketju, lähtö- ja lentävät kierrokset,
  tallenteen hash, jokaisen 20 Hz:n sijaintinäytteen vertailu tallennetuista
  ohjauskomennoista uudelleen laskettuun fysiikkaan, väärennösten torjunta,
  SQLite-tallennus, julkinen katselu ja ylläpidon oikeudet. Myös selaimen
  uusintalähetysjono testataan sekä vanhalla että tallenteellisella kuitilla.
- `npm run test:recordings`: käyttöoikeudet, määräaika, päivittäinen siivous,
  top-ten-arkisto, tarkastusjono, vanhat ajat sekä katselimen lataus, aikajana,
  toisto/tauko/nopeus/alkuun, mittayksiköt, puuttuva/viallinen tallenne ja lukitus.
- `npm run test:analytics`, `npm run test:leaderboard`, `npm run build`,
  `npm run build:verified-worker`.

Paikallisessa automaattiohjauskokeessa noin 96 sekunnin tallenne oli noin
381–386 kB base64-gzip-muodossa D1:ssä (raakagzip noin 286–290 kB). Tuhat
vastaavaa kierrosta olisi noin 381–386 MB tallennekenttien sisältöä ennen
SQLite-taulujen ja indeksien lisätilaa. Ohjaustapa ja ajon pituus vaikuttavat kokoon.
Tallenteen katselu siirtää raakagzipin; katsoja ei lataa koko arkistoa.

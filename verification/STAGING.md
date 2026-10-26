# Kahden pelaajan testiympäristö

Testi käyttää integraatiohaaraa `integration/main-updates-20261025`; mainia ei
julkaista. Renderin palvelin on erillinen tuotannosta, ja Cloudflaren
`lpr-verified-test` sekä `lpr-analytics-test` käyttävät testitietokantaa
`lpr-motorsport-test` (`82324dc1-0ac0-4874-b9f3-dcf16a7c66c8`).
Testivarmennuksen allekirjoitusavain on erillinen tuotantoavaimesta.

## Testipelin rakentaminen

Renderin staattisen testisivun build-komento on `npm run build:staging`,
julkaisukansio `dist`. Julkiset ympäristömuuttujat ovat:

```text
LPR_TEST_SERVICE_URL=https://lpr-verification-test-ziev.onrender.com
LPR_TEST_LEADERBOARD_URL=https://lpr-verified-test.panu-musakka-0bf.workers.dev
LPR_TEST_ANALYTICS_URL=https://lpr-analytics-test.panu-musakka-0bf.workers.dev
```

Rakennus korvaa vain `dist`-paketin päätepisteet. Tavallinen `npm run build`
ja tuotannon lähdeasetukset säilyvät ennallaan. Rakennus hylkää tunnetut
tuotanto-osoitteet. `staging.json` sisältää julkiset testiosoitteet,
simulaatiorevision ja Renderin lähdecommitin; se ei sisällä salaisuuksia.
Testin lopullinen pelilinkki ja suoritetun kokeen tulos kirjataan tähän tiedostoon
kun julkaisu ja verkkokoe ovat valmistuneet.

## Automaattinen HTTPS-koe

Käytä samaa checkoutia kuin testipelissä. Aja ilman muita testaajia palvelimella:

```sh
LPR_TEST_SITE_URL=https://TESTIPELIN-OSOITE npm run test:verified-remote
```

Koe lukee testisivun `staging.json`-tiedoston ja tarkistaa testipäätepisteet sekä
paikallisen ja etäpalvelimen simulaatiorevision. Se herättää varmennuspalvelimen,
luo kaksi satunnaista `NetTest ...` -tiliä ja alustaa kummallekin oman allekirjoitetun
ajosession. Molemmat aktivoidaan ja ajavat lähtökierroksen sekä lentävän kierroksen
samanaikaisesti oikeassa ajassa noin 194 sekunnissa. Syötteet valmistellaan ennen
ajoa, joten paikallinen 3D-piirto ei kuormita koetta.

Jokaisen kuittauksen ajotilaa verrataan paikalliseen vertailuun. Kierroskuitit ja
uusinnat lähetetään Workerille taustalla seuraavan kierroksen jatkuessa. Koe vaatii,
että kaikki neljä aikaa löytyvät testin julkiselta listalta ja niiden uusinnat
voidaan ladata. Testikannan tämän revision listalla pitää olla tilaa koetuloksille;
aiemmat nopeammat koetulokset voivat täyttää TOP 10:n.

Raportti kirjoitetaan `artifacts/verification/remote-two-players.json`-tiedostoon
myös ajonaikaisen epäonnistumisen jälkeen. Se ei sisällä salasanoja, kirjautumis-
tunnisteita, ajosession salaisia tunnisteita eikä allekirjoitusavainta. Testin lopuksi
ajosessiot suljetaan ja kirjautumiset perutaan. Testitilit ja kierrokset jäävät
testikantaan, ja raportin `runId`/`testAccounts` yksilöivät ne mahdollista siivousta
varten. Älä tyhjennä muiden testaajien rivejä.

Tämä mittaa HTTPS-liikennettä, Renderin ajosäikeitä, allekirjoitettua protokollaa,
Cloudflare Workeria ja D1-tallennusta. Se ei todista kahden oikean laitteen
piirtonopeutta tai ihmisen ohjauksen käytettävyyttä.

## Kahdella oikealla laitteella

1. Avaa sama testipelin linkki tietokoneella ja toisella laitteella. Tarkista
   TESTIVERSIO-merkintä ja luo eri nimimerkit kumpaankin.
2. Valitse ihmissarja, aloita molemmat ajot ja aja kummallakin vähintään kaksi
   kierrosta niin, että ajot ovat samanaikaisesti käynnissä.
3. Tarkista, että molemmat pysyvät virallisina, ajat tallentuvat ja uusinnat aukeavat.
   Jos ajo vaihtuu harjoitteluksi, kirjaa laite, kellonaika ja näkyvä syy.
4. Älä aja tätä samanaikaisesti automaattikokeen kanssa: kapasiteettiraja on kaksi.

Testipalvelimessa on sama kahden session oletusraja kuin tuotannossa. Automaattinen
julkaisu on pois käytöstä, jotta käynnissä olevan kokeen versio ei vaihdu uuden
pushin takia. Uuden testiversion julkaisu tehdään erikseen. Testipalvelu voi nukkua
käyttämättömänä; odota ensimmäisellä avauksella palvelimen heräämistä.

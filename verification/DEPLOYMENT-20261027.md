# Tuotantojulkaisu 27.10.2026

Käyttäjä hyväksyi mainiin viennin ja tuotantojulkaisun tiedossa olevista
testihavainnoista huolimatta. Julkaistu lähde on
`499134c91cc2a04c6857b008694af86510ba40a6`.
Simulaatiorevisio on
`a16f61c7d0e6e86402fe8c1aaab5a42a4a17cda3e6a314f8ee118c228bcd4b2a`.

## Julkaistut osat

- Peli: https://panulut.github.io/lprmotorsport/ . Pages-työnkulku
  https://github.com/panulut/lprmotorsport/actions/runs/40496515026 onnistui.
  Myös saman commitin Tests-työnkulku `40496515013` onnistui.
- Render `lpr-verification`, palvelu `srv-dbei13nb9u1s739pjf00`, työtila
  `tea-dbehutrrjlhs73foor2g`: julkaisu `dep-dbg8npqvcj2c73bgj80g` on `live`.
  Commit vastaa yllä olevaa main-versiota. `/health` palauttaa `ready=true`,
  `protocol=driving-v1`, `hz=120` ja yllä olevan revision.
- Cloudflare `lpr-verified`: versio `9369602c-c779-402c-b859-cf75c971e3df`,
  deployment `99c15927-dcee-46eb-91f4-032b0bab2cf7`, 100 % liikenteestä.
- Cloudflare `lpr-leaderboard` (analytiikka ja admin): versio
  `68ab3306-29fd-459a-9af8-da5b1f305d69`, deployment
  `53b20d69-ae25-45d1-8b0c-c2dee8448ae3`, 100 % liikenteestä.

Workerien lähteet luettiin suoraan julkaisucommitista. Nykyiset
`VERIFICATION_SECRET`- ja `ANALYTICS_ADMIN_TOKEN`-sidonnat sekä yhteinen
DB-sidonta säilytettiin. `SIMULATION_REVISION`-ohitusta ei ollut.
Verified-Workerin Cron Trigger on `0 3 * * *` UTC.

Renderin automaattijulkaisu oli ja on edelleen pois käytöstä. Pelaajaraja on 2,
varmennussäikeitä 1 ja `VERIFICATION_LAP_LAG_MS=2000`. Kapasiteettia ei nostettu.
Erillinen mittausavain asetettiin Renderiin ja analytiikka-Workeriin.
Raportointi käyttää `/api/internal/capacity`-osoitetta ja suojattu nykytilahaku
Renderin `/metrics`-osoitetta. Suojattu mittaus palautti HTTP 200 ja D1:n
kapasiteettihistoriaan tallentui tuotannon käynnistyslaskureita.

## Varmistus ja palautettavat versiot

Ennen skeemamuutoksia otettiin koko D1-tietokannan SQL-varmistus.
Paikallinen, Gitin ohittama tiedosto:
`artifacts/integration/production-backup-20261027.sql` (4 319 812 tavua).
SHA-256: `1fab04934e9741dc159c28ca63232dbe873bf0d1d23bfe33a6014a7108aef635`.
Varmistus sisältää henkilötietoja ja tunnistetietoja; sitä ei julkaista.
Tietokanta: `lpr-times`, `ef998479-47be-4d6a-b2f5-36e5e0c30ab7`.
`cloudflare/verified-schema.sql` suoritettiin lisäävästi olemassa olevassa D1:ssä.

Ennen julkaisua aktiiviset versiot:

- Render: `dep-dbf46oks728c73e24bh0`, commit
  `613df4fe980b9f80c47dcbebd0a56a8f766d5987`.
- Verified-Worker: `1ec5e213-29e7-4a40-a2c8-eb5a5dab1713`.
- Analytiikka-Worker: `7c76ca16-23f5-4c6b-966a-dd531436f1df`.
- Vanha main: `2f70a4549c2203b616e35c8dcc36b5ebf1027e99`.

Pelkkä yhden osan palautus ei takaa yhteensopivaa kokonaisuutta.
Säilytä lisätyt taulut ja pelaajien tiedot. Poista verified-Workerin ajastus,
jos palautettava versio ei tue sitä. Tietokannan palautus varmistuksesta on
erillinen toimenpide; sitä ei tehty tässä julkaisussa.

## Tuotantotarkistukset

- Yksi Node-asiakas ajoi oikeassa ajassa julkisen HTTPS-yhteyden kautta
  lähtökierroksen ja lentävän kierroksen. Molemmat pysyivät virallisina ja
  tallentuivat allekirjoitettujen uusintojen kanssa. Jokaisen kuittauksen
  ajotila vastasi paikallista vertailua. Suurin havaittu kuittausviive
  palvelinkelloon nähden oli noin 1 158 ms.
- Tilin luonti bottisarjaan, toinen kirjautuminen, uloskirjautuminen,
  allekirjoitettu lähtölupa, CORS, tuloslista ja päiväkisan kirjaukset toimivat.
- Julkinen peli testattiin oikealla Chromella ilman resurssien korvaamista:
  live-katselu, paluu valikkoon, harjoittelu ja 390 px:n mobiilinäkymä toimivat.
  Ei JavaScript-virheitä. Mobiilikuvakaappaus tarkastettiin.
- Julkinen lentävän kierroksen 3D-uusinta, aikajanan siirto ja toisto/tauko
  toimivat selaimessa ilman JavaScript-virheitä.
- Ylläpidon avaimeton kapasiteettihaku palautti 401. Verified-ylläpidon
  olemassa oleva paikallinen ylläpitoavain palautti 200.
- Vain satunnaisesti nimetty testitili `Release e69f04e7`, sen kaksi kierrosta,
  uusinnat, päiväkisakirjaukset ja sarjavalinta poistettiin kokeen jälkeen.
  Testitilin paikallinen tunnistetiedosto poistettiin. Muut pelaajat säilytettiin.
  Kaikki ennen julkaisua olleet 246 vanhan revision kierrosta ovat yhä D1:ssä.

Raakaraportit ja kuvat ovat Gitin ohittamassa `artifacts/integration/`-hakemistossa:
`production-release-check-20261027.json`, `production-browser-smoke.json` ja
`production-replay-smoke.json` sekä `production-*.png`.

## Tarkistuksen rajat

Yhden synteettisen ajajan onnistuminen ei osoita kahden pelaajan vakaata
kapasiteettia eikä oikeiden mobiililaitteiden ajon toimivuutta. Aiempi
Sale-suojakaiteen ulkoasutestin havainto on ennallaan. Tuotantopalvelimelle
ei tehty erillistä restart-koetta kapasiteettihistorian tarkistamiseksi:
palvelussa oli muita aktiivisia ajoja. Historia varmistettiin D1:stä.
Julkaisun aikana avoinna olleet pelivälilehdet on päivitettävä.

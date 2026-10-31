# Palvelinpäivitys ja tuotantotarkistus 25.10.2026

## Historiallinen tilanne 25.10.2026

> Tämä on 25.10. tehdyn kokeen historiallinen raportti, ei uusimman version julkaisuohje.
> Nykyinen julkaisuohje: [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
> Vanha Worker-versio 6 ei sisällä myöhempiä chat-lippuja, sarjoja ja katsojailmoituksia.
> Tässä raportissa mainittua tuotantotilaa ei ole tarkistettu uudelleen 26.10.

- GitHubin integraatiohaara: `integration/main-updates-20261025`. Main ja julkisen Pages-pelin tiedostot ovat ennallaan.
- Renderin `lpr-verification` on julkaistu commitista `613df4fe980b9f80c47dcbebd0a56a8f766d5987`.
  Julkaisu `dep-dbf46oks728c73e24bh0` valmistui tilaan `live`.
- Renderin työtila on **LPR Motorsport**, palvelutunnus `srv-dbei13nb9u1s739pjf00`.
  Palvelu seuraa edelleen mainia, mutta tarkan commitin manuaalijulkaisu poisti automaattijulkaisut käytöstä.
- D1-tietokannan skeema päivitettiin `cloudflare/verified-schema.sql`-tiedostosta.
  Vanhat tulokset säilytettiin. Testitietojen siivouksen jälkeen tietokannassa oli 235 varsinaista kierrostulosta.
- Uusi Worker-versio `e1abc14f-68ed-48a5-a6b2-e15632f9d87c` (versio 6) julkaistiin ja testattiin oikeassa tuotannossa.
  DB-binding ja olemassa oleva `VERIFICATION_SECRET` säilytettiin.
  `ANALYTICS_ADMIN_TOKEN` lisättiin salaisuutena. Avaimen paikallinen kopio on Gitin ohittamassa `.env.verified-admin`-tiedostossa.
- Testien jälkeen julkinen Worker-liikenne palautettiin versioon
  `1ec5e213-29e7-4a40-a2c8-eb5a5dab1713`, jotta nykyinen vanha Pages-peli jatkaa toimintaansa.
  Versio 6 oli kokeen testiversio; uusinta julkaisua varten rakennetaan uusi Worker integraatiohaaran samasta julkaisukohdasta.
- Siivouksen Cron Trigger `0 3 * * *` testattiin asetuksen osalta ja poistettiin palautuksen yhteydessä,
  koska vanhassa Workerissa ei ole scheduled-käsittelijää. Ajastus lisätään uudelleen vasta uusimman Workerin julkaisun yhteydessä.

## Oikeilla tuotantopalveluilla tehdyt testit

Testiasiakas ajoi normaalilla palvelinkellolla noin 197 sekunnin kokeen:

1. Väliaikaisen tilin rekisteröinti, väärän salasanan hylkäys ja kirjautuminen toisella istunnolla.
2. Yhden kirjautumisen uloskirjautuminen; peruttu tunniste hylättiin mutta toinen kirjautuminen säilyi.
3. Tilin nimimerkkiin sidottu allekirjoitettu lähtölupa hyväksyttiin Renderissä.
4. Lähtökierros ja seuraava lentävä kierros varmennettiin reaaliajassa.
   Paikallinen ajotila vastasi jokaisessa erässä palvelimen laskemaa ajotilaa.
5. Molemmat kierrokset tallentuivat allekirjoitettujen uusintojen kanssa.
   Kierrospituudet olivat 11 541 ja 11 646 fysiikka-askelta; tallenteet olivat 545 992 ja 550 084 merkkiä.
6. Tallenteen muuttaminen hylättiin. Uusintalähetys ei monistanut tulosta.
7. TOP 10 -linkit ja gzip-uusintojen julkinen lataaminen toimivat.
8. Ylläpidon rajapinta hylkäsi avaimettoman pyynnön ja hyväksyi asetetun ylläpitoavaimen.
9. Uloskirjautuminen esti uuden lähtöluvan saamisen.

Chrome-kokeessa käytettiin uuden integraatioversion tiedostoja vain testivälilehden
pyyntöjen korvauksina. Sivun alkuperä oli tuotannon GitHub Pages -alkuperä;
Cloudflare- ja Render-pyynnöt menivät oikeisiin tuotantopalveluihin.
Julkisia Pages-tiedostoja ei muutettu. Kirjautuminen, CORS, virallisen ajon aktivointi,
salasanakentän tyhjentyminen, uloskirjautuminen, TOP 10 -uusintalinkit,
uusintakatselimen latautuminen ja aikajanan siirto läpäisivät. JavaScript-virheitä ei ollut.

Ensimmäinen API-koe pysäytti ajosyötteiden lähettämisen tallennuspyyntöjen ajaksi.
Tämä teki seuraavasta kierroksesta harjoittelua oikein. Testiohjelma korjattiin
lähettämään tallenteet taustalla kuten peli; yllä kuvatut tulokset ovat sen jälkeen
läpäisseestä kokeesta. Molempien yritysten testitilit, kirjautumiset,
kierrostulokset ja tallenteet poistettiin tarkasti vain testitilin tunnisteilla.
Muiden pelaajien tietoja ei poistettu.

Lopuksi varmistettiin vanhan Workerin ja päivitetyn Renderin yhteensopivuus:
vanhan rajapinnan lähtölupa hyväksyttiin, ajosessio aktivoitui ja poistettiin,
ja julkinen tuloslista palautti jälleen kymmenen tulosta.

Paikalliset, Gitin ohittamat raportit ja kuvat:

- `artifacts/integration/production-check-report.json`
- `artifacts/integration/production-browser-report.json`
- `artifacts/integration/production-leaderboard.png`
- `artifacts/integration/production-replay.png`

## Nykyinen julkaisuohje

Noudata [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)-ohjetta. Älä aktivoi tämän
historiallisen raportin Worker-versiota 6 uuden pelin palvelimeksi. Julkaistavat
Worker, Render ja Pages rakennetaan samasta tarkistetusta integraatiocommitista.

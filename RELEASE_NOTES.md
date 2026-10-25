# Seuraava julkaisu — luonnos

Ei vielä julkaistu. Julkaise vasta, kun uusi `lpr-verified`-Worker on käytössä.

## Pelaaminen ja tietojen kerääminen

- Pelaa ilman leaderboardia: ei tiliä eikä tulosten lähetystä.
- Aja leaderboardiin: nimimerkkitili, varmennus ja kierrosaikojen tallennus.
- Kehitysanalytiikka on vapaaehtoinen molemmissa tiloissa. Suostumuksen peruminen ei keskeytä pelaamista eikä leaderboard-osallistumista.

## Oma nimimerkki salasanalla

- Nimimerkki varataan salasanalla: kukaan muu ei voi ajaa sillä nimellä.
- Samalla nimimerkillä ja salasanalla kirjaudut millä tahansa laitteella. Kirjautuminen muistetaan enintään seitsemän päivää.
- Kirjaudu ulos mitätöi tämän laitteen istunnon myös palvelimella; muut laitteet ja tallennetut kierrosajat säilyvät.
- Päivityksen jälkeen aiemmin kirjautuneilta pyydetään salasana uudelleen.
- Tuloslista alkaa taas alusta: TOP 10:ssä näkyvät vain tileillä ajetut kierrokset.
- Salasanaa ei voi palauttaa. Unohtuneen salasanan nimimerkin voi vapauttaa ylläpito.

# Julkaisu 25.10.2026 — palvelimella varmennettu tuloslista

## Uusi alku tuloslistalle

Tuloslista aloitetaan tässä päivityksessä puhtaalta pöydältä, jotta kaikki ajat
ovat samojen sääntöjen mukaan tarkistettuja.

Peli tarkistaa ajosuoritukset nyt myös palvelimella. Pelkkä selaimen lähettämä
ilmoitus kierrosajasta ei enää riitä tuloslistalle: palvelin laskee ajon
ohjaussyötteistä ja vahvistaa tuloksen ennen tallennusta.

Pelaaminen toimii tuttuun tapaan. Valitse nimimerkki, hyväksy peli- ja
käyttötietojen kerääminen ja lähde ajamaan. Jos ajon valmistelu kestää,
voit harjoitella odottaessasi. Virallinen ajo alkaa liikennevaloista, kun yhteys on
valmis. Jos yhteys varmennuspalvelimeen katkeaa kesken ajon, auto ei pysähdy eikä
palaa lähtöön: ajo jatkuu harjoitteluna, ja uuden virallisen ajon aloitat itse
*Aloita uudelleen* -painikkeesta.

Ajon tila näkyy koko ajan ruudulla. Ensimmäinen pelaaja saattaa odottaa palvelimen
heräämistä jopa minuutin; samanaikaisesti virallisia ajoja mahtuu kaksi.

Vanhat ajat eivät siirry uudelle tuloslistalle.

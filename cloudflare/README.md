# Tulosseurannan käyttöönotto

1. Avaa Cloudflaressa **Storage & databases → D1 → lpr-times → Console**.
2. Kopioi `schema.sql`-tiedoston sisältö konsoliin ja suorita. Jos konsoli hyväksyy vain yhden komennon kerrallaan, suorita neljä SQL-komentoa erikseen.
3. Avaa **Compute → Workers & Pages → lpr-leaderboard → Edit code**.
4. Korvaa Hello World -koodi kokonaan `worker.mjs`-tiedoston sisällöllä ja paina **Deploy**.
5. Varmista, että Workerissa on D1-binding **DB → lpr-times**.
6. Avaa https://lpr-leaderboard.panu-musakka.workers.dev/api/leaderboard . Aluksi vastauksen tulee olla `{"version":"lut-20261011-v3","results":[]}`.
7. Julkaise päivitetyt pelitiedostot GitHub Pagesiin normaalilla julkaisumenetelmällä. Vahvista pelin aloitusnäkymässä nimimerkki ja paina **Aloita ajo**. Aja kokonainen kierros ilman taukoja tai vierailuja ja avaa tuloslista 🏆-painikkeesta. Ensimmäinenkin kelvollinen kierros lähetetään. Peli näyttää palvelimen tuloksista TOP 10:n.

Pelin alkuperäksi on asetettu Git-remoten perusteella `https://panulut.github.io`. Jos pelillä on oma verkkotunnus, lisää sen alkuperä (protokolla ja verkkotunnus ilman polkua) `worker.mjs`-tiedoston ORIGINS-listaan. localhost:8000 toimii myös. Muilla lähiverkon osoitteilla verkkotulokset eivät ole käytössä.

Nimimerkki on julkinen. Nimimerkki vahvistetaan jokaisella sivun avauksella, ja se pysyy samana pelikerran ajan. Eri nimimerkeillä on samalla selaimella erilliset yksityiset satunnaistunnisteet; sama nimi säilyttää aiemman tunnisteensa. Aiemman käyttöliittymän pelaajatunniste siirtyy muistettuun nimimerkkiin, joten aiempi ennätys säilyy. Yksityinen satunnaistunniste toimii pelaajan avaimena; palvelin tallentaa sen SHA-256-tiivisteen eikä tuloslista paljasta pelaajan avainta. Selaimen tallennustilan tyhjennys tai laitteen vaihto luo uuden pelaajan. Nimimerkit eivät ole yksilöllisiä. Uusi nimimerkki valitaan avaamalla peli uudelleen.

Tämä on epävirallinen tuloslista: palvelin tarkistaa version, nimimerkin, aikojen rakenteen ja sektorien summan, mutta ei aja kierrosta uudelleen. Selaimen tietoja voi väärentää. IP-kohtainen raja on 10 kelvollista lähetystä minuutissa; samaa verkkoyhteyttä käyttävät pelaajat jakavat tämän rajan. IP-osoitteista tallennetaan lyhytikäiset tiivisteet, jotka siivotaan seuraavien lähetysten yhteydessä. CORS ei ole väärentämisen esto.

Vanhoja paikallisia ennätyksiä ei lähetetä jälkikäteen. Jokainen uusi kelvollinen kierros lähetetään, ja tietokanta korvaa vain pelaajan hitaamman ennätyksen. Jos verkko ei toimi, paikallinen ajanotto toimii edelleen; epäonnistunutta lähetystä ei jonoteta.

Kun rata tai ajomalli muuttuu, vaihda sama versionumero sekä `leaderboard.js`- että `worker.mjs`-tiedostossa ja julkaise molemmat. Vanhan version ajat säilyvät tietokannassa erillään.

Cloudflare-koodi ja SQL eivät ole osa pelin julkista HTTP-tiedostopalvelua. Käyttöönotto ei tarvitse API-avainta pelin lähdekoodiin.

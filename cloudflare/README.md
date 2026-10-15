# Tulosseurannan käyttöönotto

1. Avaa Cloudflaressa **Storage & databases → D1 → lpr-times → Console**.
2. Kopioi `schema.sql`-tiedoston sisältö konsoliin ja suorita. Jos konsoli hyväksyy vain yhden komennon kerrallaan, suorita neljä SQL-komentoa erikseen.
3. Avaa **Compute → Workers & Pages → lpr-leaderboard → Edit code**.
4. Korvaa Hello World -koodi kokonaan `worker.mjs`-tiedoston sisällöllä ja paina **Deploy**.
5. Varmista, että Workerissa on D1-binding **DB → lpr-times**.
6. Avaa https://lpr-leaderboard.panu-musakka.workers.dev/api/leaderboard . Aluksi vastauksen tulee olla `{"version":"lut-20261011-v3","results":[]}`.
7. Julkaise päivitetyt pelitiedostot GitHub Pagesiin normaalilla julkaisumenetelmällä. Vahvista pelin aloitusnäkymässä nimimerkki ja paina **Aloita ajo**. Aja kokonainen kierros; tauot, tuloslistan avaaminen ja sovelluksen vaihtaminen ovat sallittuja ja avaa tuloslista 🏆-painikkeesta. Ensimmäinenkin kelvollinen kierros lähetetään. Peli näyttää palvelimen tuloksista TOP 10:n.

Pelin alkuperäksi on asetettu Git-remoten perusteella `https://panulut.github.io`. Jos pelillä on oma verkkotunnus, lisää sen alkuperä (protokolla ja verkkotunnus ilman polkua) `worker.mjs`-tiedoston ORIGINS-listaan. localhost:8000 toimii myös. Muilla lähiverkon osoitteilla verkkotulokset eivät ole käytössä.

Nimimerkki on julkinen. Nimimerkki vahvistetaan jokaisella sivun avauksella, ja se pysyy samana pelikerran ajan. Eri nimimerkeillä on samalla selaimella erilliset yksityiset satunnaistunnisteet; sama nimi säilyttää aiemman tunnisteensa. Tunniste ei rajoita kierrosten määrää. Aiemman käyttöliittymän pelaajatunniste siirtyy muistettuun nimimerkkiin, joten aiempi ennätys säilyy. Yksityinen satunnaistunniste toimii pelaajan avaimena; palvelin tallentaa sen SHA-256-tiivisteen eikä tuloslista paljasta pelaajan avainta. Selaimen tallennustilan tyhjennys tai laitteen vaihto luo uuden pelaajan. Nimimerkit eivät ole yksilöllisiä. Uusi nimimerkki valitaan avaamalla peli uudelleen.

Tämä on epävirallinen tuloslista: palvelin tarkistaa version, nimimerkin, aikojen rakenteen ja sektorien summan, mutta ei aja kierrosta uudelleen. Selaimen tietoja voi väärentää. IP-kohtainen raja on 120 kelvollista lähetystä minuutissa; samaa verkkoyhteyttä käyttävät pelaajat jakavat tämän rajan. IP-osoitteista tallennetaan lyhytikäiset tiivisteet, jotka siivotaan seuraavien lähetysten yhteydessä. CORS ei ole väärentämisen esto.

Vanhoja paikallisia ennätyksiä ei lähetetä jälkikäteen. Jokainen uusi kelvollinen kierros tallentuu omana rivinään. TOP 10 näyttää kymmenen nopeinta kierrosta, eikä kuljettajakohtaista rajaa ole: sama kuljettaja voi ajaa kaikki kymmenen kärkiaikaa samalla pelikerralla tai eri kerroilla. Samatkin kierrosajat säilyvät erillisinä kierroksina; tasatilanteessa aiemmin tallennettu kierros on edellä. Saman lähetyksen uudelleenlähetys samalla lapId-tunnisteella ei luo kaksoiskappaletta. Tuloslistassa näytetään kyseisen kierroksen sijoitus. Jos verkko ei toimi, paikallinen ajanotto toimii edelleen; epäonnistunutta lähetystä ei jonoteta.

Kun rata tai ajomalli muuttuu, vaihda sama versionumero sekä `leaderboard.js`- että `worker.mjs`-tiedostossa ja julkaise molemmat. Vanhan version ajat säilyvät tietokannassa erillään.

Cloudflare-koodi ja SQL eivät ole osa pelin julkista HTTP-tiedostopalvelua. Käyttöönotto ei tarvitse API-avainta pelin lähdekoodiin.

## Päivitys aiemmasta pelaajakohtaisesta listasta

Julkaise uusi `worker.mjs` samaan `lpr-leaderboard`-Workeriin, jonka D1-binding on edelleen `DB → lpr-times`. Worker luo `laps`-taulun automaattisesti ja kopioi `best_laps`-taulun olemassa olevat ajat sinne kerran. Vanhaa taulua ei poisteta. Migraation uudelleen suorittaminen ei monista tuloksia. Vanhassa järjestelmässä jo korvattuja tai tallentamatta jätettyjä kierroksia ei voi palauttaa.

Uusi GET `/api/leaderboard` palauttaa `mode: "laps"` ja kymmenen nopeinta kierrosta. POST `/api/laps` palauttaa kyseisen kierroksen `lapMs`, `rank`, `inTop10` ja `record` sekä yhteensopivuuden vuoksi pelaajan `bestMs`. Valinnainen `lapId` on 32–64 heksamerkkiä; peli luo jokaiselle kierrokselle uuden satunnaisen tunnisteen. Vanha peliversio ilman `lapId`-kenttää toimii edelleen, mutta sen pyyntöjä ei voi tunnistaa saman lähetyksen uusintayrityksiksi.

Julkaise Worker ennen päivitettyä peliä. Jos pelin julkaisu ehtii ensin, vanhan palvelimen vastaus näytetään käyttäjälle selkeästi: lista ei vielä tue saman kuljettajan useita kierroksia. Uusi palvelin on käytössä vasta, kun GET-vastauksessa näkyy `mode: "laps"`.

Kierroskello jatkuu tuloslistan ollessa auki ja sovelluksen ollessa taustalla. Palattaessa fysiikan ruutuaika nollataan, jotta auto ei hyppää eteenpäin tauon pituista askelta, mutta kierrosajasta ei vähennetä taukoa.

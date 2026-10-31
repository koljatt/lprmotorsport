> Historiallinen suunnitelma 24.10.2026. Ei nykyinen julkaisuohje. Ajantasainen tilanne: ../../verification/INTEGRATION-20261026.md.

# LPR Motorsport: haarakatselmointi ja palvelinvarmennuksen suunnitelma

Tarkastettu 24.10.2026. Tämä on katselmointi ja toteutussuunnitelma; muutoksia ei ole yhdistetty mainiin eikä palveluita julkaistu.

## Tarkastettu lähtötilanne

- Repository: https://github.com/panulut/lprmotorsport
- main: `8255d2d5d5b5613214e4bdd9ba0847bbc14bfcc0`
- anticheat: `444c3a77c7a1fb997cdea32854c4666bee95318c`, kaksi committia mainin edellä, ei mainin jäljessä.
- PR #4 / codex/leaderboard-retry-sync: `1086c4d62beda6e0402cef8623dafe928408d898`.
- anticheat yhdistyy nykyiseen mainiin ilman tekstikonflikteja. Tämä ei osoita toiminnallista valmiutta.
- anticheat ja PR #4 ovat keskenään ristiriidassa viidessä tiedostossa: cloudflare/admin.html, cloudflare/worker.mjs, leaderboard.js ja kaksi leaderboard-testiä.

## Yhdistämissuositus

Älä yhdistä anticheat-haaraa sellaisenaan. Sen kiinteä 120 Hz fysiikka-askel on hyödyllinen pohja, mutta analytiikkatapahtuman löytyminen ei todista ajosuoritusta. Julkinen analytics/events vastaanottaa selaimen ilmoittaman lap_complete-tapahtuman; myös keksitty aika voidaan lähettää ensin sinne ja sitten /api/laps-rajapintaan. Worker tarkistaa vain analytiikkaprofiilin, saman ajan ja tapahtuman tuoreuden. Se ei laske reittiä tai aikaa ohjauskomennoista eikä sido tapahtumaa yksilölliseen, kertakäyttöiseen kierrokseen.

Analytiikkasuostumuksen muuttaminen tuloslistan ehdoksi tuo lisäksi tallennukseen uuden riippuvuuden. Pakollinen ajon tekninen varmennus kannattaa toteuttaa erillään vapaaehtoisesta käyttötietojen keruusta.

PR #4 sisältää jo palvelimen myöntämät kierrosaloitukset, lähetysjonon, toistojen käsittelyn, epäilyttävien aikojen karanteenin ja moderoinnin. Käytä sitä integraation pohjana; siirrä anticheat-haarasta tarpeelliset fysiikkamuutokset harkiten. Älä ota molempien haarojen Worker- ja leaderboard-toteutuksia rinnakkain. PR #4:n ajallinen ja sektorirajoihin perustuva tarkastuskaan ei vielä varmista ajofysiikkaa.

## Paikalliset tarkistukset

Node v24.22.1, puhtaat checkoutit, ei tuotantotietokantamuutoksia.

anticheat:

- test:audio ja test:physics läpäisivät.
- test:tools epäonnistui development-tools.test.cjs:44:n onlineInvalid-odotukseen. Sama odotus on mainissa; kyseessä on jo lähtötilanteessa oleva testin ja koodin ristiriita.
- test:performance epäonnistui puuttuvaan window-stubiin. Myös mainin testistä puuttuu stubi.
- test:leaderboard epäonnistui asiakastestissä: uusi LPRAnalytics-stubi ei toteuta identify-metodia, jota leaderboard kutsuu.
- Erilliset leaderboard-start.test.cjs ja leaderboard.test.cjs läpäisivät.
- test:analytics, build:worker ja build läpäisivät.
- Kiinteän fysiikan oikeaa selainajoa ja mobiilisuorituskykyä ei tällä katselmoinnilla todennettu.

GitHub Actions vahvistaa anticheat-haaran samat kolme epäonnistunutta kokonaisuutta: https://github.com/panulut/lprmotorsport/actions/runs/40094015987

PR #4:n kaikki kuusi nykyistä testikokonaisuutta (audio, physics, tools, performance, leaderboard, analytics) sekä build:worker ja build läpäisivät paikallisesti. Erillistä test:replay-mittausta ei ajettu. Tämä ei ole koko PR:n turvallisuuden hyväksyntä: esimerkiksi kehitystilojen suojaus on tarkistettava käytöksen tasolla, sillä PR poistaa aiemman onlineInvalid-odotuksen.

PR #4:n replay-probe.md sisältää aiemman mittauksen: noin 23,7 sekuntia CPU-aikaa 96,167 sekunnin synteettiselle kierrokselle, 2 026 törmäyskohdetta ja 90 Hz simulaatio. Kyse on dokumentoidusta Windows-mittauksesta, ei tässä katselmoinnissa tehdystä mittauksesta eikä Render-tuloksesta. Sitä ei voi suoraan soveltaa anticheat-haaran 120 Hz simulaatioon.

## Uuden päivityksen rakenne

Nykyinen GitHub Pages tarjoaa pelin. Erillinen Node-palvelu Renderissä laskee ajon. Nykyinen Cloudflare Worker ja D1 voivat säilyä tuloslistan ja pysyvien tulosten palveluna. Renderin paikallinen levy tai prosessin muisti ei ole pysyvä tulostallennus.

Selain lähettää vain rajatun protokollan mukaiset ohjauskomennot. Palvelin omistaa lähtötilan, ajanoton, kierroksen tilan ja hyväksymispäätöksen. Selain ei saa päättää auton nopeutta, fysiikkaparametreja, lähtökoordinaatteja, tarkistuspisteitä tai hyväksyttyä aikaa.

### Vaihe 1: yhteinen fysiikka ja mittaus

1. Irrota game.js:n ajosimulaatio yhteiseen moduuliin. Selain ja palvelin käyttävät samaa versiota, 120 Hz askelta ja samoja rata-, maasto- ja ajoneuvotietoja. Piirtäminen, DOM ja äänet jäävät selaimeen.
2. Siirrä renderer.updatePeople-funktion törmäyksiin vaikuttavat päivitykset simulaatioon. Animoidut henkilöt, siirtyvät esteet, vauriot, luistonesto ja auton kaikki ajotilaan vaikuttavat arvot kuuluvat varmennettavaan tilaan. Palvelimella on oma maailma jokaista pelisessiota varten.
3. Optimoi törmäyskohteiden ja lähimmän ratapisteen haut tilallisella indeksillä. Vertaa vanhan ja uuden haun tuloksia samoilla ajotallenteilla.
4. Tallenna oikeita selainajoja sekä näppäimistöllä että analogiohjauksella. Vertaa selaimen ja Node-palvelun välitiloja, kierrosaikaa ja sektoreita. Kiinteä aika-askel yksin ei takaa vastaavuutta.
5. Mittaa valitulla ilmaisella Render-instanssilla kylmä ja lämmin käynnistys, CPU-sekunnit/simuloitu sekunti sekä 1, 2 ja 5 samanaikaista pelaajaa. Kaksi pelaajaa tarvitsee kaksi erillistä simulaatiota. Älä lupaa kapasiteettia ennen mittausta.

Hyväksymisehto: palvelin pystyy käsittelemään tavoitellun pelaajamäärän saapuvat komennot ilman jatkuvasti kasvavaa jonoa, riittävällä marginaalilla. Jos ei, optimoi lisää tai valitse tehokkaampi palvelu. Aiempi noin 1–2 sekunnin hyväksymisviive oli tavoite, ei nykykoodille osoitettu ominaisuus.

### Vaihe 2: sessiot ja jatkuva tarkastus

- GET /health ilmoittaa palvelun valmiuden. Pelkkä vastaava HTTP-palvelin ei vielä riitä: yhteinen simulaatioversio ja pysyvä tallennusyhteys tarkistetaan myös.
- POST /sessions myöntää satunnaisen, pelaajaan ja versioon sidotun sessiotunnisteen sekä palvelimen määrittämän lähtötilan ja simulaation aikakauden.
- POST /sessions/:id/inputs vastaanottaa esimerkiksi 0,5 sekunnin erät: järjestysnumero, ensimmäinen tick ja rajatut ohjausarvot jokaiselle askeleelle. Kuljetus voi myöhemmin olla WebSocket; aluksi HTTP-erät helpottavat uusintojen käsittelyä.
- Sama erä samalla sisällöllä kuitataan idempotentisti; sama numero eri sisällöllä hylätään. Aukkoja ei ohiteta. Palvelin palauttaa viimeisen vahvistetun tickin ja omat kierrostapahtumansa.
- Ohjauksen lisäksi välitetään rajatut ajotilaan vaikuttavat tapahtumat, kuten TC:n vaihto ja restart. Ei suoritettavaa koodia eikä selaimen vapaasti määrittämää tilaa.
- Rajoita datakoko, erien taajuus, tick-määrä, session kesto, samanaikaiset sessiot, jonot ja laskentatyö. Estä etukäteen simuloidun ajan eteneminen palvelimen kelloa nopeammin; määritä rajattu verkkoviivepuskuri.
- Tauko ja piilotettu välilehti käsitellään erikseen. Ensiversiossa katkeava varmennus siirtää harjoitteluun. Älä anna selaimen tauottaa virallista aikaa mielivaltaisesti.
- Palvelin laskee itse järjestetyt tarkistuspisteet, lähtöviivan suunnan, sektorit ja maalin. Nykyisten kolmen sektorialueen lisäksi tarvitaan riittävän kattava oikaisun tunnistus.

### Vaihe 3: lämmittely ja luotettu siirtymä

Pelisivu lähettää herätyspyynnön heti latautuessaan. Palvelimen käynnistyessä pelaaja saa ajaa harjoittelua tekstillä: ”Lämmittely — virallinen ajanotto käynnistyy pian”. Valmiille palvelimelle tuleva toinen pelaaja ohittaa palvelimen herätyksen odotuksen; jokainen pelaaja tarvitsee silti oman varmennetun session.

Tärkeä tarkennus aiempaan ideaan: nukkumisen aikana ajettua auton tilaa ei voi ottaa luotettuna lähtötilana seuraavalla lähtöviivan ylityksellä. Palvelin ei ole nähnyt tätä ajoa. Ensimmäinen toteutus tarjoaa palvelimen valmistuttua siirtymisen viralliseen ajoon palvelimen määräämästä lähtöruudusta, lyhyellä lähtölaskennalla ja maailman nollauksella. Pelaajan siihenastista harjoittelua ei muuteta jälkikäteen viralliseksi.

Jos halutaan täysin saumaton lentävä aloitus, palvelimen on ensin simuloitava luotetusta lähtötilasta alkava lämmittely-/ulosmenokierros. Vasta palvelimen hyväksymän lähtöviivan ylitys aloittaa virallisen kierroksen. Myöhemmät lentävät kierrokset jatkavat saman varmennetun session tilasta.

Käyttöliittymätilat: lämmittely → valmis viralliseen lähtöön → varmennettu ajo → tulos tarkastettavana → hyväksytty. Yhteysvika, ylikuorma tai palvelimen uudelleenkäynnistys palauttaa tarvittaessa harjoitteluun. Autoa voi edelleen ajaa; tarkastamatonta kierrosta ei julkaista.

### Vaihe 4: tulosten hyväksyntä ja pysyvyys

- Vain tarkastuspalvelimen palvelintunnuksella lähettämät tulokset pääsevät varmennettuun tuloslistaan. Käytä rajattua palvelinrajapintaa ja erillistä salaisuutta; ylläpitoavainta ei jaeta selaimeen.
- Sido hyväksyntä pelaajaan, rata-/fysiikkaversioon, sessioon ja yksilölliseen kierrokseen. Pysyvä tallennus on idempotentti, jotta sama tulos ei tallennu kahdesti.
- Sulje vanha selaimen /api/laps-hyväksymispolku varmennetulta listalta. Muuten uuden tarkastuksen voi kiertää vanhaa rajapintaa käyttämällä.
- Lähetysjonoon voi tallentaa palvelimen jo vahvistamia tuloksia tai keskeneräisiä komentoja protokollan salliman rajan verran. Selaimen jonossa oleva aikaväite ei yksin todista ajoa.
- Jos sessio häviää Renderin uudelleenkäynnistyksessä, kesken ollut ajo jää harjoitteluksi tai palautuu vain palvelimen pysyvästi vahvistamasta tilasta ja jatkumosta. Ei selainlähtöistä tilan palautusta.
- Vanhat ajat säilytetään erillisinä historiallisina/varmentamattomina tuloksina. Niitä ei nimetä fysiikalla varmennetuiksi. Fysiikan ja ajanoton muutokset voivat vaikuttaa aikojen vertailukelpoisuuteen.

### Vaihe 5: julkaisu ja hyväksymiskokeet

Toteuta erilliseen integraatiohaaraan PR #4:n pohjalta. Korjaa testit tarkoituksenmukaisesti; turvallisuutta koskevaa odotusta ei poisteta ilman korvaavaa käytöksen tarkistusta. Aja kaikki nykyiset testit ja lisää protokollan sekä oikeiden ajotallenteiden testit.

Kokeile vähintään: kylmäkäynnistys ja lämmin palvelin, toinen pelaaja kaksi minuuttia myöhemmin, kaksi samanaikaista aloitusta, yhteyskatko, palvelimen restart, toistetut/väärässä järjestyksessä tulevat erät, muokattu moottoriteho, keksitty aika, luvaton lähtötila, oikaisu, TC:n vaihto, lentävä kierros, piilotettu välilehti ja vanhan lähetysrajapinnan käyttö.

Julkaise ensin varmennus ja suljettu tulosten kirjoituspolku testattuun ympäristöön, sitten yhteensopiva selainversio. Nykyinen Pages-työnkulku julkaisee mainiin tulevan pelin; se ei julkaise Cloudflare Workeria tai Render-palvelua. Niiden käyttöönotto ja palautus on suunniteltava erikseen. Älä jätä käyttöön selainversiota ja palvelinversiota, joiden protokollat eivät sovi yhteen.

Palvelintarkastus todistaa ajon mahdollisuuden hyväksytyllä fysiikalla. Se ei yksin todista, että ohjauskomennot antoi ihminen, eikä estä sallituilla komennoilla ajavaa bottia.

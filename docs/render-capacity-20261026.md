# Render-testipalvelimen kapasiteettimittaus 26.10.2026

Testikohde: `lpr-verification-test` (Render Free, Oregon), yksi palvelin ja yksi
jaettu varmennussäie. Tuotantopalvelua tai `main`-haaraa ei muutettu.

Testipeli ja varmennuspalvelin julkaistiin haarasta
`integration/next-update-20261026`, commitista
`2c9fbf7bdd50b3bdd42ad3ccb8e230de73cf5917`.
Simulaatiorevisio:
`a16f61c7d0e6e86402fe8c1aaab5a42a4a17cda3e6a314f8ee118c228bcd4b2a`.
Erillisen testitulospalvelun `SIMULATION_REVISION` päivitettiin vastaamaan sitä.

## Menetelmä

Node-asiakkaat lähettävät ohjaussyötteitä oikeassa ajassa julkisen HTTPS-yhteyden
kautta. Jokainen ajaa saman 193,225 sekunnin sarjan: paikaltaan lähtevä kierros
ja lentävä kierros. Palvelimen palauttamaa ajotilaa verrataan paikalliseen
vertailuun jokaisella kuittauksella. Jokaiselta kierrokselta edellytetään
allekirjoitettua kuittia, tallennetta ja testitulospalvelun hyväksymää tallennusta.
Julkisella listalla säilyneiden testikierrosten uusinnat tarkistetaan erikseen;
listan kymmenen rivin raja ja tallenteiden säilytysrajat huomioidaan.

Selaimen 3D-renderöinti, ihmisen ohjaus, mobiililaitteet ja pitkän ajan vakaus
eivät kuulu tähän mittaukseen. Verkkoreitti sisältää Suomen ja Oregonin välisen
viiveen. HTTP-pyynnön kesto ja palvelimen kellosta laskettu varmennusviive ovat
eri mittareita.

Pelaajaraja nostettiin kokeen ajaksi 16:een ja aloitusraja 16:een minuutissa.
Huijaukseneston 1 500 ms:n saapumisviiverajaa ei muutettu. Testi keskeyttää
ajajan, jos hyväksymiskelpoisuus katoaa tai ajotila poikkeaa vertailusta.
Suurempaan pelaajamäärään edetään vain edellisen tason onnistuttua.

## Tulokset

| Koe | Tulos | Hyväksytyt kierrokset | Varmennusviive |
| --- | --- | --- | --- |
| 2 ajajaa, vertailu | Läpäisi | 4/4 | Ajajakohtainen p95 1 112–1 192 ms, maksimi 1 773 ms |
| 4 ajajaa | Hylätty | 0/8 suunnitellusta | Hyväksymiskelpoisuus katosi noin 12–13 simulaatiosekunnin kohdalla; maksimi 3 323 ms |
| 2 ajajaa, vahvistus | Hylätty | 3/4 | Yksi ajo menetti hyväksymiskelpoisuuden 173,4 sekunnin kohdalla; saapumisviive 1 535 ms |
| 1 ajaja | Läpäisi | 2/2 | p50 297 ms, p95 500 ms, p99 830 ms, maksimi 1 475 ms |
| 8 ja 16 ajajaa | Ei ajettu | — | Neljän ajajan koe ylitti keskeytysrajan |

Kahden ajajan vertailussa ei esiintynyt HTTP-virheitä tai palautusyrityksiä.
Neljän ajajan kokeessa kaikki neljä menettivät hyväksymiskelpoisuutensa:
saapumisviiveet olivat hylkäyshetkillä 1 580–2 526 ms. Keskeneräiset ajot
peruttiin ja aktiivisten sessioiden määrä palautui nollaan.

Neljän ajajan kuormassa prosessin CPU-aika oli noin 14,7–15,2 % yhdestä
CPU-ytimestä. Renderin mittaus ilmoitti palvelimen rajaksi 0,15 CPU-ydintä ja
muistirajaksi noin 512 MiB. Prosessin RSS oli kuormassa enimmillään noin
117,8 MiB. Varmennusjonossa oli tavallisesti 2–3 keskeneräistä pyyntöä.
Tulokset viittaavat CPU-kiintiöön rajoittavana tekijänä, eivät muistin loppumiseen.

Väärä session omistajan tunniste, väärä simulaatiorevisio ja virheelliset
ohjaussyötteet hylättiin odotetuilla koodeilla 401, 409 ja 400 ennen ajon
aktivointia. Tämä ei ole kattava huijaukseneston auditointi.

## Aineisto ja asetukset

Raakaraportit ovat paikallisessa, Gitistä pois rajatussa hakemistossa
`artifacts/verification/`: `render-capacity-2.json`, `render-capacity-4.json` ja
`render-capacity-metrics.jsonl`. Mittausrajapinta on suojattu erillisellä
testisalaisuudella; salaisuutta ei sisällytetä raportteihin tai versionhallintaan.

Kahden ajajan vahvistusajossa prosessin RSS oli enimmillään noin 129,4 MiB.
CPU-kulutus oli keskimäärin 0,088 ydintä ja kahden sekunnin mittausväleillä
enimmillään noin 0,153 ydintä. Varmennuksen jonotusaika jäi alle millisekuntiin,
mutta fysiikan ja tallenteen käsittelyssä esiintyi noin sekunnin piikkejä.
Yksi onnistunut kahden pelaajan koe ei siten osoita vakaata kapasiteettia.

Yhden ajajan koe läpäisi molemmat kierrokset ilman HTTP-virheitä tai palautusyrityksiä.
Prosessin CPU-kulutus oli keskimäärin noin 0,040 ydintä ja mittausvälien maksimi
0,116 ydintä; RSS enimmillään noin 123,1 MiB. Myös tässä kokeessa esiintyi
viivepiikki: suurin saapumisviive oli noin 1 273 ms, alle 1 500 ms:n rajan.

Pelaajaraja laskettiin vahvistusajon jälkeen yhteen; aloitusraja on kahdeksan
minuutissa. Tämä on tämän mittauksen perusteella varovainen testiasetus, ei
pitkäaikaisen vakauden tai kaikilla verkkoyhteyksillä toimimisen takuu.
Kahden tai useamman samanaikaisen ajajan vakaata kapasiteettia ei osoitettu.
Kapasiteetin nostaminen edellyttää optimointia tai lisää CPU-kapasiteettia ja
uutta vastaavaa mittausta. Huijaukseneston viiverajojen löysentämistä ei tehty.

Lopulliset yhteenvedot: `render-capacity-2-confirmation.json`,
`render-capacity-1.json`, `render-capacity-summary.json` ja
`render-platform-metrics.json`. Prosessimittaus kerättiin noin 2,25 sekunnin välein.
CPU-luvut ovat peräkkäisten prosessin CPU-aikalaskurien erotuksia seinäkelloon
suhteutettuna. Renderin hitaammin päivittyviä alustamittareita käytettiin
kiintiöiden varmistamiseen; niitä ei tulkita yksittäisten piikkien mittauksiksi.

## Käyttäjän valitsema asetus mittausten jälkeen

Käyttäjän pyynnöstä testipalvelimen pelaajarajaksi asetettiin myöhemmin 2 ja
hyväksyttäväksi saapumisviiveeksi 2 000 ms. Tätä yhdistelmää ei kuormitustestattu
käyttäjän ohjeen mukaisesti. Yllä olevat mittaustulokset koskevat edelleen
1 500 ms:n rajaa. Hypoteesi on, että suurempi jousto auttaa yksittäisiin piikkeihin;
se ei lisää palvelimen CPU-kapasiteettia.

Integraatiohaaran commit `07b7280` lisää `VERIFICATION_LAP_LAG_MS`-asetuksen
(oletus 1 500 ms). Testipalvelimella käytetään `MAX_VERIFIED_SESSIONS=2` ja
`VERIFICATION_LAP_LAG_MS=2000`. Simulaatiorevisio pysyy samana. Tuotantoa ja
`main`-haaraa ei muutettu.

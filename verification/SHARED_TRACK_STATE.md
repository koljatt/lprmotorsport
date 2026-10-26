# Yhteinen ratadata ja ajokohtainen tila — vaihe 1

`verification/world.cjs` tarjoaa `createWorldFactory()`-rajapinnan usean saman
revision ajosimulaation alustamiseen samassa Node-säikeessä. Tehdas valmistellaan
kerran, ja sen `create()` luo uuden eristetyn ajon.

```js
const {createWorldFactory}=require('./world.cjs');
const track=createWorldFactory();
const first=track.create();
const second=track.create();
// first.world ja second.world etenevät eri ohjaussyötteillä.
```

## Jaetut ja ajokohtaiset tiedot

Jaettu, jäädytetty määrittely sisältää radan pisteet, tien mitat, auton geometrian,
maailman rajat, tapahtumapaikkojen sijainnit sekä esteiden lähtöominaisuudet.
Radan etäisyystaulukko ja lähimmän segmentin hakupuu valmistellaan kerran jäädytettyä
rataa kohti. Maaston/asfaltin kyselyfunktiot käyttävät samaa valmisteltua dokumenttia.
Staattinen törmäysruudukko säilyttää vain järjestysnumeroita: se ei palauta toisen
ajon esteitä, vaan järjestysnumerot sidotaan kulloisenkin ajon omiin törmäysrajoihin.
Jos staattinen geometria poikkeaa valmistellusta, indeksi rakennetaan erikseen uudelleen.

Jokaisella ajolla ovat edelleen omat auto ja ajodynamiikan parametrit, kierros- ja
sektoritila, henkilöt, esteiden kappaleet ja törmäysrajat, alku-/nollaustilat, vauriot,
liikkeet ja lommot. Myös paikallaan olevien puiden ja seinien muuttuva tila on
ajokohtainen. Kappaleiden käsittelyjärjestys ja kaikki fysiikan laskukaavat säilyvät.
Uusintatallennin sekä verkkosession omistus ja ajoitus pysyvät erillisinä kuten ennen.

Selainpelin nykyinen alustaminen toimii ennallaan. Uusi tehdas on palvelinpuolen
ajovarmennusta varten eikä sisällä näkymän rakentavaa `campus.build`-rajapintaa.

## Käyttöönoton raja

**Tämä vaihe ei muuta tuotannon säiemallia tai pelaajarajaa.** Nykyinen
`createWorld()` käyttää edelleen erillistä maailmaa: yksi ajosessio yhdessä säikeessä.
Yhden session tapauksessa valmisteltu tehdas ja sen ensimmäinen klooni käyttäisivät
lisämuistia ilman jakamisen hyötyä. Uusi rajapinta otetaan käyttöön myöhemmässä
rajatun säiejoukon toteutuksessa, jossa sama tehdas palvelee useita ajosessioita.

Tehdas kuuluu sitä käyttävälle säikeelle. Se ei käytä `SharedArrayBuffer`-muistia
säikeiden välillä eikä mahdollista yhtäaikaisia kirjoituksia yhteiseen ajotilaan.
Koko ajosimulaatio säilytetään samalla säikeellä; tätä vaihetta seuraavan työn on
huolehdittava syöte-erien reitityksestä, vuorottelusta, määräajoista ja siivouksesta.

## Tarkistukset

```sh
npm run test:shared-track-state
npm run measure:shared-track-state
```

Testi vertaa kahta kokonaista kierrosta erilliseen maailmaan: auton kaikki tilat,
kierrosrajat, uusinnat ja säännölliset koko estemaailman vertailut. Se varmistaa
ajojen eristyksen myös vaurioissa, esteiden siirtämisessä, ihmisten liikkeessä,
nollauksissa, uuden ajon luomisessa sekä eri ohjauksilla vuorottelevissa ajoissa.
Jaetun törmäysindeksin tulokset ja järjestys verrataan alkuperäiseen indeksiin.
Lisäksi ajetaan aiemmat fysiikka-, determinismi-, varmennus-, välimuisti-, kapasiteetti-,
rataeditori- ja staging-tarkistukset. Chromiumin aiemmin tallennetut fysiikkatiivisteet säilyvät.

## Paikallinen muistimittaus 26.10.2026

[shared-track-state-measurement.json](shared-track-state-measurement.json) sisältää
raakadatan. Molemmat vaihtoehdot ajettiin tuoreissa Node-prosesseissa ja säilytetty
JavaScript-keko mitattiin eksplisiittisen roskankeruun jälkeen. Luvut ovat maailmojen
luonnin aiheuttama keon kasvu; ne eivät sisällä koko Node-prosessin tai säikeiden RSS:ää.

| Simulaatioita samassa säikeessä | Erilliset maailmat, MiB | Yhteinen tehdas, MiB | Keon säästö |
| --- | ---: | ---: | ---: |
| 1 | 3,43 | 6,56 | −91 % |
| 2 | 6,56 | 7,99 | −22 % |
| 4 | 12,74 | 10,85 | 15 % |
| 8 | 25,01 | 16,49 | 34 % |
| 16 | 49,53 | 27,76 | 44 % |

16 maailman alustaminen kesti paikallisesti noin 1 039 ms erillisinä ja 193 ms
valmistellulla tehtaalla. Kyseessä on yksi paikallinen mittaussarja. Molempien
vaihtoehtojen alkutilojen ja kappaleiden tarkistustiivisteet vastasivat toisiaan.
Tulos ei tarkoita 44 % pienempää koko palvelimen muistinkäyttöä eikä osoita
Renderin pelaajakapasiteettia. Säikeiden määrän vähentäminen täytyy mitata erikseen.

Jaettujen fysiikkatiedostojen muutos vaihtaa simulaatiorevision. Mahdollisessa
julkaisussa palvelin, Worker-bundle ja peli on päivitettävä samaan revisioon.
Tässä työssä ei julkaista tuotantoon eikä siirretä vanhoja tuloksia uuteen revisioon.

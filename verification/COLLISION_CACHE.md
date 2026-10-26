# Auton törmäysmuodon välimuisti

Muutos koskee `campus.js`-tiedoston `carCollisionParts(state)`-funktiota.
Fysiikan taajuus, laskukaavat ja osien/pisteiden järjestys säilyvät.

- Renkaan muuttumaton kupera profiili valmistellaan kerran geometriaversiota kohden.
- Auton kori ja takarenkaat säilyvät välimuistissa ohjauksen muuttuessa.
- Eturenkaat rakennetaan uudelleen vain niiden paikallisen muodon muuttuessa.
- Sama auto ja samat muotoon vaikuttavat arvot palauttavat saman valmiin osaluettelon.
- Vaurion, törmäyspuolen, ohjauskulman tai käytettyjen geometriamittausten muutos
  päivittää muodon myös saman fysiikka-askeleen sisällä.
- Myös rengasprofiilin arvojen muuttaminen paikallaan havaitaan. Pelkkä sijainnin,
  ajosuunnan tai nopeuden muutos ei muuta auton paikallista törmäysmuotoa.

Autokohtainen tallennus käyttää `WeakMap`-rakennetta, joten välimuisti ei yksin pidä
hylättyä autoa muistissa. Eri autot eivät jaa muuttuvaa välimuistitilaansa.
Palautettu osaluettelo, sen monikulmiot ja pisteet ovat jäädytettyjä ja vain luettavia.
Jos uusi kutsuja tarvitsee muokattavan muodon, sen täytyy tehdä oma kopio.
Nykyiset tuotantokutsujat vain lukevat paikallista geometriaa.

## Tarkistaminen

```sh
npm run test:collision-cache
npm run measure:collision-cache
```

Testi vertaa aiempaan toteutukseen (`tests/collision-shape-reference.cjs`,
integraatiohaaran commit `d4db5c7`). Se tarkistaa välimuistin uudelleenkäytön,
muodon päivittymisen, autojen eristyksen, 4 000 eri muotoa, kahden kierroksen kaikki
autotilat ja uusinnat sekä törmäysten jälkeiset tilat. Aiemmat Chromiumissa tallennetut
fysiikkatiivisteet tarkistetaan lisäksi komennolla `npm run test:determinism`.

Mittaus ajaa kolme vuorottelevaa vertailuparia erillisissä Node-prosesseissa.
Jokaisessa on 1 200 lämmittelyaskelta ja sen jälkeen samat 24 000 ohjaussyötettä,
täysi simulaatio, uusintatallennus ja tilatiiviste. Ennen/jälkeen-variantit eroavat
vain törmäysmuodon toteutuksessa. CPU-aika mitataan koko simulaatiosta tallennuksineen.
Muistiraportti sisältää myös testiajurin, syötteet ja JavaScript-ajoympäristön.
Tulokset eivät ole lupaus Renderin kapasiteetista tai selaimen ruudunpäivityksestä.

Raakaraportti kirjoitetaan tiedostoon
`artifacts/verification/collision-cache-benchmark.json`. Tarkistettu mittaustulos
säilytetään tiedostossa [collision-cache-measurement.json](collision-cache-measurement.json).

## Paikallinen tulos 26.10.2026

Kolmen vertailuparin CPU-aika pieneni keskimäärin **8,7 %** ja kulunut aika
**7,4 %** aiempaan, jo radan hakurakenteen sisältävään toteutukseen verrattuna.
Kaikissa pareissa kahden kierroksen tila-/uusintatiivisteet olivat samat.
Roskan keruun jälkeinen käytetty JavaScript-keko oli molemmissa noin 14 MiB;
muistista ei voi päätellä merkittävää säästöä. Prosessien RSS-huiput vaihtelivat
noin 150–156 MiB:n välillä, mukaan lukien testiajuri ja syötteet.
Tämä on laskentakuorman optimointi; säikeiden ja simulaatiomaailmojen suurempi
muistiuudistus jää erilliseksi työksi. Mittaus ei osoita tuotannon pelaajakapasiteettia.

Välimuisti vähentää toistuvaa laskentaa ja väliaikaisia allokaatioita, mutta säilyttää
pienen määrän valmista geometriaa muistissa. Tämä ei toteuta ajosäikeiden tai
simulaatiomaailmojen muistiuudistusta eikä nosta pelaajarajaa.

Jaetun `campus.js`-tiedoston muutos vaihtaa nykyisen simulaatiorevision. Käyttöönotossa
on päivitettävä palvelin, Worker-bundle ja peli samaan revisioon normaalin
julkaisuohjeen mukaan. Vanhojen revisioiden tuloksia ei siirretä automaattisesti.

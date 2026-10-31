# Tulevat päivitykset ja päivitysideoita

Tämä tiedosto kokoaa tulevaisuuden kehityskohteet, joilla parannetaan pelin laatua, pelaajakokemusta ja seuraamisen sekä kilpailutilanteiden luotettavuutta.

## Prioriteetti 1: Release note -popup kerran per pelaaja

### Tarkoitus
- Näyttää peliin uusiin päivityksiin liittyvä popup, kun pelaaja avaa pelin.
- Pop-up tulee näkyviin vain kerran per pelaaja / per uusi versionumero.
- Ei näy joka kerta uudelleen, kun peli käynnistetään.

### Toimintamalli
- Lue nykyinen peliversio tai päivitystunniste.
- Vertaa sitä tallennettuun arvoon pelaajan laitteella.
- Jos arvo on uusi, näytä popup.
- Tallenna uusi versionumero, jotta sama popup ei näy toistamiseen.

### Hyväksymiskriteerit
- Popup avautuu vain, jos peliversio on muuttunut.
- Sama versio ei näytä pop-upia uudestaan.
- Pelaajalla on mahdollisuus sulkea popup ilman, että peli jää jumiin.
- Pop-up voidaan myöhemmin laajentaa linkiksi changelogiin tai release notesiin.

## Prioriteetti 2: Spectator-näkymän parannus

### Tarkoitus
- Spectator-näkymän tulee jatkaa pelaajan seuraamista, vaikka tämä
  - ajaa seinään,
  - joutuu törmäyksen jälkeen epätavalliseen asentoon,
  - aloittaa uuden kierroksen,
  - tai saattaa hetkellisesti menettää ajouran.

### Käyttäytyminen
- Jos aktiivinen ajaja häviää näkyvistä tai menee epätyypilliseen tilaan,
  pilotti ei saa pudota katselusta.
- Spectator voi jatkaa ilman manuaalista uudelleenvalintaa.
- Järjestelmä valitsee seuraavaksi aktiivisen ajajan tai viimeisen validin
  ajotilan jatkaen seurantaa mahdollisimman sulavasti.
- Seuranta erotetaan mahdollisimman pitkälle "näkyvä ajaja" -logiikasta,
  jotta yhdellä viallisella hetkellä ei menetetä koko spectator-kokemusta.

### Toteutusehdotus
- Säilytä voimassa oleva seurausobjekti, vaikka nykyinen ajotila menisi
  virheelliseen tai nollautuneeseen tilaan.
- Jos ajotapahtuma katkeaa, siirry automaattisesti viimeiseen aktiiviseen
  pelaajaan tai seuraavaan validiin kierrokseen.
- Päivitä spectator-näkymä niin, että uusi kierros ei katkaise seurantaa
  automaattisesti.

### Hyväksymiskriteerit
- Spectator ei jää "tyhjän näkymän" tilaan vain yhden törmäyksen tai uudelleenaloituksen takia.
- Ajajan seuraaminen jatkuu automaattisesti käyttäjän toimesta.
- Vaihtoehtoinen seuraaja voidaan valita, jos ensimmäinen menettää validin tilan.

## Prioriteetti 3: Maalitolpan läpi ajamisen esto

### Tarkoitus
- Estää pelaajan ajamasta maali tolpan läpi virheellisesti tai ilman validia
  maaliviivan ylitystä.
- Varmistaa, että kierros ja tulos rekisteröityvät vain oikeassa tilanteessa.

### Suunniteltu logiikka
- Tarkista maalitolpan triggerit ennen kuin hyväksytään kierroksen loppu.
- Jos auto ylittää maalilinjan väärästä suunnasta tai väärässä asennossa,
  hylätään tapahtuma tai estetään sen rekisteröinti.
- Jos pelaaja ajaa läpi tallennus- tai maalitilan, varmistetaan, että
  järjestelmä palauttaa pelaajan turvalliseen tila-alueeseen tai estää
  virheellisen maalitapahtuman.

### Hyväksymiskriteerit
- Törmäys/triggerin yliajaminen ei tuota virheellistä kierroksen päättymistä.
- Validi maaliin ajo rekisteröityy edelleen oikein.
- Virheelliset ylitykset eivät rikkoudu koko kierrosta.

## Prioriteetti 4: Seuraavat sisällölliset päivitykset

### Pelattavuus
- Lisää suurempi valikoima kilpailutilanteita ja haasteita käytännön
  harjoitteluun.
- Paranna ajon tasapainoa ja ajokäyttäytymistä eri autoilla.
- Kehitä ajotuntuma ja renkaiden pito vastaamaan paremmin eroavaisuuksia.

### Näkyvyys ja UI
- Paranna live-statistiikkaa spectator-näkymässä.
- Näytä selkeämmin kierrosnumero, kierrosaika, nykyinen kierros ja viimeisimmät
  välitiedot.
- Lisää selkeästi eristetyt ilmoitukset virheellisistä tilanteista tai
  alustustilasta.

### Moninpeli ja yhteisö
- Tuki live spectator -tilanteille useammalle ajajalle.
- Parempi järjestelmä, jolla katselijat voivat vaihtaa ajajaa ilman häiriötä.
- Yhteisöllisempi kilpailu- ja tuloslista-ympäristö.

## Yhteenveto

Tämän roadmapin tavoitteena on yhdistää kolme keskeistä kehityskohdetta:
1. Release note -popup, joka tulee vain kerran per pelaaja.
2. Spectator-näkymän jatkuva seuraaminen, vaikka ajaja törmää tai aloittaa uuden kierroksen.
3. Maalitolpan läpi ajamisen esto, jotta kierroksen ja pistetilanteen tiedot pysyvät luotettavina.

Nämä parannukset tekevät pelistä vakauttavamman, pelaajakokemukseltaan
selkeämmän ja katselutilanteista sujuvammat.

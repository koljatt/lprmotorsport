# Rajattu varmennuksen säiejoukko — vaihe 2

Tämän haaran `Sessions` käyttää `VerificationPool`-toteutusta. Kukin ajosessio
varataan yhdelle säikeelle koko ajon ajaksi. Sama säie käsittelee useita toisistaan
eristettyjä maailmoja yhteisen `createWorldFactory()`-ratadatan avulla.
Mainia, tuotantopalvelua tai tuotannon pelaajarajaa ei muuteta tämän työn aikana.

## Suoritus ja rajat

- Säikeet luodaan tarvittaessa ja säilytetään seuraavia ajoja varten. Oletus on yksi
  laskentasäie; uusia säikeitä syntyy enintään asetettu määrä.
- Uusi sessio osoitetaan säikeelle, jolla on vähiten varattuja sessioita. Ajon tilaa
  ei siirretä säikeiden välillä eikä suoritettua historiaa lasketa uudestaan.
- Jokaiselta ajolta on kerrallaan enintään yksi käsiteltävä syöte-erä. Muuttumaton
  uusintapyyntö käyttää samaa lupausta/kuittausta, eikä lisää laskentaa.
- Säikeen FIFO-jono käsittelee enintään 120 fysiikka-askelta yhdessä tehtävässä ja
  antaa tapahtumasilmukalle vuoron tehtävien välissä. Normaalit erät ovat 60 askelta.
- Valmiin kierroksen pakkaus odottaa asynkronista gzip-työtä. Muiden pelaajien
  fysiikka voi jatkua tämän aikana. Sama pelaaja odottaa valmista tallennetta ja
  kuittausta ennen seuraavaa erää; tulosta ei allekirjoiteta ilman valmistunutta
  tallennuskäsittelyä. TOP 10:n uusintavaatimus säilyy aiemmassa tuloslistassa.
- Omistus, protokolla/revisio, syötejärjestys, aloitusten rajat ja kapasiteettiraja
  tarkistetaan edelleen pääsäikeessä. 120 Hz ja ajon kaikki ajoitussäännöt säilyvät.
- Syötepyynnön 10 sekunnin aikabudjetti sisältää jonotuksen ja vastauksen odotuksen.
  Sessioiden alustus saa enintään 20 sekuntia; siivouskuittaus viisi sekuntia.
  Vastaamaton säie lopetetaan, jotta sen tilat eivät jää kasvattamaan muistia.

## Peruutukset ja kaatumiset

Peruutus hylkää pääsäikeen odottavan pyynnön ja pyytää säiettä poistamaan ajon.
Säie poistaa myös jonossa olevat tehtävät, ajomaailman ja tallentimen viittaukset.
Uuden ajon alustus odottaa keskeneräisten poistojen kuittaukset, jotta vapautettuja
paikkoja ei täytetä ennen todellista siivousta. Vanhentuneet sessiot käyttävät samaa
siivousta. Palvelimen sulkeminen lopettaa koko joukon ja sen odottavat pyynnöt.

Yhden säikeen kaatuminen mitätöi **kaikki sille osoitetut keskeneräiset ajot**.
Muiden säikeiden ajot jatkuvat. Menetettyä ajoa ei siirretä toiseen säikeeseen eikä
jatketa asiakkaan tarjoamasta tilasta. Uusi sessio voi luoda korvaavan säikeen
määritellyn ylärajan sisällä. Tämä jaettu vikatilanne on uuden mallin olennainen
ominaisuus; se pitää huomioida lopullisessa tuotannon kuormakokeessa.

## Asetukset ja mittarit

| Palvelimen ympäristömuuttuja | Oletus | Raja / merkitys |
| --- | --- | --- |
| `VERIFICATION_WORKERS` | `1` | Säikeitä enintään 1–16 |
| `VERIFICATION_WORKER_HEAP_MB` | `256` | Kunkin säikeen V8 old-generation -raja 64–2048 MiB |
| `MAX_VERIFIED_SESSIONS` | `2` | Samanaikaisten ajosessioiden aiempi kokonaisraja |
| `MAX_VERIFIED_STARTS_PER_MINUTE` | `8` | Aiempi aloitusten minuuttiraja |

Heap-raja ei ole prosessin kokonaismuistiraja eikä koko muistin ennakkovaraus.
Useampi säie monistaa V8-ympäristön ja ratatehtaan; määrää ei pidä kasvattaa
pelkän pelaajamäärän perusteella. Kokonaismuisti, käytettävissä oleva CPU ja
varmennusviive mitataan kohdepalvelimella ennen pelaajarajan nostamista.

Suojattu `/metrics` sisältää nyt `pool`-koosteen: säikeiden yläraja, luodut ja
valmiit säikeet, varatut maailmat, odottavat pyynnöt ja siivoutuvat sessiot.
`queueMs` mittaa odotusta säikeen vastaanottamasta viestistä fysiikkatehtävän alkuun.
Se ei sisällä pääsäikeen postituksen/IPC:n viivettä; `batchResponseMs` kattaa
pyynnön koko käsittelyajan. `replayMs` sisältää tallennuksen ja gzip-odotuksen
seinäkelloaikaa. Asiakkaan saapumisviiveen tulkintaa ei muuteta tässä työssä.

## Tarkistukset ja mittaus

```sh
npm run test:worker-pool
npm run measure:worker-pool -- 5 2,4,8,16 both
npm run measure:worker-pool -- 120 16 pooled
```

Unit/integration-testi tarkistaa neljän eri tavalla ajavan asiakkaan kaksi kierrosta,
tarkat fysiikkatilat erillisiin vertailumaailmoihin nähden, oikean session kuitit,
uusintatallenteet, samanaikaiset uusintapyynnöt, peruutukset, TTL:n, säikeiden
uudelleenkäytön, käynnistyksen peruutuksen ja kaatumisen vaikutusalueen.
Aiemmat HTTP-varmennus-, ajoituspolitiikka-, kapasiteetti-, jaetun tilan, chat- ja
staging-testit suoritetaan lisäksi.

Mittaus luo kullekin vaihtoehdolle tuoreen Node-prosessin. Dedicated-vertailu käyttää
aiempaa `session-worker.cjs`-toteutusta, yhtä säiettä pelaajaa kohden, testiapurin
kautta. Tuotannon ajonvarmennuksessa ei käytetä tätä testiapuria. Molemmat mallit
käyttävät samoja syötteitä, normaalia monotonista kelloa, IPC:tä ja tallenninta.
Mittaus varmistaa, että kaikki ajot säilyvät kelpoisina, odotetut kierrokset kuitataan
ja yhteisen mallin maailmat poistuvat lopuksi. Selainta, HTTP-välitystä tai Renderin
laitteistoa ei ole mukana; mittaus ei osoita tuotannon pelaajakapasiteettia.

Raakatulokset: [worker-pool-measurement.json](worker-pool-measurement.json).

## Paikalliset tulokset 26.10.2026

Tuoreissa prosesseissa tehdyn viiden sekunnin vertailun muistihuippu ja
syöte-erän vastauksen p95:

| Pelaajia | Vanha malli, RSS MiB | Yksi yhteinen säie, RSS MiB | Vanha / uusi p95, ms |
| --- | ---: | ---: | ---: |
| 2 | 127,3 | 124,8 | 23,5 / 24,8 |
| 4 | 198,8 | 144,2 | 33,5 / 35,6 |
| 8 | 365,4 | 167,6 | 56,0 / 73,0 |
| 16 | 678,0 | 237,9 | 81,3 / 112,3 |

16 pelaajan lyhyessä kokeessa RSS pieneni noin 65 %. Jaettu suoritus kasvatti jonotus-
ja vastausviivettä, mutta kaikki ajot säilyivät kelpoisina. Viiden sekunnin testi
sisältää JIT-lämmittelyä eikä vielä kierroksen valmistumista; sen muistilukuja ei
pidä tulkita pitkän ajon huipuiksi.

Erillisessä **120 sekunnin** kokeessa 16 pelaajaa yhdellä säikeellä laski yhteensä
230 400 fysiikka-askelta ja tuotti 16 varmennettua kierrosta uusintoineen.
Yksikään ajo ei menettänyt kelpoisuutta. Vastauksen p95 oli 192,8 ms, suurin säikeen
jonotusviive 400,2 ms ja suurin kuittausviive 549,6 ms. RSS-huippu oli **463,4 MiB**.
CPU-aikaa kului noin 46,8 sekuntia 120 sekunnin ajanjaksolla; testikoneen
laskentateho ei vastaa automaattisesti nykyistä Render Free -instanssia.
Siivouksen jälkeen workerin ajomaailmojen ja jonotettujen tehtävien määrät olivat nolla.

Pitkälle kokeelle ei ajettu saman ajon dedicated-vertailua, joten lyhyen kokeen
65 %:n säästöä ei luvata pitkälle ajolle. 463 MiB on lähellä 512 MiB:n palvelimen
kokonaisrajaa eikä jätä riittävää perustetta 16 pelaajan tuotantorajalle. Nykyinen
kahden ajon raja säilyy. Ennen julkaisua tarvitaan kohdepalvelimen ja oikeiden
selainasiakkaiden koe sekä muistivara pidempiin ajoihin ja yhteysheilahteluihin.

## Käyttöönotto

Tämä vaihe ottaa vaiheen 1 yhteisen tehdasrajapinnan käyttöön ajovarmennuksessa.
`createWorld()` säilyy erillisen maailman apurajapintana työkaluille ja vertailuille.
Poolin oma worker käyttää `createWorldFactory()`-rajapintaa suoraan. Selainpeliin
ja verkkoprotokollaan ei tarvita muutosta. Pelin, Workerin ja varmennuspalvelimen on
edelleen käytettävä samaa simulaatiorevisiota; taustalla oleva jaetun ratadatan muutos
on julkaistava tämän normaalin säännön mukaan. Oletuspelaajarajaa ei nosteta.

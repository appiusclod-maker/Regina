# REGINA Calcio 1.1.23 — Priorità delle tappe nei Grandi traguardi

## Novità

All'interno di ciascun grande traguardo le tappe sono mostrate in quest'ordine:

1. **📌 In cima**: tappe ancora non completate fissate manualmente (l'ultima fissata va per prima).
2. **Da fare con data programmata O scadenza**: salgono automaticamente sopra quelle senza data.
3. **Da fare senza data né scadenza**.
4. **Completate**: restano in fondo, anche se erano state fissate.

Fra le tappe di uno stesso gruppo resta l'ordine manuale esistente. Le frecce **↑/↓**
spostano le tappe soltanto nel proprio gruppo, senza annullare il criterio automatico.
Il nuovo pulsante **📌 In cima** è accanto a ogni tappa ancora da fare: premi per fissarla
sopra le altre tappe incompiute, premi **📌 Fissata** per togliere la priorità.
Si possono fissare più tappe. Le priorità restano memorizzate nella carriera.
Se una tappa viene completata, finisce automaticamente nel gruppo delle completate.

L'ordinamento funziona anche quando assegni/rimuovi una data o cambi una scadenza
flessibile; le tappe sono sempre sincronizzate con Obiettivi/Oggi come prima.
Non è cambiato il comportamento di partite, punteggi, scadenze o esportazione per Hninn.

## Installazione su GitHub (telefono)

Cartella: https://github.com/appiusclod-maker/Regina/tree/main/calcio

1. Prima dell'aggiornamento esporta un backup completo dall'app e conservalo sul telefono.
2. Sostituisci **solo** `calcio/regina-traguardi.js` e `calcio/service-worker.js` con gli omonimi dello ZIP.
3. Apri `calcio/index.html`, trova la riga `regina-traguardi.js` verso il fondo
   e cambia solo il parametro `?v=...` in `?v=1123` (vedi PATCH_INDEX.txt).
4. Premi **Commit changes**. Apri REGINA nel browser **online** e aggiorna la pagina;
   nella PWA installata potrebbe essere necessario chiudere e riaprire l'app.

**Non** cancellare cache, dati del sito, obiettivi o l'app. Non caricare il file `index.html`
di una versione vecchia, non modificare `regina-upgrade.js` e **mantieni** il modulo
`regina-hninn-export.js` della 1.1.22.

## Compatibilità e test

Aggiornamento cumulativo del modulo traguardi 1.1.20 (include le versioni 1.1.18–1.1.20).
Aggiunge solo `rltPinRank` alle tappe fissate, senza migrazioni invasive.
Le tappe normali e i dati già salvati non sono cancellati.

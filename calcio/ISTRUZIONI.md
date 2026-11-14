# REGINA CALCIO 1.1.19 — Scadenze flessibili

Pacchetto **cumulativo**: incorpora la 1.1.18 (grandi obiettivi a colori, tappe sì/no, collegamento Obiettivi/Oggi) e aggiunge le nuove opzioni temporali. Non è necessario installare prima la 1.1.18.

## Pubblicazione

Il repository di riferimento è `appiusclod-maker/Regina`, cartella `calcio`.

1. **Prima di aggiornare, esporta il backup completo** della carriera dalla sezione Impostazioni e conservalo. Non cancellare la memoria del browser o i dati del sito.
2. Sostituisci `calcio/regina-traguardi.js` con il file omonimo di questo pacchetto.
3. Sostituisci `calcio/service-worker.js` con il file omonimo.
4. In `calcio/index.html` cambia **solo** la riga `<script src="./regina-traguardi.js?v=1117"></script>` o `?v=1118` (se già aggiornata) in `<script src="./regina-traguardi.js?v=1119"></script>`.
5. Committa e aggiorna REGINA Calcio dal browser, senza cancellare dati. Se la PWA è già installata, riaprila online per far aggiornare il modulo.

**Non sostituire `index.html` con una pagina vecchia o vuota.**

## Scadenze disponibili, facoltative

- Nessuna scadenza
- Entro una data precisa
- Entro questa settimana (domenica della settimana in corso)
- Entro la prossima settimana (domenica successiva)
- Entro questo mese (ultimo giorno del mese in corso)
- Entro il mese di… (seleziona mese e anno; ultimo giorno del mese)
- Entro un anno (stesso giorno dell'anno seguente; 29 febbraio → 28 febbraio)

Le opzioni sono disponibili per **grandi obiettivi, tappe dei grandi obiettivi, fronti normali e tappe normali**. Ogni scelta relativa viene trasformata in una data concreta al momento dell'inserimento, **non scorre in avanti** automaticamente. Aprendo una scadenza si vede anche la data concreta calcolata. Un termine esistente è mantenuto come «Entro una data precisa» durante la migrazione.

### Data programmata ≠ scadenza

- **Data programmata**: indica il giorno nel quale intendi svolgere la tappa e nel quale il suo completamento pesa sulla partita.
- **Scadenza («entro…»)**: termine massimo. Se una tappa di un grande obiettivo non ha una data programmata, ma ha una scadenza, viene collegata agli Obiettivi come attività reale e compare nella giornata di **Oggi** corrispondente al giorno di scadenza, influenzando la partita *quel giorno*, non tutti i giorni precedenti.
- Se una tappa ha sia data programmata sia scadenza, la partita dipende **dalla data programmata**, mentre la scadenza resta visibile come limite massimo: non si calcola due volte lo stesso compito.
- Un grande obiettivo da solo non produce punteggi: a influenzare la partita sono le sue tappe pianificate/scadute.
- Le tappe senza data programmata né scadenza rimangono solamente nella panoramica del grande obiettivo.

### Salvataggi

Le scadenze e il tipo scelto sono conservati negli archivi già in uso (`reginaLongTerm` nella carriera e `regina-calcio-goals-v1` per le attività). I file della città REGINA originale non vengono modificati. La barra generale è il numero di tappe completate diviso per il totale e ogni tappa ha solo la spunta sì/no.

## Verifiche effettuate

- `node --check` del file JavaScript e del service worker.
- Test browser sintetico con Chromium: nuovo grande obiettivo, date di fine settimana, tappa collegata solo con scadenza, completamento/annullamento, data programmata separata, mese specifico, anno successivo e scadenze nei moduli normali.
- **Non** eseguita una prova completa con la carriera effettiva pubblicata su GitHub. Per l'installazione occorre pubblicare i file. GitHub non ha consentito la scrittura attraverso il connettore (403).

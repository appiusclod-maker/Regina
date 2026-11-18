# REGINA Calcio 1.1.24 — Recupero delle ricorrenze

## Correzione

Le tappe da svolgere **una volta a settimana**, **ogni due settimane** o **una volta al mese**
(e le ricorrenze settimanali con un solo giorno personalizzato) che rimangono incomplete
passano automaticamente al giorno successivo e continuano a scorrere di giorno in giorno
fino al completamento.

Esempio: una tappa settimanale prevista lunedì e non fatta rimane visibile martedì,
mercoledì eccetera. Quando viene completata, la prossima ricorrenza mantiene il
calendario originario (lunedì della settimana seguente), non riparte da +7 giorni
rispetto al completamento.

Se un'attività rimane indietro oltre il successivo appuntamento settimanale/mensile,
REGINA mantiene una sola attività in recupero: non accumula duplicati per ogni periodo.
Una volta completata, se nello stesso periodo è già maturata una nuova scadenza,
il completamento tardivo soddisfa anche quella settimana/mese e si riparte dal ciclo seguente.

Sono preservati progressi parziali, orari, categorie, colori, grandi traguardi,
lista della spesa e collegamento a Hninn. Non sono toccati gli impegni
**ogni giorno**, quelli **lun-ven** o senza ricorrenza.

La casella presente in Modifica tappa **«Non riportare in avanti tappe non riuscite»**
continua ad avere priorità: se spuntata, la tappa NON viene recuperata automaticamente.

## Installazione su GitHub (da telefono)

Cartella: https://github.com/appiusclod-maker/Regina/tree/main/calcio

1. Esporta un **backup completo** da REGINA e conservalo sul telefono.
2. Carica `regina-ricorrenze.js` nella cartella `calcio` del repository.
3. Sostituisci `service-worker.js` nella medesima cartella con quello di questo ZIP.
4. Apri `calcio/index.html`, vai **alla fine**, poco prima di `</body>`,
   e aggiungi questa riga (DOPO tutti gli altri `<script src=...>`):

   `<script src="./regina-ricorrenze.js?v=1124"></script>`

5. Salva con **Commit changes**. Riapri REGINA online (nel browser se la PWA
   continua a usare una vecchia copia).

**Non** sostituire `index.html` con un file vecchio, non modificare gli altri
JavaScript e non cancellare la cache / i dati del sito: i salvataggi sono locali.

## Verifiche effettuate

- Sintassi JavaScript di entrambi i moduli verificata con Node.js.
- 14 scenari automatici, fra cui settimanale, mensile al giorno 31,
  ogni due settimane, attività già completate, esclusioni (`skipDates`),
  `noCarry`, progressi parziali, mantenimento dell'orario e nessun doppione.
- Le prove riguardano la logica del modulo in ambiente simulato;
  non equivalgono a un collaudo completo della PWA installata su telefono.

## Compatibilità

Aggiornamento **aggiuntivo** per REGINA Calcio 1.1.23.
Non modifica `regina-traguardi.js`, `regina-hninn-export.js`, `regina-upgrade.js`.

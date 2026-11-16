# REGINA Calcio 1.1.20 — Colori tematici per tutti gli obiettivi

Questa versione è **cumulativa**: contiene anche gli aggiornamenti della 1.1.18 e 1.1.19 (traguardi a tappe sì/no, date programmate, sincronizzazione con Obiettivi e Oggi e scadenze flessibili). Non occorre installare prima quelle versioni.

## Novità

Ogni **fronte/obiettivo normale** e ogni sua **tappa** assume un colore; lo stesso colore è usato anche nella sezione Traguardi. Il nuovo colore **rosa** riguarda Contatti e relazioni. L'ordine è fisso:

1. **Verde** — Sport e salute.
2. **Rosso** — Lavoro.
3. **Nero** — Burocrazia, soldi, tasse e servizi.
4. **Giallo/arancio** — Studio.
5. **Blu** — Casa.
6. **Viola** — Altro.
7. **Rosa** — Contatti.

L'ordinamento si applica ai **grandi obiettivi**, all'elenco dei **fronti normali**, alle **tappe degli Obiettivi** (dentro ciascuna data), ai gruppi in **Oggi**, al **calendario settimanale** (all'interno di ciascun giorno e fascia oraria), alle attività in **Da pianificare/ripianificare** e al **filtro dei fronti**. La sequenza cronologica dei giorni e la separazione per fasce orarie **non vengono cambiate**.

### Scelta e riconoscimento del colore

- Nei moduli **Nuovo fronte** / **Modifica fronte** c'è un selettore per la categoria cromatica. È **indipendente** dalla categoria calcistica e dai parametri che il fronte influenza: cambiare il colore non cambia tecnica, forma, tattica, ecc.
- Nei moduli **Nuova tappa** / **Modifica tappa** c'è un selettore facoltativo. Di norma la tappa **eredita** il colore del fronte, ma può ricevere un colore differente.
- I fronti esistenti conservano i propri dati: l'app individua il colore usando la categoria già salvata, e per `creative` distingue in via indicativa Studio da Altro grazie al titolo. **Puoi correggere qualsiasi assegnazione** da *Modifica fronte*.
- Le tappe dei **grandi obiettivi** continuano a condividere i completamenti con Obiettivi e Oggi. Il colore di un grande obiettivo viene ereditato dal fronte collegato; se modifichi quella categoria, il fronte segue il traguardo.
- Le categorie **Contatti** nei grandi obiettivi e **Relazioni e contatti** nei fronti normali sono rosa. L'assegnazione cromatica non tocca l'effetto delle attività sulla squadra.
- Gli obiettivi che ricadono nella **stessa categoria** mantengono il loro ordine precedente, salvo i grandi obiettivi completati che restano dopo quelli in corso nella stessa categoria.

## Installazione su GitHub

Repository: `appiusclod-maker/Regina`, cartella `calcio`.

1. Nell'app vai in **Impostazioni → Esporta backup completo** e conserva il file fuori da GitHub. Non svuotare la memoria del browser o i dati dell'app.
2. Carica/sostituisci **`calcio/regina-traguardi.js`** con il file omonimo contenuto nello ZIP.
3. Carica/sostituisci **`calcio/service-worker.js`** con il file omonimo contenuto nello ZIP.
4. In **`calcio/index.html`** modifica **soltanto** il parametro della riga dello script Traguardi: da `?v=1119` (o una versione precedente) a **`?v=1120`**. Vedi `PATCH_INDEX.txt`.
5. Salva le modifiche e riapri online REGINA Calcio, aggiornando la pagina per installare il nuovo service worker. Nella PWA può servire chiudere e riaprire dopo il primo aggiornamento.

**Non** sostituire l'intero `index.html` con un file vecchio, e **non** sostituire `regina-upgrade.js`. La precedente REGINA Città non viene modificata.

## Salvataggi, partite e limiti delle verifiche

Il colore scelto viene registrato nel campo `reginaTheme` dei fronti/tappe **dell'archivio obiettivi calcio** (`regina-calcio-goals-v1`). I colori dei traguardi sono in `reginaLongTerm`, già incluso nel salvataggio della carriera. Il colore **non influisce** di per sé su risultato o pagelle: i normali effetti calcistici restano invariati.

Sono stati eseguiti `node --check` per entrambi gli script e test browser **simulati** in Chromium sulle sette categorie, sull'ordine delle liste Obiettivi/Oggi/Calendario, sui filtri, sui cambi colore dei fronti e delle tappe, e sulla sincronizzazione di un traguardo Contatti con una tappa datata e completata. Non è stato possibile provare il salvataggio reale dell'utente né pubblicare direttamente su GitHub: il collegamento ha risposto **403** alle richieste di scrittura. Conserva un backup prima di sostituire i file.

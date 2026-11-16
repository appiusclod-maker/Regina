# REGINA Calcio ↔ Farm & Table — trasferimento 1.1.21

## Che cosa fa

Crea una **copia selezionabile** di:

- Grandi obiettivi con tappe, stato, categoria cromatica e scadenze.
- Fronti/obiettivi ordinari e tappe, comprese date, note, completamento, difficoltà, colori e scadenze.
- Lista della spesa (compresa la priorità **Indispensabile subito / Ideale / Meno importante** e le spunte).

Il file JSON di scambio **non comprende** conti, saldi, dati finanziari, risultati delle partite, rosa, storico delle valutazioni o ricette. Tuttavia i titoli e le note delle attività possono essere personali: condividere soltanto con Hninn.

Nella fattoria i dati sono **copie modificabili e non distruttive**: non si toccano gli originali in REGINA Calcio né si sovrascrivono le attività, gli animali, gli eventi, le finanze o i progressi di Farm & Table.

Le attività importate sono dapprima **informative** e non modificano i voti della fattoria. Hninn può scegliere **«＋ Nei miei obiettivi»** per aggiungere singole tappe ai propri obiettivi, con data e categoria a scelta: da quel momento la tappa acquisita partecipa alle regole del gioco di Hninn. I grandi obiettivi sono estendibili, modificabili nel titolo e nelle tappe (anche con aggiunta di nuove tappe), e hanno un avanzamento a spunte. La spesa importata ha una lista dedicata, con spunte, priorità, aggiunta, modifica ed eliminazione.

Non è una sincronizzazione in tempo reale tra dispositivi: per passare le novità, si esporta di nuovo da REGINA e si importa nella fattoria. Reimportando lo stesso file **non si creano doppioni**, e le spunte/modifiche locali di Hninn sono mantenute per gli elementi già presenti. Se un elemento viene eliminato in REGINA, **non viene cancellato automaticamente** dalla copia di Hninn.

## 1. Installazione su REGINA Calcio

Repository già utilizzato: `appiusclod-maker/Regina`, cartella `calcio`.

1. **Esporta prima il backup completo** della carriera da Impostazioni, conservandolo offline (non su GitHub pubblico).
2. Se non hai ancora installato la 1.1.20, carica **`calcio/regina-traguardi.js`** contenuto qui. È la versione cumulativa per grandi obiettivi, scadenze e colori. Se l'hai già installata, non occorre modificarlo.
3. Carica nella stessa cartella **`calcio/regina-hninn-export.js`** (nuovo file).
4. Sostituisci **`calcio/service-worker.js`** con quello qui incluso (versione 1.1.21).
5. In fondo a **`calcio/index.html`**, dopo `regina-upgrade.js` e `regina-traguardi.js`, aggiungi il nuovo script. Imposta la versione dei traguardi a `1120` se usi la copia cumulativa allegata:

```html
<script src="./regina-upgrade.js?v=1116"></script>
<script src="./regina-traguardi.js?v=1120"></script>
<script src="./regina-hninn-export.js?v=1121"></script>
```

Non sostituire l'intero `index.html` o `regina-upgrade.js`. Se sul tuo repository `regina-upgrade.js` ha già un parametro di versione più recente di `1116`, conservalo. Si deve solo aggiungere la nuova riga dopo quella dei traguardi.

Quando apri REGINA online compare nella barra il pulsante **📤 Hninn**. Puoi selezionare separatamente *Grandi obiettivi*, *Obiettivi e tappe* e *Lista spesa*, poi premere **Esporta per Hninn**. Otterrai un file `REGINA_PER_HNINN_aaaa-mm-gg.json`.

## 2. Installazione su Farm & Table / L'Agriturismo di Hninn

Non sostituire l'HTML attuale della fattoria con una versione vecchia. La modifica è un **modulo aggiuntivo**.

1. Conserva un backup JSON della fattoria dall'app, prima della modifica.
2. Nella **stessa cartella** del file HTML principale della fattoria, carica **`hninn/farm-regina-import.js`**, rinominandolo `farm-regina-import.js` se necessario (non creare una sottocartella se l'HTML non è lì).
3. Apri il file HTML principale dell'app della fattoria e, **dopo lo script originale e subito prima di `</body>`**, aggiungi:

```html
<script src="./farm-regina-import.js?v=1"></script>
```

Se l'HTML termina con `</script></body></html>`, diventerà `</script><script src="./farm-regina-import.js?v=1"></script></body></html>`.

4. Salva il file e apri la fattoria online almeno una volta per scaricare il modulo. Se esiste un service worker con cache che esclude i nuovi file, aggiungi `./farm-regina-import.js` ai file statici e cambia la versione della cache per garantire la disponibilità offline. **Non cancellare dati del sito o dell'app**: cancellerebbe i salvataggi locali.
5. Nel menu laterale oppure da **Oggi / Impostazioni** trovi **📬 Da REGINA**. In questa nuova sezione, seleziona il file JSON ricevuto e conferma.

## 3. Utilizzo da due telefoni diversi

1. Sul telefono di Claudio, apri REGINA Calcio → **📤 Hninn** → **Esporta per Hninn**.
2. Invia il file JSON a Hninn con Condividi, AirDrop, WhatsApp o un file trasferito manualmente. Non usare il backup completo della carriera.
3. Sul telefono di Hninn, apri Farm & Table → **📬 Da REGINA** → **Seleziona file** → conferma.
4. Hninn visualizza i grandi obiettivi (con tappe e avanzamento), gli obiettivi normali e la spesa condivisa. Le tappe possono essere inserite nel proprio **Oggi** scegliendo la data e la categoria. Gli elementi della spesa possono essere spuntati e riprioritizzati.
5. Per aggiornare gli elementi in seguito, ripeti i passaggi: vengono conservate le spunte di Hninn e non si duplicano gli elementi già ricevuti.

## Limiti e test

- Il modulo Farm & Table è sviluppato sulla **struttura del sorgente HTML v0.12** della fattoria recuperabile dal progetto, come **add-on**, senza sostituire versioni successive eventualmente installate. Non è stato possibile verificare il codice esatto della versione più recente nella memoria dell'iPhone di Hninn.
- Non esiste sincronizzazione continua, bidirezionale o multi-dispositivo senza un servizio di sincronizzazione. I cambiamenti fatti nella copia di Hninn non aggiornano REGINA Calcio automaticamente.
- La spesa ricevuta è presentata nella **sezione condivisa Da REGINA**, separatamente dall'eventuale lista spesa già presente in una versione più nuova della fattoria, per non sovrascriverla o provocare conflitti.
- Sono stati controllati i file JavaScript con `node --check` e testati in Chromium in un ambiente simulato: esportazione con selezione, importazione, priorità/spunte, nuova importazione senza doppioni, adozione di una tappa e conservazione di dati della fattoria. **Non è stato eseguito un test sul vero dispositivo di Hninn**.
- Il collegamento GitHub ha restituito `403` alle modifiche dirette del repository nelle precedenti prove: il pacchetto è da pubblicare manualmente.

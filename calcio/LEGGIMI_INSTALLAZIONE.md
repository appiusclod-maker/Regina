# REGINA CALCIO 0.8 — Rose europee (31 ottobre 2026)

## Cosa è stato completato
- **66/66 squadre straniere** di Champions League e Coppa UEFA/Europa League con **25 calciatori ciascuna**, totale **1.650 nomi**, di cui **47 nuove rose e 1.175 giocatori** rispetto alla 0.7.
- Ogni nominativo ha ruolo (P, D, C, A) e fonte collegata, generalmente la pagina UEFA 2026/27. Nel CSV trovi i 1.175 nuovi nomi, il JSON contiene tutti i 1.650.
- Dove la pagina della rosa europea conteneva meno di 25 nomi (AEK Atene, RB Lipsia, Celje), sono stati aggiunti i nominativi ulteriori da una fonte calcistica/UEFA nazionale, senza utilizzare segnaposto.
- Rose europee archiviate nel file dell'app: **i nomi non hanno bisogno di connessione Internet** per comparire nella Gazzetta e nei risultati simulati.
- Il codice di REGINA CALCIO 0.7 è stato mantenuto, con i salvataggi locali, i calendari, la PWA, le coppe e la città separata.

## Nota sull'accuratezza
Questi sono gruppi da 25 calciatori REALI tratti dalle rose registrate o pubblicate in stagione, **non dichiarazioni che i 25 siano esattamente gli iscritti nella Lista A UEFA**. In molti casi l'elenco è più lungo perché include anche la Lista B. Alcuni giocatori possono cambiare club nei mesi successivi: il database è una fotografia alla data indicata. La verifica individuale di tutti i tesseramenti o delle quotazioni Transfermarkt **non** è stata completata, e i punteggi tecnici esteri restano stime di gioco.

## Come installare su Android (PWA, non APK)
1. Conserva un backup REGINA Città e REGINA Calcio prima di qualsiasi sostituzione.
2. Nel repo GitHub `appiusclod-maker/Regina`, carica i sei file di `calcio/` nella **stessa cartella `calcio/`** dove avevi pubblicato la 0.7. Non toccare la radice `index.html` della città.
3. Apri **https://appiusclod-maker.github.io/Regina/calcio/** in Chrome su Android e aggiorna la pagina. Se hai già installato REGINA CALCIO sulla Home, continua a usare la stessa icona: grazie alla stessa identità PWA e alla nuova versione della cache dovrebbe aggiornarsi.
4. Se non hai ancora installato: menu Chrome ⋮ → **Aggiungi a schermata Home / Installa app**.
5. Dopo la prima connessione, i file principali e le rose sono disponibili anche offline. Gli stemmi richiedono la loro cache e potrebbero non essere tutti già memorizzati.

## Cosa non cambia
L'archivio REGINA Città è separato e non viene sovrascritto; l'app continua a usare lo stesso dominio per accedere ai dati. Le quote individuali Transfermarkt e il test su account Google Calendar non sono aggiornati in questa fase. Non è necessario ricreare la carriera per accedere ai nomi europei nella simulazione.

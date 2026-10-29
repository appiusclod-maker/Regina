# 👑 REGINA 6.6 — Tappe senza data organizzate

Questa versione aggiorna **REGINA 6.4** mantenendo lo stesso archivio locale degli obiettivi, delle ricompense, della città e dei voti.

## Novità REGINA 6.6: giorno / oggi

Nella pagina **Oggi**, immediatamente dopo **Il tuo prossimo passo**, la sezione **Tappe senza data fissa** contiene due selettori indipendenti:

- **Seleziona fronte:** tutte le tappe oppure un singolo fronte / obiettivo finale (con icona della categoria).
- **Seleziona tipo:** tutte, semplici, miste, progressive o a frequenza.

Le tappe sono organizzate per **fronte** e, al suo interno, per **tipo**, con conteggi visibili. I filtri vengono ricordati quando si riapre l'app, rimangono indipendenti dai filtri generali del calendario e non cambiano le attività né le loro scadenze. Da qui si possono sempre completare, valutare, modificare e pianificare le tappe.

## Installazione sulla schermata Home Android

Per avere una vera icona dell'app sul telefono, pubblica **tutti** i file di questo ZIP sullo stesso repository **GitHub Pages** su cui usi REGINA, apri l'indirizzo **https://...github.io/.../** in **Chrome su Android**, tocca il menu **⋮** e scegli **Aggiungi a schermata Home / Installa app**. Conferma. REGINA comparirà tra le app e sulla schermata Home. Il file HTML scaricato aperto da **content://downloads** non è equivalente a una PWA pubblicata, può non conservare stabilmente i dati e non può effettuare la connessione OAuth a Google Calendar. Prima dell'aggiornamento esegui **Impostazioni → Esporta JSON**; conserva il backup e non cambiare indirizzo del sito per non separare i vecchi dati.

## 🗞️ Una vera prima pagina al giorno

Nella sezione **La mia città** compare una sola pagina di giornale, con testata tipografica, data e articoli brevi. Ogni edizione contiene le notizie relative a **una sola giornata già conclusa** e viene resa disponibile quando quella giornata viene chiusa **allo scoccare della mezzanotte**. Prima della mezzanotte, anche se ci sono state costruzioni, non vengono mostrate anticipazioni o bozze. Se REGINA è chiusa, l'edizione viene prodotta **alla successiva apertura dell'app**, quando vengono finalizzati il voto e le attività scadute.

La redazione del giornale è completamente *all'oscuro* della vita reale del giocatore. Gli articoli possono raccontare **solo fatti accaduti nella città**: un negozio collocato, l'apertura di un edificio, nuovi collegamenti, danni, crolli, riparazioni e relative variazioni di posti di lavoro e residenti. **Non** citano nomi di attività o obiettivi, voti, premi, mancati impegni, cambi di programma né cancellazioni dei fronti. I premi ancora nel magazzino non sono edifici cittadini e quindi non generano notizie d'apertura.

Gli eventi dello stesso tipo riguardanti la stessa struttura vengono raggruppati nell'edizione, senza perdere la traccia dei cambiamenti urbani. Se non ci sono fatti da raccontare, la pagina indica esplicitamente che non ci sono cambiamenti rilevanti: non vengono inventati fatti.

Le **edizioni già pubblicate restano archiviate**, immutabili, e si consultano toccando il giorno desiderato nel **calendario sotto la pagina del giornale**. Il calendario consente di cambiare mese con ‹ e ›. Per tornare alla prima pagina più recente, basta riaprire «La mia città» dal menu.

## Compatibilità e avvertenze

- **Backup prima dell'aggiornamento:** in REGINA 6.4 usare Impostazioni → Esporta JSON.
- Sostituire **tutti** i file del repository GitHub Pages con i file dello ZIP, lasciando invariato l'indirizzo HTTPS.
- L'archivio è salvato nel browser/dispositivo. Il nuovo sistema di giornali mantiene le vecchie costruzioni e i vecchi voti, ma **non reinventa giornali dei giorni precedenti all'aggiornamento**, perché non sarebbe possibile farlo rispettando la regola di non citare gli impegni privati.
- L'edizione viene finalizzata in base all'orario locale. Non esistono attualmente un server o un sistema antifalsificazione dell'ora.
- Il collegamento automatico con Frontiere non è incluso in questa versione; Google Calendar rimane predisposto come nella versione precedente, da configurare tramite OAuth.
- Per l'uso regolare su Android usare GitHub Pages: aprire direttamente un file HTML con `content://downloads/` può interferire con i dati del browser e con Google Calendar.

## Contenuto dello ZIP

- `index.html` — applicazione completa
- `manifest.webmanifest`, `service-worker.js` — installazione e funzionamento come PWA
- `icon.svg`, `icon-192.png`, `icon-512.png` — icone
- `README.md` — questa guida

## Verifiche effettuate

Eseguiti test Chromium desktop e mobile, inclusi caricamento della città, presenza di una singola prima pagina, consultazione del calendario, assenza di riferimenti ad attività private, non pubblicazione prima della mezzanotte, emissione alla chiusura della giornata, blocco di edizioni già pubblicate e mancanza di scorrimento orizzontale mobile.

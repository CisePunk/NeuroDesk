/**
 * Lingua dell'interfaccia. Primo pezzo, volutamente minuscolo.
 *
 * Per ora la usa solo la pagina Feedback, che era il punto in cui l'italiano
 * bloccava davvero qualcuno: chiedere un parere in una lingua che non si parla
 * significa ricevere i clic sui pulsanti e mai il commento libero, che è la
 * parte che vale.
 *
 * Nessuna libreria: un dizionario e una funzione. Quando tradurremo tutta l'app
 * questo file cresce, non viene sostituito — e non ci sono dipendenze nuove da
 * aggiornare per una cosa che è, in fondo, un oggetto con dentro delle stringhe.
 *
 * La lingua viene dal browser. Non c'è ancora un selettore: aggiungerlo vorrà
 * dire salvare la scelta qui e leggerla al posto di navigator.language.
 */

export const LINGUE = ['it', 'en', 'fr'];

const CHIAVE_LINGUA = 'nd-lingua';

/**
 * Lingua da usare: prima la scelta esplicita dell'utente (il selettore), poi la
 * lingua del browser, infine italiano. Sempre ridotta a due lettere.
 *
 * L'ordine conta: senza la scelta salvata, chi ha il telefono in italiano non
 * potrebbe mai vedere l'inglese, e viceversa. La deduzione dal browser resta,
 * ma come ripiego, non come gabbia.
 */
export function linguaCorrente() {
    try {
        const scelta = localStorage.getItem(CHIAVE_LINGUA);
        if (scelta && LINGUE.includes(scelta)) return scelta;
        // "en-NZ" -> "en", "fr-CA" -> "fr": del tag ci serve solo la prima parte.
        const tag = (navigator.language || 'it').toLowerCase().slice(0, 2);
        return LINGUE.includes(tag) ? tag : 'it';
    } catch {
        // Ambienti senza navigator/storage (test, rendering lato server): italiano.
        return 'it';
    }
}

/** Salva la lingua scelta. La rilegge linguaCorrente() al primo render utile. */
export function impostaLingua(lang) {
    if (!LINGUE.includes(lang)) return;
    try { localStorage.setItem(CHIAVE_LINGUA, lang); } catch { /* storage negato: pazienza */ }
}

const DIZIONARIO = {
    it: {
        // ─── Menu, accesso, stati ────────────────────────────────────────────
        saltaAlContenuto: 'Salta al contenuto',
        taglineTester: 'il tuo companion',
        taglineScuola: 'gestione scuola',
        navCompanion: 'Companion',
        navFeedback: 'Feedback',
        navReportFeedback: 'Report feedback',
        temaScuro: 'Passa al tema scuro',
        temaChiaro: 'Passa al tema chiaro',
        esci: 'Esci',
        sorgente: 'Codice sorgente · AGPLv3',

        loginTagline: 'Entra con il tuo codice',
        loginCampoCodice: 'Codice di accesso',
        loginSegnaposto: 'es. neuro-xxxx-xxxx-xxxx-xxxx',
        loginCampoPassword: 'Password (solo per la scuola)',
        loginCodiceMancante: 'Inserisci il tuo codice di accesso.',
        loginEntra: 'Entra',
        loginInCorso: 'Accesso…',
        loginVaiScuola: 'Sei la scuola? Accedi con password',
        loginTornaTester: '← Entra come tester (solo codice)',
        loginComeEntrare: 'Come vuoi entrare?',
        loginRuoloTester: 'Tester',
        loginRuoloTesterNota: 'solo codice',
        loginRuoloAdmin: 'Amministratore',
        loginRuoloAdminNota: 'codice + password',
        installaApp: 'Installa l’app',
        installaIos: 'Vuoi NeuroDesk sul telefono? Tocca Condividi e poi “Aggiungi a Home”.',
        installaManuale: 'Per metterla sulla Home: apri il menu del browser (⋮) e tocca «Aggiungi a schermata Home». Se ce l’hai già, prima disinstallala per aggiornare l’icona.',

        statoCaricamento: 'Caricamento…',
        statoRiprova: 'Riprova',
        erroreTitolo: 'Qualcosa si è inceppato',
        erroreTesto: "Ricarica la pagina: ritrovi la conversazione dov'era. Quello che avevi scritto è salvato sul server, non l'hai perso.",
        erroreRicarica: 'Ricarica la pagina',
        erroreSottotitolo: 'Non è colpa tua, ed è un problema nostro.',
        erroreScriviciA: 'Se ti succede spesso, scrivici a',
        erroreScriviciB: ': dicci quale pulsante avevi toccato e con che telefono o computer.',

        // ─── Aiuto in linea ──────────────────────────────────────────────────
        aiutoApri: 'Apri l\'aiuto',
        aiutoTitolo: 'Aiuto',
        aiutoChiudi: 'Chiudi',
        aiutoIntro: 'Scegli la cosa che ti sta succedendo. Ogni risposta è un passo alla volta: fai il primo, poi passa al secondo.',
        aiutoGuida: 'Guida completa:',
        aiutoVoci: [
            { titolo: 'La pagina è diventata bianca', passi: [
                'Ricarica la pagina. Da computer premi F5. Da telefono trascina il dito verso il basso.',
                'Se torna bianca una seconda volta, svuota la cache: trovi come si fa qui sotto.',
                'Quello che avevi scritto non è perso: le conversazioni sono salvate sul server, non nel browser.' ] },
            { titolo: 'Non riesco a entrare col mio codice', passi: [
                'Controlla che ci siano tutti i trattini: il codice è fatto come neuro-xxxx-xxxx-xxxx-xxxx.',
                'Copialo e incollalo invece di riscriverlo: è lungo e un carattere sbagliato basta.',
                'Se hai sbagliato molte volte di fila, l\'accesso si blocca per un quarto d\'ora. Non è un guasto: aspetta e riprova.',
                'Se il codice non lo trovi più, chiedine uno nuovo: quello vecchio non è recuperabile da nessuno, nemmeno da noi.' ] },
            { titolo: 'Il Companion non risponde', passi: [
                'Aspetta una decina di secondi e riprova: a volte è solo lento.',
                'Se compare un messaggio che dice che il problema è dalla nostra parte, è vero ed è dalla nostra: non dipende da te né da quello che hai scritto.',
                'Se dice di non riprovare adesso, non riprovare: torna più tardi. Quello che hai scritto resta salvato.' ] },
            { titolo: 'Come svuoto la cache', passi: [
                'Chrome o Edge: premi Ctrl+Shift+R (su Mac Cmd+Shift+R). Ricarica saltando la cache.',
                'Safari su Mac: tieni premuto Shift e clicca il pulsante di ricarica.',
                'Su telefono: chiudi del tutto la scheda, poi riapri app.neurodesk.it.',
                'Se non basta: impostazioni del browser, cancella i dati di navigazione, solo «immagini e file memorizzati». Non serve cancellare le password.' ] },
            { titolo: 'Ho perso la conversazione', passi: [
                'Ricarica la pagina: la conversazione viene ripresa dal server.',
                'Se non torna, era una conversazione più vecchia di 30 giorni: le cancelliamo apposta, è la promessa che ti abbiamo fatto.' ] },
            { titolo: 'Voglio uscire, o non sono da solo al computer', passi: [
                'Premi «Esci». Da computer è in fondo alla barra a sinistra, da telefono è l\'ultima voce della barra in basso.',
                'L\'accesso resta valido 8 ore, poi ti richiede il codice da solo.',
                'Se il dispositivo è condiviso, esci ogni volta che ti alzi: qui dentro c\'è roba tua.' ] },
            { titolo: 'Voglio usare la mia chiave API (per sviluppatori)', passi: [
                'Serve solo se hai già un account Anthropic o OpenAI. Se non sai cos\'è una chiave API, salta pure: una risposta costa meno di mezzo centesimo e non stai pesando su nessuno.',
                'Vai su console.anthropic.com (o platform.openai.com), sezione API keys, e creane una nuova. Copiala subito: anche loro te la mostrano una volta sola.',
                'Qui dentro apri «Opzioni avanzate» sotto il riquadro dove scrivi, scegli il fornitore giusto e incolla la chiave. Da quel momento le tue conversazioni le paghi tu.',
                'Se ti dice che la chiave non è stata accettata: controlla di averla copiata tutta, che sia del fornitore che hai scelto nel menu, e che sul tuo account ci sia del credito residuo. Non usiamo il credito di NeuroDesk al tuo posto.',
                'Se dice «too long» o «troppo corta», hai copiato solo un pezzo: ricopiala per intero.',
                'Per tornare al credito comune, nello stesso pannello premi «Torna al credito comune». Ricordati di revocare la chiave anche dal tuo account, se non la usi altrove.',
            ] },
            { titolo: 'Che fine fanno le cose che scrivo', passi: [
                'Sono cifrate e vengono cancellate da sole dopo 30 giorni.',
                'Il tuo accesso è anonimo: non abbiamo il tuo nome né la tua email.',
                'Se vuoi che cancelliamo tutto subito, scrivicelo: lo facciamo.' ] },
        ],
        // ─── Consenso ────────────────────────────────────────────────────────
        // NOTA: questa e' un'informativa, non un'interfaccia. La versione
        // ITALIANA e' quella di riferimento: le traduzioni servono a far capire,
        // ma in caso di dubbio interpretativo vale l'italiano, ed e' dichiarato
        // in fondo alla schermata.
        consensoTitolo: 'Prima di iniziare',
        consensoP1: 'NeuroDesk Companion ti aiuta a trasformare un blocco nel prossimo piccolo passo. Per farlo, quello che scrivi qui viene inviato a un servizio di intelligenza artificiale che genera la risposta.',
        consensoP2a: 'I servizi che usiamo sono',
        consensoP2b: 'e',
        consensoP2c: 'Trattano i tuoi messaggi',
        consensoP2d: 'solo per conto nostro',
        consensoP2e: ', per generare la risposta: non li usano per addestrare i loro modelli e non li usano per scopi propri. I dati possono essere trattati anche fuori dall\'Unione Europea, con le garanzie previste dal GDPR.',
        consensoNome: 'Non registriamo il tuo nome',
        consensoNomeSeg: ': entri con un codice, non con i tuoi dati.',
        consensoDelicate: 'Quello che scrivi può contenere informazioni delicate (salute, difficoltà, soldi): scrivi solo ciò con cui ti senti a tuo agio.',
        consensoCifraA: 'Le tue conversazioni vengono',
        consensoCifraB: 'salvate in forma cifrata',
        consensoCifraC: 'così puoi riprenderle, e si',
        consensoCifraD: 'cancellano da sole dopo 30 giorni',
        consensoCifraE: '. Puoi cancellarle quando vuoi dalle opzioni del Companion.',
        consensoSmettiA: 'Puoi',
        consensoSmettiB: 'smettere quando vuoi',
        consensoSmettiC: ', revocare il consenso dalle opzioni del Companion e chiedere di cancellare il tuo accesso.',
        consensoDiagnosiA: 'NeuroDesk',
        consensoDiagnosiB: 'non fa diagnosi',
        consensoDiagnosiC: 'e non sostituisce medici, psicologi o servizi.',
        consensoSpuntaA: 'Ho letto e',
        consensoSpuntaB: 'acconsento',
        consensoSpuntaC: 'a usare NeuroDesk Companion in questa fase di test.',
        consensoAttendi: 'Un attimo…',
        consensoContinua: 'Continua',
        consensoEsci: 'Esci',
        consensoGrazie: 'Grazie. Buon lavoro con NeuroDesk.',
        consensoRiferimento: 'Versione di riferimento: italiano.',

        // ─── Errori: cosa e' successo, di chi e' il problema, cosa puoi fare ──
        errRete: 'Non riesco a collegarmi. Controlla la connessione e riprova fra un minuto.',
        errCredenziali: 'Codice o password non validi.',
        errPermesso: 'Questa parte non è disponibile con il tuo accesso.',
        errNonTrovato: 'Non trovo quello che cercavi. Forse è stato cancellato.',
        errConflitto: 'Esiste già qualcosa con questi dati.',
        errTroppi: 'Troppi tentativi ravvicinati. Aspetta un paio di minuti e riprova.',
        errDati: 'Qualche dato non va bene. Controlla i campi e riprova.',
        errNostro: 'Il problema è dalla nostra parte, non tuo. Riprova fra qualche minuto.',
        errGenerico: 'Qualcosa non ha funzionato. Riprova, e se continua scrivici.',
        errCompanion: 'Non riesco a raggiungere il Companion. Controlla la connessione e riprova fra un minuto.',

        // ─── Companion ───────────────────────────────────────────────────────
        compTitolo: 'Companion',
        compSottotitolo: 'Il tuo aiuto pratico, un passo piccolo quando tutto sembra troppo.',
        compComeSiUsaA: 'Come si usa:',
        compComeSiUsaB: 'scegli l\'area qui sotto, scrivi cosa ti blocca e premi il pulsante — ricevi',
        compComeSiUsaC: 'un solo piccolo passo',
        compComeSiUsaD: 'da fare.',
        compPasso1: '1 — In che area sei bloccato?',
        compPasso2: '2 — Cosa non riesci a fare adesso?',
        // "essere precisa" dava per scontato che chi scrive fosse una donna.
        // NeuroDesk lo usano anche uomini: la forma neutra non esclude nessuno.
        compSegnaposto: 'Scrivi pure come vuoi. Non serve essere precisi.',
        // "bloccata" dava per scontato che chi legge fosse una donna: forma neutra.
        compPasso1b: '1 — In che area sei in difficoltà?',
        compContinua: 'Continua',
        compFerma: 'Ferma',
        compScarica: 'Scarica la conversazione',
        compNuova: 'Nuova conversazione',
        compScrivi: 'Scrivi',
        compScriviAria: 'Torna al campo di scrittura',
        compAvanzate: 'Opzioni avanzate',
        compProfilo: 'Includi profilo funzionale minimale',
        compProfiloNota: ' — può consumare token in modalità AI reale',
        compCancellaCronologia: 'Cancella la mia cronologia',
        compRevoca: 'Revoca il consenso',
        // "Bring your own token", visto da chi la chiave ce l'ha.
        chiaveTitolo: 'La tua chiave API (facoltativa)',
        chiaveSpiega: 'Se hai un account Anthropic o OpenAI e preferisci che il consumo resti sul tuo, puoi metterla qui: da quel momento le tue conversazioni le paghi tu. Non serve a niente se non sai cos\'è una chiave API, e non è necessario — una risposta costa meno di mezzo centesimo.',
        chiaveNota: 'Viene cifrata e non è più visibile a nessuno, nemmeno a chi gestisce NeuroDesk. Se smette di funzionare te lo diciamo, e non usiamo il credito comune al tuo posto.',
        chiaveFornitore: 'Fornitore',
        chiaveCampo: 'Chiave API',
        chiaveSegnaposto: 'incolla qui la tua chiave',
        chiaveSalva: 'Salva la mia chiave',
        chiaveSalvataggio: 'Salvo…',
        chiaveAttiva: 'Stai usando la tua chiave: le tue risposte le paghi tu.',
        chiaveTogli: 'Torna al credito comune',
        chiaveSalvata: 'Fatto: da ora paghi tu le tue risposte.',
        chiaveTolta: 'Chiave rimossa: torni al credito comune.',
        compAvviso: 'Companion non sostituisce medico, terapeuta, tutor o consulente. Se stai male, parlane con una persona di cui ti fidi o con il tuo medico.',
        compPannello: 'Conversazione',
        compTu: 'Tu',
        compNessunaChiamata: 'nessuna chiamata AI',
        // Lingua della sintesi vocale: senza questa, una risposta in inglese
        // verrebbe letta con la pronuncia italiana.
        codiceVoce: 'it-IT',
        compInvia: 'Aiutami a fare il prossimo passo',
        compInvioInCorso: 'Sto preparando un passo concreto…',
        compVuoto: 'Serve almeno una parola per continuare.',
        compAscolta: 'Ascolta la risposta',
        compDescrivi: 'Descrivi il blocco nel form e invia.',
        compConversazione: 'NeuroDesk Companion — la tua conversazione',
        compMock: 'AI di prova (mock)',
        compRevocaChiedi: 'Vuoi revocare il consenso all\'uso dell\'AI? Potrai ridarlo quando vuoi.',
        compRevocato: 'Consenso revocato. Puoi ridarlo quando vuoi.',
        compCancellaChiedi: 'Vuoi cancellare tutta la tua cronologia salvata? L\'operazione non si può annullare.',
        compCancellata: 'Cronologia cancellata.',

        // Modalita': etichetta breve, sottotitolo, e cosa aspettarsi.
        modoBloccoL: 'Blocco',
        modoBloccoH: 'Quando tutto sembra troppo',
        modoBloccoD: 'Riceverai una sola micro-azione da 2 a 5 minuti. Niente liste, niente piani. Solo il passo più piccolo possibile da fare adesso.',
        modoStudioL: 'Studio',
        modoStudioH: 'Testi, esami, memoria',
        modoStudioD: 'Il materiale viene diviso in blocchi piccoli. Se serve, verranno create domande brevi per aiutarti a ricordare.',
        modoBurocraziaL: 'Burocrazia',
        modoBurocraziaH: 'Documenti e uffici',
        modoBurocraziaD: 'Viene creata una checklist o una bozza di messaggio. I dati vanno sempre verificati con l\'ente competente.',
        modoLavoroL: 'Lavoro',
        modoLavoroH: 'Annunci e candidature',
        modoLavoroD: 'Si parte dai tuoi vincoli reali: salute, energia, orari, stress. Nessuna scelta definitiva, solo il passo successivo.',
        modoAutonomieL: 'Autonomie',
        modoAutonomieH: 'Soldi, casa, routine',
        modoAutonomieD: 'Affrontiamo una sola area alla volta: soldi, casa, routine o scadenze. Nessuna panoramica complessa.',

        titolo: 'Feedback',
        caricamento: 'Caricamento…',
        intro: "Siamo in fase di test: dicci com'è andata. Bastano pochi tocchi, i commenti sono facoltativi.",
        grazieBreve: 'Grazie! Il tuo feedback è stato inviato.',
        grazieTitolo: 'Grazie di cuore.',
        grazieTesto: 'Il tuo parere ci aiuta a migliorare NeuroDesk.',
        altroFeedback: 'Lascia un altro feedback',
        etichettaErrori: 'Se hai avuto errori o blocchi, descrivili',
        segnapostoErrori: 'Es. cliccando su Salva non succedeva niente…',
        etichettaCommento: 'Altri commenti (facoltativo)',
        segnapostoCommento: 'Cosa ti è piaciuto, cosa cambieresti…',
        invia: 'Invia feedback',
        invioInCorso: 'Invio…',
    },
    en: {
        // ─── Menu, sign-in, states ───────────────────────────────────────────
        saltaAlContenuto: 'Skip to content',
        taglineTester: 'your companion',
        taglineScuola: 'school admin',
        navCompanion: 'Companion',
        navFeedback: 'Feedback',
        navReportFeedback: 'Feedback report',
        temaScuro: 'Switch to dark theme',
        temaChiaro: 'Switch to light theme',
        esci: 'Sign out',
        sorgente: 'Source code · AGPLv3',

        loginTagline: 'Sign in with your code',
        loginCampoCodice: 'Access code',
        loginSegnaposto: 'e.g. neuro-xxxx-xxxx-xxxx-xxxx',
        loginCampoPassword: 'Password (school only)',
        loginCodiceMancante: 'Enter your access code.',
        loginEntra: 'Sign in',
        loginInCorso: 'Signing in…',
        loginVaiScuola: 'Are you the school? Sign in with a password',
        loginTornaTester: '← Sign in as a tester (code only)',
        loginComeEntrare: 'How do you want to sign in?',
        loginRuoloTester: 'Tester',
        loginRuoloTesterNota: 'code only',
        loginRuoloAdmin: 'Administrator',
        loginRuoloAdminNota: 'code + password',
        installaApp: 'Install the app',
        installaIos: 'Want NeuroDesk on your phone? Tap Share, then “Add to Home Screen”.',
        installaManuale: 'To add it to your Home screen: open the browser menu (⋮) and tap “Add to Home screen”. If you already have it, uninstall it first to refresh the icon.',

        statoCaricamento: 'Loading…',
        statoRiprova: 'Try again',
        erroreTitolo: 'Something jammed',
        erroreTesto: 'Reload the page: you will find the conversation where you left it. What you wrote is saved on the server, you have not lost it.',
        erroreRicarica: 'Reload the page',
        erroreSottotitolo: 'This is not your fault, and it is our problem.',
        erroreScriviciA: 'If this keeps happening, write to us at',
        erroreScriviciB: ': tell us which button you had pressed, and on what phone or computer.',

        // ─── In-app help ─────────────────────────────────────────────────────
        aiutoApri: 'Open help',
        aiutoTitolo: 'Help',
        aiutoChiudi: 'Close',
        aiutoIntro: 'Pick the thing that is happening to you. Each answer is one step at a time: do the first, then move to the second.',
        aiutoGuida: 'Full guide:',
        aiutoVoci: [
            { titolo: 'The page went blank', passi: [
                'Reload the page. On a computer press F5. On a phone pull down with your finger.',
                'If it goes blank a second time, clear the cache: you will find how just below.',
                'What you wrote is not lost: conversations are saved on the server, not in the browser.' ] },
            { titolo: 'My code will not let me in', passi: [
                'Check that all the dashes are there: the code looks like neuro-xxxx-xxxx-xxxx-xxxx.',
                'Copy and paste it instead of typing it: it is long, and one wrong character is enough.',
                'If you have got it wrong many times in a row, sign-in locks for fifteen minutes. Nothing is broken: wait and try again.',
                'If you cannot find your code any more, ask for a new one: the old one cannot be recovered by anyone, not even by us.' ] },
            { titolo: 'The Companion is not answering', passi: [
                'Wait ten seconds or so and try again: sometimes it is just slow.',
                'If a message says the problem is on our side, it is true and it is on our side: it does not depend on you or on what you wrote.',
                'If it says not to try again now, do not: come back later. What you wrote stays saved.' ] },
            { titolo: 'How do I clear the cache', passi: [
                'Chrome or Edge: press Ctrl+Shift+R (Cmd+Shift+R on a Mac). It reloads skipping the cache.',
                'Safari on a Mac: hold Shift and click the reload button.',
                'On a phone: close the tab completely, then open app.neurodesk.it again.',
                'If that is not enough: browser settings, clear browsing data, only "cached images and files". You do not need to clear your passwords.' ] },
            { titolo: 'I lost my conversation', passi: [
                'Reload the page: the conversation is fetched back from the server.',
                'If it does not come back, it was older than 30 days: we delete those on purpose — it is the promise we made you.' ] },
            { titolo: 'I want to sign out, or I am not alone at this computer', passi: [
                'Press "Sign out". On a computer it is at the bottom of the left bar; on a phone it is the last item in the bottom bar.',
                'Your session stays valid for 8 hours, then it asks for the code again by itself.',
                'If the device is shared, sign out every time you get up: what is in here is yours.' ] },
            { titolo: 'I want to use my own API key (for developers)', passi: [
                'This is only useful if you already have an Anthropic or OpenAI account. If you do not know what an API key is, skip this: one answer costs less than half a cent and you are not weighing on anyone.',
                'Go to console.anthropic.com (or platform.openai.com), the API keys section, and create a new one. Copy it straight away: they also show it only once.',
                'In here, open "Advanced options" under the box where you write, pick the right provider and paste the key. From then on you pay for your own conversations.',
                'If it says the key was not accepted: check you copied all of it, that it belongs to the provider you picked in the menu, and that your account still has credit. We do not use NeuroDesk\'s credit in your place.',
                'If it says it is too short, you only copied part of it: copy the whole thing again.',
                'To go back to the shared credit, press "Go back to the shared credit" in the same panel. Remember to revoke the key on your own account too, if you do not use it elsewhere.',
            ] },
            { titolo: 'What happens to the things I write', passi: [
                'They are encrypted and they delete themselves after 30 days.',
                'Your access is anonymous: we do not have your name or your email.',
                'If you want us to delete everything right away, tell us: we will.' ] },
        ],
        // ─── Consent ─────────────────────────────────────────────────────────
        // This is a privacy notice, not interface copy. The ITALIAN version is
        // the reference one: the translation is here so you can understand what
        // you are agreeing to, but in case of interpretive doubt the Italian
        // text prevails — and the screen says so.
        consensoTitolo: 'Before you start',
        consensoP1: 'NeuroDesk Companion helps you turn feeling stuck into one small next step. To do that, what you write here is sent to an artificial intelligence service that produces the answer.',
        consensoP2a: 'The services we use are',
        consensoP2b: 'and',
        consensoP2c: 'They handle your messages',
        consensoP2d: 'only on our behalf',
        consensoP2e: ', to produce the answer: they do not use them to train their models and they do not use them for their own purposes. Data may also be processed outside the European Union, under the safeguards required by the GDPR.',
        consensoNome: 'We do not record your name',
        consensoNomeSeg: ': you sign in with a code, not with your details.',
        consensoDelicate: 'What you write may contain sensitive information (health, difficulties, money): only write what you are comfortable writing.',
        consensoCifraA: 'Your conversations are',
        consensoCifraB: 'saved in encrypted form',
        consensoCifraC: 'so you can pick them up again, and they',
        consensoCifraD: 'delete themselves after 30 days',
        consensoCifraE: '. You can delete them whenever you want from the Companion options.',
        consensoSmettiA: 'You can',
        consensoSmettiB: 'stop whenever you want',
        consensoSmettiC: ', withdraw your consent from the Companion options, and ask us to delete your access.',
        consensoDiagnosiA: 'NeuroDesk',
        consensoDiagnosiB: 'does not diagnose anything',
        consensoDiagnosiC: 'and does not replace doctors, psychologists or services.',
        consensoSpuntaA: 'I have read this and I',
        consensoSpuntaB: 'agree',
        consensoSpuntaC: 'to use NeuroDesk Companion during this testing phase.',
        consensoAttendi: 'One moment…',
        consensoContinua: 'Continue',
        consensoEsci: 'Sign out',
        consensoGrazie: 'Thank you. Enjoy NeuroDesk.',
        consensoRiferimento: 'Reference version: Italian.',

        // ─── Errors: what happened, whose problem it is, what you can do now ──
        errRete: 'I cannot connect. Check your connection and try again in a minute.',
        errCredenziali: 'That code or password is not valid.',
        errPermesso: 'This part is not available with your access.',
        errNonTrovato: 'I cannot find what you were looking for. It may have been deleted.',
        errConflitto: 'Something with these details already exists.',
        errTroppi: 'Too many attempts too close together. Wait a couple of minutes and try again.',
        errDati: 'Something in there is not right. Check the fields and try again.',
        errNostro: 'The problem is on our side, not yours. Try again in a few minutes.',
        errGenerico: 'Something did not work. Try again, and if it keeps happening write to us.',
        errCompanion: 'I cannot reach the Companion. Check your connection and try again in a minute.',

        // ─── Companion ───────────────────────────────────────────────────────
        compTitolo: 'Companion',
        compSottotitolo: 'Practical help: one small step when everything feels like too much.',
        compComeSiUsaA: 'How it works:',
        compComeSiUsaB: 'pick an area below, write what you are stuck on, and press the button — you get',
        compComeSiUsaC: 'one small step',
        compComeSiUsaD: 'to take.',
        compPasso1: '1 — Which area are you stuck in?',
        compPasso2: '2 — What can you not do right now?',
        compSegnaposto: 'Write however you like. It does not have to be precise.',
        compPasso1b: '1 — Which area are you struggling with?',
        compContinua: 'Continue',
        compFerma: 'Stop',
        compScarica: 'Download the conversation',
        compNuova: 'New conversation',
        compScrivi: 'Write',
        compScriviAria: 'Back to the text field',
        compAvanzate: 'Advanced options',
        compProfilo: 'Include a minimal functional profile',
        compProfiloNota: ' — this can use more tokens with the real AI',
        compCancellaCronologia: 'Delete my history',
        compRevoca: 'Withdraw consent',
        chiaveTitolo: 'Your own API key (optional)',
        chiaveSpiega: 'If you have an Anthropic or OpenAI account and would rather the usage sat on yours, you can put it here: from then on you pay for your own conversations. This is no use to you if you do not know what an API key is, and it is not needed — one answer costs less than half a cent.',
        chiaveNota: 'It is encrypted and is not visible to anyone afterwards, not even to whoever runs NeuroDesk. If it stops working we tell you, and we do not use the shared credit in your place.',
        chiaveFornitore: 'Provider',
        chiaveCampo: 'API key',
        chiaveSegnaposto: 'paste your key here',
        chiaveSalva: 'Save my key',
        chiaveSalvataggio: 'Saving…',
        chiaveAttiva: 'You are using your own key: you pay for your answers.',
        chiaveTogli: 'Go back to the shared credit',
        chiaveSalvata: 'Done: from now on you pay for your own answers.',
        chiaveTolta: 'Key removed: you are back on the shared credit.',
        compAvviso: 'The Companion does not replace a doctor, therapist, tutor or counsellor. If you are unwell, talk to someone you trust or to your doctor.',
        compPannello: 'Conversation',
        compTu: 'You',
        compNessunaChiamata: 'no AI call yet',
        codiceVoce: 'en-GB',
        compInvia: 'Help me take the next step',
        compInvioInCorso: 'Working out one concrete step…',
        compVuoto: 'Write at least one word to continue.',
        compAscolta: 'Listen to the answer',
        compDescrivi: 'Describe what you are stuck on and send it.',
        compConversazione: 'NeuroDesk Companion — your conversation',
        compMock: 'test AI (mock)',
        compRevocaChiedi: 'Do you want to withdraw your consent to using the AI? You can give it again whenever you want.',
        compRevocato: 'Consent withdrawn. You can give it again whenever you want.',
        compCancellaChiedi: 'Delete your whole saved history? This cannot be undone.',
        compCancellata: 'History deleted.',

        modoBloccoL: 'Stuck',
        modoBloccoH: 'When everything feels like too much',
        modoBloccoD: 'You will get one single micro-action, 2 to 5 minutes. No lists, no plans. Just the smallest possible step you can take right now.',
        modoStudioL: 'Study',
        modoStudioH: 'Texts, exams, memory',
        modoStudioD: 'The material gets broken into small blocks. If it helps, short questions are made so you can remember it.',
        modoBurocraziaL: 'Paperwork',
        modoBurocraziaH: 'Documents and offices',
        modoBurocraziaD: 'You get a checklist or a draft message. Always check the details with the office responsible.',
        modoLavoroL: 'Work',
        modoLavoroH: 'Job ads and applications',
        modoLavoroD: 'We start from your real constraints: health, energy, hours, stress. No final decisions, only the next step.',
        modoAutonomieL: 'Daily life',
        modoAutonomieH: 'Money, home, routine',
        modoAutonomieD: 'One area at a time: money, home, routine or deadlines. No complicated overviews.',

        titolo: 'Feedback',
        caricamento: 'Loading…',
        intro: 'We are still testing: tell us how it went. A few taps are enough — the comments are optional.',
        grazieBreve: 'Thank you! Your feedback has been sent.',
        grazieTitolo: 'Thank you, truly.',
        grazieTesto: 'What you tell us is how NeuroDesk gets better.',
        altroFeedback: 'Leave more feedback',
        etichettaErrori: 'If something broke or got stuck, tell us what happened',
        segnapostoErrori: 'e.g. I pressed Save and nothing happened…',
        etichettaCommento: 'Anything else (optional)',
        segnapostoCommento: 'What you liked, what you would change…',
        invia: 'Send feedback',
        invioInCorso: 'Sending…',
    },
    fr: {
        // ─── Menu, connexion, états ──────────────────────────────────────────
        saltaAlContenuto: 'Aller au contenu',
        taglineTester: 'ton companion',
        taglineScuola: "gestion de l'école",
        navCompanion: 'Companion',
        navFeedback: 'Retour',
        navReportFeedback: 'Rapport des retours',
        temaScuro: 'Passer au thème sombre',
        temaChiaro: 'Passer au thème clair',
        esci: 'Se déconnecter',
        sorgente: 'Code source · AGPLv3',

        loginTagline: 'Entre avec ton code',
        loginCampoCodice: "Code d'accès",
        loginSegnaposto: 'ex. neuro-xxxx-xxxx-xxxx-xxxx',
        loginCampoPassword: "Mot de passe (école uniquement)",
        loginCodiceMancante: "Saisis ton code d'accès.",
        loginEntra: 'Entrer',
        loginInCorso: 'Connexion…',
        loginVaiScuola: "Tu es l'école ? Connecte-toi avec un mot de passe",
        loginTornaTester: '← Entrer comme testeur (code seulement)',
        loginComeEntrare: 'Comment veux-tu entrer ?',
        loginRuoloTester: 'Testeur',
        loginRuoloTesterNota: 'code seul',
        loginRuoloAdmin: 'Administrateur',
        loginRuoloAdminNota: 'code + mot de passe',
        installaApp: "Installer l'appli",
        installaIos: 'NeuroDesk sur ton téléphone ? Appuie sur Partager, puis « Sur l’écran d’accueil ».',
        installaManuale: 'Pour l’ajouter à l’écran d’accueil : ouvre le menu du navigateur (⋮) et touche « Ajouter à l’écran d’accueil ». Si tu l’as déjà, désinstalle-la d’abord pour rafraîchir l’icône.',

        statoCaricamento: 'Chargement…',
        statoRiprova: 'Réessayer',
        erroreTitolo: "Quelque chose s'est enrayé",
        erroreTesto: "Recharge la page : tu retrouveras la conversation là où elle était. Ce que tu avais écrit est enregistré sur le serveur, tu ne l'as pas perdu.",
        erroreRicarica: 'Recharger la page',
        erroreSottotitolo: "Ce n'est pas de ta faute, et c'est notre problème.",
        erroreScriviciA: 'Si cela arrive souvent, écris-nous à',
        erroreScriviciB: " : dis-nous sur quel bouton tu avais appuyé, et avec quel téléphone ou ordinateur.",

        // ─── Aide intégrée ───────────────────────────────────────────────────
        aiutoApri: "Ouvrir l'aide",
        aiutoTitolo: 'Aide',
        aiutoChiudi: 'Fermer',
        aiutoIntro: 'Choisis ce qui est en train de t\'arriver. Chaque réponse va un pas à la fois : fais le premier, puis passe au second.',
        aiutoGuida: 'Guide complet :',
        aiutoVoci: [
            { titolo: 'La page est devenue blanche', passi: [
                'Recharge la page. Sur ordinateur appuie sur F5. Sur téléphone, tire vers le bas avec le doigt.',
                'Si elle redevient blanche une deuxième fois, vide le cache : tu trouves comment faire juste en dessous.',
                'Ce que tu avais écrit n\'est pas perdu : les conversations sont enregistrées sur le serveur, pas dans le navigateur.' ] },
            { titolo: "Mon code ne me laisse pas entrer", passi: [
                'Vérifie que tous les tirets sont là : le code ressemble à neuro-xxxx-xxxx-xxxx-xxxx.',
                'Copie-colle-le au lieu de le retaper : il est long, et un seul caractère faux suffit.',
                "Si tu t'es trompé plusieurs fois de suite, la connexion se bloque un quart d'heure. Rien n'est cassé : attends et réessaie.",
                'Si tu ne retrouves plus ton code, demandes-en un nouveau : l\'ancien n\'est récupérable par personne, pas même par nous.' ] },
            { titolo: 'Le Companion ne répond pas', passi: [
                "Attends une dizaine de secondes et réessaie : parfois il est juste lent.",
                "Si un message dit que le problème vient de chez nous, c'est vrai et c'est de chez nous : cela ne dépend ni de toi ni de ce que tu as écrit.",
                "S'il dit de ne pas réessayer maintenant, ne réessaie pas : reviens plus tard. Ce que tu as écrit reste enregistré." ] },
            { titolo: 'Comment vider le cache', passi: [
                'Chrome ou Edge : appuie sur Ctrl+Maj+R (Cmd+Maj+R sur Mac). La page se recharge en ignorant le cache.',
                'Safari sur Mac : maintiens Maj et clique sur le bouton de rechargement.',
                'Sur téléphone : ferme complètement l\'onglet, puis rouvre app.neurodesk.it.',
                'Si cela ne suffit pas : réglages du navigateur, effacer les données de navigation, uniquement « images et fichiers en cache ». Pas besoin d\'effacer les mots de passe.' ] },
            { titolo: 'J\'ai perdu ma conversation', passi: [
                'Recharge la page : la conversation est récupérée depuis le serveur.',
                "Si elle ne revient pas, c'est qu'elle avait plus de 30 jours : nous les effaçons exprès — c'est la promesse qu'on t'a faite." ] },
            { titolo: 'Je veux me déconnecter, ou je ne suis pas seul devant cet ordinateur', passi: [
                'Appuie sur « Se déconnecter ». Sur ordinateur c\'est en bas de la barre de gauche ; sur téléphone c\'est la dernière entrée de la barre du bas.',
                "Ta session reste valable 8 heures, puis elle redemande le code toute seule.",
                "Si l'appareil est partagé, déconnecte-toi chaque fois que tu te lèves : ce qu'il y a ici est à toi." ] },
            { titolo: 'Je veux utiliser ma propre clé API (pour développeurs)', passi: [
                "Cela ne sert que si tu as déjà un compte Anthropic ou OpenAI. Si tu ne sais pas ce qu'est une clé API, passe : une réponse coûte moins d'un demi-centime et tu ne pèses sur personne.",
                'Va sur console.anthropic.com (ou platform.openai.com), section API keys, et crées-en une nouvelle. Copie-la tout de suite : eux aussi ne te la montrent qu\'une fois.',
                'Ici, ouvre « Options avancées » sous la zone où tu écris, choisis le bon fournisseur et colle la clé. À partir de là, tu paies tes propres conversations.',
                "Si le message dit que la clé n'a pas été acceptée : vérifie que tu l'as copiée en entier, qu'elle appartient bien au fournisseur choisi dans le menu, et qu'il reste du crédit sur ton compte. Nous n'utilisons pas le crédit de NeuroDesk à ta place.",
                "S'il dit qu'elle est trop courte, tu n'en as copié qu'une partie : recopie-la entièrement.",
                'Pour revenir au crédit commun, appuie sur « Revenir au crédit commun » dans le même panneau. Pense aussi à révoquer la clé depuis ton compte, si tu ne l\'utilises pas ailleurs.',
            ] },
            { titolo: "Que deviennent les choses que j'écris", passi: [
                "Elles sont chiffrées et s'effacent d'elles-mêmes après 30 jours.",
                "Ton accès est anonyme : nous n'avons ni ton nom ni ton adresse e-mail.",
                'Si tu veux qu\'on efface tout tout de suite, dis-le-nous : on le fait.' ] },
        ],
        // ─── Consentement ────────────────────────────────────────────────────
        // Ceci est une notice d'information, pas du texte d'interface. La version
        // ITALIENNE fait foi : la traduction est là pour que tu comprennes ce que
        // tu acceptes, mais en cas de doute d'interprétation c'est l'italien qui
        // prévaut — et l'écran le dit.
        consensoTitolo: 'Avant de commencer',
        consensoP1: "NeuroDesk Companion t'aide à transformer un blocage en un petit pas suivant. Pour cela, ce que tu écris ici est envoyé à un service d'intelligence artificielle qui produit la réponse.",
        consensoP2a: 'Les services que nous utilisons sont',
        consensoP2b: 'et',
        consensoP2c: 'Ils traitent tes messages',
        consensoP2d: 'uniquement pour notre compte',
        consensoP2e: ", afin de produire la réponse : ils ne les utilisent pas pour entraîner leurs modèles ni à leurs propres fins. Les données peuvent aussi être traitées hors de l'Union européenne, avec les garanties prévues par le RGPD.",
        consensoNome: 'Nous n\'enregistrons pas ton nom',
        consensoNomeSeg: ' : tu entres avec un code, pas avec tes données.',
        consensoDelicate: "Ce que tu écris peut contenir des informations sensibles (santé, difficultés, argent) : n'écris que ce avec quoi tu es à l'aise.",
        consensoCifraA: 'Tes conversations sont',
        consensoCifraB: 'enregistrées sous forme chiffrée',
        consensoCifraC: 'pour que tu puisses les reprendre, et elles',
        consensoCifraD: "s'effacent d'elles-mêmes après 30 jours",
        consensoCifraE: '. Tu peux les supprimer quand tu veux depuis les options du Companion.',
        consensoSmettiA: 'Tu peux',
        consensoSmettiB: 'arrêter quand tu veux',
        consensoSmettiC: ', retirer ton consentement depuis les options du Companion et demander la suppression de ton accès.',
        consensoDiagnosiA: 'NeuroDesk',
        consensoDiagnosiB: 'ne pose aucun diagnostic',
        consensoDiagnosiC: 'et ne remplace ni médecins, ni psychologues, ni services.',
        // L'elisione va tenuta INTERA dentro il grassetto: spezzando dopo "j'"
        // il JSX ci infila uno spazio e viene fuori "j' accepte", che in
        // francese e' un errore visibile a chiunque legga quella lingua.
        consensoSpuntaA: "J'ai lu et",
        consensoSpuntaB: "j'accepte",
        consensoSpuntaC: "d'utiliser NeuroDesk Companion pendant cette phase de test.",
        consensoAttendi: 'Un instant…',
        consensoContinua: 'Continuer',
        consensoEsci: 'Se déconnecter',
        consensoGrazie: 'Merci. Bon travail avec NeuroDesk.',
        consensoRiferimento: 'Version de référence : italien.',

        // ─── Erreurs ─────────────────────────────────────────────────────────
        errRete: "Je n'arrive pas à me connecter. Vérifie ta connexion et réessaie dans une minute.",
        errCredenziali: 'Code ou mot de passe non valides.',
        errPermesso: "Cette partie n'est pas disponible avec ton accès.",
        errNonTrovato: 'Je ne trouve pas ce que tu cherchais. Cela a peut-être été supprimé.',
        errConflitto: 'Quelque chose existe déjà avec ces données.',
        errTroppi: 'Trop de tentatives rapprochées. Attends deux minutes et réessaie.',
        errDati: 'Quelque chose ne va pas. Vérifie les champs et réessaie.',
        errNostro: "Le problème vient de chez nous, pas de toi. Réessaie dans quelques minutes.",
        errGenerico: "Quelque chose n'a pas fonctionné. Réessaie, et si cela continue écris-nous.",
        errCompanion: "Je n'arrive pas à joindre le Companion. Vérifie ta connexion et réessaie dans une minute.",

        // ─── Companion ───────────────────────────────────────────────────────
        compTitolo: 'Companion',
        compSottotitolo: "Une aide concrète : un petit pas quand tout paraît trop.",
        compComeSiUsaA: 'Comment ça marche :',
        compComeSiUsaB: 'choisis un domaine ci-dessous, écris ce qui te bloque et appuie sur le bouton — tu reçois',
        compComeSiUsaC: 'un seul petit pas',
        compComeSiUsaD: 'à faire.',
        compPasso1: '1 — Dans quel domaine es-tu bloqué ?',
        compPasso2: '2 — Que n\'arrives-tu pas à faire maintenant ?',
        compSegnaposto: "Écris comme tu veux. Pas besoin d'être précis.",
        compPasso1b: '1 — Dans quel domaine es-tu en difficulté ?',
        compContinua: 'Continuer',
        compFerma: 'Arrêter',
        compScarica: 'Télécharger la conversation',
        compNuova: 'Nouvelle conversation',
        compScrivi: 'Écrire',
        compScriviAria: 'Revenir au champ de saisie',
        compAvanzate: 'Options avancées',
        compProfilo: 'Inclure un profil fonctionnel minimal',
        compProfiloNota: " — cela peut consommer plus de jetons avec l'IA réelle",
        compCancellaCronologia: 'Effacer mon historique',
        compRevoca: 'Retirer le consentement',
        chiaveTitolo: 'Ta propre clé API (facultatif)',
        chiaveSpiega: "Si tu as un compte Anthropic ou OpenAI et que tu préfères que la consommation reste sur le tien, tu peux la mettre ici : à partir de là, tu paies tes propres conversations. Cela ne te sert à rien si tu ne sais pas ce qu'est une clé API, et ce n'est pas nécessaire — une réponse coûte moins d'un demi-centime.",
        chiaveNota: "Elle est chiffrée et n'est ensuite visible par personne, pas même par celle qui gère NeuroDesk. Si elle cesse de fonctionner nous te le disons, et nous n'utilisons pas le crédit commun à ta place.",
        chiaveFornitore: 'Fournisseur',
        chiaveCampo: 'Clé API',
        chiaveSegnaposto: 'colle ta clé ici',
        chiaveSalva: 'Enregistrer ma clé',
        chiaveSalvataggio: 'Enregistrement…',
        chiaveAttiva: 'Tu utilises ta propre clé : tu paies tes réponses.',
        chiaveTogli: 'Revenir au crédit commun',
        chiaveSalvata: "C'est fait : désormais tu paies tes propres réponses.",
        chiaveTolta: 'Clé retirée : tu reviens au crédit commun.',
        compAvviso: "Le Companion ne remplace ni médecin, ni thérapeute, ni tuteur, ni conseiller. Si tu ne vas pas bien, parles-en à une personne de confiance ou à ton médecin.",
        compPannello: 'Conversation',
        compTu: 'Toi',
        compNessunaChiamata: "aucun appel à l'IA",
        codiceVoce: 'fr-FR',
        compInvia: 'Aide-moi à faire le pas suivant',
        compInvioInCorso: 'Je prépare un pas concret…',
        compVuoto: 'Il faut au moins un mot pour continuer.',
        compAscolta: 'Écouter la réponse',
        compDescrivi: 'Décris ce qui te bloque et envoie.',
        compConversazione: 'NeuroDesk Companion — ta conversation',
        compMock: "IA d'essai (mock)",
        compRevocaChiedi: "Veux-tu retirer ton consentement à l'usage de l'IA ? Tu pourras le redonner quand tu veux.",
        compRevocato: 'Consentement retiré. Tu peux le redonner quand tu veux.',
        compCancellaChiedi: "Supprimer tout ton historique enregistré ? L'opération est irréversible.",
        compCancellata: 'Historique supprimé.',

        modoBloccoL: 'Blocage',
        modoBloccoH: 'Quand tout paraît trop',
        modoBloccoD: 'Tu recevras une seule micro-action de 2 à 5 minutes. Pas de listes, pas de plans. Juste le plus petit pas possible, maintenant.',
        modoStudioL: 'Études',
        modoStudioH: 'Textes, examens, mémoire',
        modoStudioD: 'Le matériel est découpé en petits blocs. Si besoin, de courtes questions sont créées pour t\'aider à retenir.',
        modoBurocraziaL: 'Démarches',
        modoBurocraziaH: 'Documents et administrations',
        modoBurocraziaD: "Tu reçois une liste de contrôle ou un brouillon de message. Les informations sont toujours à vérifier auprès de l'organisme compétent.",
        modoLavoroL: 'Travail',
        modoLavoroH: 'Annonces et candidatures',
        modoLavoroD: 'On part de tes contraintes réelles : santé, énergie, horaires, stress. Aucun choix définitif, seulement le pas suivant.',
        modoAutonomieL: 'Autonomie',
        modoAutonomieH: 'Argent, maison, routine',
        modoAutonomieD: 'Un seul domaine à la fois : argent, maison, routine ou échéances. Pas de vue d\'ensemble compliquée.',

        titolo: 'Retour',
        caricamento: 'Chargement…',
        intro: "Nous sommes en phase de test : dis-nous comment ça s'est passé. Quelques touches suffisent, les commentaires sont facultatifs.",
        grazieBreve: 'Merci ! Ton retour a bien été envoyé.',
        grazieTitolo: 'Merci beaucoup.',
        grazieTesto: "Ce que tu nous dis, c'est ce qui fait avancer NeuroDesk.",
        altroFeedback: 'Laisser un autre retour',
        etichettaErrori: "Si quelque chose s'est bloqué, raconte-nous",
        segnapostoErrori: "ex. j'ai appuyé sur Enregistrer et rien ne s'est passé…",
        etichettaCommento: 'Autre chose (facultatif)',
        segnapostoCommento: 'Ce qui t\'a plu, ce que tu changerais…',
        invia: 'Envoyer',
        invioInCorso: 'Envoi…',
    },
};

/** Le stringhe dell'app nella lingua data (o in quella del browser). */
export function testi(lingua = linguaCorrente()) {
    return DIZIONARIO[lingua] ?? DIZIONARIO.it;
}

// Nome storico, da quando il dizionario serviva solo alla pagina Feedback.
// Resta perche' e' gia' usato, e non vale la pena toccare un file che funziona
// per un rinominamento.
export const testiFeedback = testi;

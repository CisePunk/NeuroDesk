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

/** Lingua del browser ridotta a due lettere; qualunque altra cosa diventa italiano. */
export function linguaCorrente() {
    try {
        // "en-NZ" -> "en", "fr-CA" -> "fr": del tag ci serve solo la prima parte.
        const tag = (navigator.language || 'it').toLowerCase().slice(0, 2);
        return LINGUE.includes(tag) ? tag : 'it';
    } catch {
        // Ambienti senza navigator (test, rendering lato server): italiano.
        return 'it';
    }
}

const DIZIONARIO = {
    it: {
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
